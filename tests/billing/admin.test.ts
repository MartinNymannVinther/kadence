import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import {
  billingOverview,
  recentPayments,
  registerPayment,
  setPlanFree,
} from "@/core/admin/billing";
import { adminPool, appClient, asApp, asAppCommit, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Installation → Betaling (docs/adr/0090): only the installation's owner
 * sees what every workspace pays, registers a payment, makes a workspace
 * free or sets a price — refused by the service and again by the
 * database. A payment moves the workspace to paid through the last day of
 * its period; a demo is never paid for or priced.
 */

const OWNER = "user_billadm_owner";
const CLUB = { orgId: "org_billadm_club", userId: "user_billadm_coach" };
const PERSON = { orgId: "org_billadm_person", userId: "user_billadm_person" };
const DEMO = { orgId: "org_billadm_demo", userId: "user_billadm_demo" };

let admin: Pool;
let app: Client;

const planOf = async (orgId: string) =>
  (
    await admin.query(
      `select plan, to_char(paid_until at time zone 'Europe/Copenhagen', 'YYYY-MM-DD HH24:MI') as paid_until,
              free_reason, free_until from organizations where id = $1`,
      [orgId],
    )
  ).rows[0];

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await admin.query(
    `insert into users (id, name, email, platform_role) values ($1, 'Ejer', 'billadm-owner@example.com', 'owner') on conflict do nothing`,
    [OWNER],
  );
  await seedPerson(admin, CLUB.orgId, CLUB.userId, "owner", "Betalende CK");
  await seedPerson(admin, PERSON.orgId, PERSON.userId, "owner", "Annas træning");
  await admin.query("update organizations set kind = 'personal' where id = $1", [PERSON.orgId]);
  await seedPerson(admin, DEMO.orgId, DEMO.userId, "owner", "Demo CK");
  const demo = insertSql("demo_workspaces", {
    organization_id: DEMO.orgId,
    user_id: DEMO.userId,
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
  });
  await admin.query(demo.text, demo.values);
  for (let i = 0; i < 23; i += 1) {
    const q = insertSql("riders", {
      id: `billadm_r${i}`,
      org_id: CLUB.orgId,
      name: `R${i}`,
      birth_year: 2009,
    });
    await admin.query(q.text, q.values);
  }
});

afterAll(async () => {
  // A personal workspace left here would count in another file's overview.
  await admin.query("delete from organizations where id like 'org_billadm_%'");
  await app.end();
  await admin.end();
});

const payment = {
  orgId: CLUB.orgId,
  amountDkk: 1350,
  vatDkk: 270,
  invoiceNo: "2026-014",
  periodFrom: "2026-10-01",
  periodTo: "2027-09-30",
  note: "Bankoverførsel",
};

describe("the overview", () => {
  it("shows every workspace but the demos, a person without a name, with riders and the price", async () => {
    const rows = await billingOverview(OWNER);
    const club = rows?.find((r) => r.orgId === CLUB.orgId);
    const person = rows?.find((r) => r.orgId === PERSON.orgId);
    expect(club).toMatchObject({
      name: "Betalende CK",
      kind: "club",
      plan: "free",
      planKey: "club",
      riders: 23,
      yearlyDkk: 1350,
      vatIncluded: true,
    });
    expect(person).toMatchObject({ name: "", kind: "personal", planKey: "person", yearlyDkk: 290 });
    expect(rows?.some((r) => r.orgId === DEMO.orgId)).toBe(false);
  });

  it("is nobody else's", async () => {
    expect(await billingOverview(CLUB.userId)).toBeNull();
    expect(await recentPayments(CLUB.userId)).toBeNull();
    const code = await asApp(app, CLUB, (c) =>
      expectSqlError(c.query("select * from billing_overview()")),
    );
    expect(code).toBe("42501");
  });
});

describe("a payment", () => {
  it("is registered by the owner and makes the workspace paid through the period's last day", async () => {
    expect(await registerPayment(OWNER, payment)).toBe("ok");
    expect(await planOf(CLUB.orgId)).toMatchObject({
      plan: "paid",
      paid_until: "2027-10-01 00:00",
    });
    const list = await recentPayments(OWNER);
    expect(list?.[0]).toMatchObject({
      orgId: CLUB.orgId,
      amountDkk: 1350,
      vatDkk: 270,
      invoiceNo: "2026-014",
      periodFrom: "2026-10-01",
      periodTo: "2027-09-30",
      note: "Bankoverførsel",
    });
    const audit = await admin.query(
      `select actor_user_id from audit_log where entity_type = 'payments' and org_id = $1`,
      [CLUB.orgId],
    );
    expect(audit.rows).toEqual([{ actor_user_id: OWNER }]);
  });

  it("for an earlier period never shortens what a later one paid for", async () => {
    expect(
      await registerPayment(OWNER, {
        ...payment,
        invoiceNo: "2025-003",
        periodFrom: "2025-10-01",
        periodTo: "2026-09-30",
      }),
    ).toBe("ok");
    expect(await planOf(CLUB.orgId)).toMatchObject({
      plan: "paid",
      paid_until: "2027-10-01 00:00",
    });
  });

  it("is refused to anyone but the owner, by the service and by the database", async () => {
    expect(await registerPayment(CLUB.userId, payment)).toBe("unauthorized");
    const code = await asApp(app, CLUB, (c) =>
      expectSqlError(
        c.query(`select set_payment($1, 1, 0, 'x', '2026-10-01', '2027-09-30', null)`, [
          CLUB.orgId,
        ]),
      ),
    );
    expect(code).toBe("42501");
  });

  it("must hold together, and is never for a demo", async () => {
    const asOwner = (sql: string, params: unknown[]) =>
      asApp(app, { orgId: "", userId: OWNER }, (c) => expectSqlError(c.query(sql, params)));
    expect(
      await asOwner(`select set_payment($1, 100, 200, 'x', '2026-10-01', '2027-09-30', null)`, [
        CLUB.orgId,
      ]),
    ).toBe("22023");
    expect(
      await asOwner(`select set_payment($1, 100, 20, 'x', '2026-10-01', '2026-09-30', null)`, [
        CLUB.orgId,
      ]),
    ).toBe("22023");
    expect(
      await asOwner(`select set_payment($1, 100, 20, '  ', '2026-10-01', '2027-09-30', null)`, [
        CLUB.orgId,
      ]),
    ).toBe("22023");
    expect(
      await asOwner(`select set_payment($1, 100, 20, 'x', '2026-10-01', '2027-09-30', null)`, [
        DEMO.orgId,
      ]),
    ).toBe("22023");
  });
});

describe("free", () => {
  it("is set by the owner with a reason and, if it is for a while, its last day", async () => {
    expect(
      await setPlanFree(OWNER, { orgId: PERSON.orgId, reason: "pilot", throughDay: "2027-01-31" }),
    ).toBe("ok");
    const row = await admin.query(
      `select plan, free_reason, to_char(free_until at time zone 'Europe/Copenhagen', 'YYYY-MM-DD HH24:MI') as until
       from organizations where id = $1`,
      [PERSON.orgId],
    );
    expect(row.rows[0]).toEqual({ plan: "free", free_reason: "pilot", until: "2027-02-01 00:00" });
    expect(await setPlanFree(OWNER, { orgId: PERSON.orgId, reason: "ven", throughDay: null })).toBe(
      "ok",
    );
    expect((await planOf(PERSON.orgId)).free_until).toBeNull();
  });

  it("is refused to anyone else, to a demo, and without a reason", async () => {
    expect(
      await setPlanFree(CLUB.userId, { orgId: CLUB.orgId, reason: "selv", throughDay: null }),
    ).toBe("unauthorized");
    expect(
      await asApp(app, CLUB, (c) =>
        expectSqlError(c.query(`select set_plan_free($1, 'selv', null)`, [CLUB.orgId])),
      ),
    ).toBe("42501");
    const asOwner = (sql: string, params: unknown[]) =>
      asApp(app, { orgId: "", userId: OWNER }, (c) => expectSqlError(c.query(sql, params)));
    expect(await asOwner(`select set_plan_free($1, 'pilot', null)`, [DEMO.orgId])).toBe("22023");
    expect(await asOwner(`select set_plan_free($1, ' ', null)`, [CLUB.orgId])).toBe("22023");
    expect(
      await asOwner(`select set_plan_free($1, 'pilot', now() - interval '1 day')`, [CLUB.orgId]),
    ).toBe("22023");
  });
});

describe("a price", () => {
  it("is set by the owner and nobody else, and audited", async () => {
    const set = (price: number) =>
      `select set_price_plan('club', 'Klub', 'Club', ${price}, 50, 20, 5000000, 20000000000, true)`;
    expect(await asApp(app, CLUB, (c) => expectSqlError(c.query(set(1300))))).toBe("42501");
    await asAppCommit(app, { orgId: "", userId: OWNER }, (c) => c.query(set(1300)));
    const after = await admin.query("select price_year_dkk from price_plans where key = 'club'");
    expect(after.rows[0].price_year_dkk).toBe(1300);
    const audit = await admin.query(
      `select actor_user_id from audit_log where entity_type = 'price_plans' and action = 'price_plans.update'`,
    );
    expect(audit.rows).toContainEqual({ actor_user_id: OWNER });
    await asAppCommit(app, { orgId: "", userId: OWNER }, (c) => c.query(set(1200)));
  });
});
