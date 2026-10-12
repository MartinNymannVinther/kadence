import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { yearlyPrice, type PricePlan } from "@/modules/billing/which-plan";
import { adminPool, appClient, asApp, authClient, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The tables behind what a workspace pays (drizzle/0052, docs/adr/0090).
 * price_plans is the installation's: every runtime context reads it,
 * nobody writes it but set_price_plan(). payments are a workspace's:
 * its owner reads them, and the installation's owner, and nobody else;
 * nobody writes one but set_payment(). The plan's columns on
 * organizations move only through the definers.
 */

const A_OWNER = { orgId: "org_bill_a", userId: "user_bill_a_owner" };
const A_ADMIN = { orgId: "org_bill_a", userId: "user_bill_a_admin" };
const A_MEMBER = { orgId: "org_bill_a", userId: "user_bill_a_member" };
const B_OWNER = { orgId: "org_bill_b", userId: "user_bill_b_owner" };
const INSTALLATION = "user_bill_installation";

let admin: Pool;
let app: Client;

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, A_OWNER.orgId, A_OWNER.userId, "owner", "Betaling CK");
  await seedPerson(admin, A_ADMIN.orgId, A_ADMIN.userId, "admin");
  await seedPerson(admin, A_MEMBER.orgId, A_MEMBER.userId, "member");
  await seedPerson(admin, B_OWNER.orgId, B_OWNER.userId, "owner", "Anden CK");
  await admin.query(
    `insert into users (id, name, email, platform_role) values ($1, 'Ejer', 'bill-installation@example.com', 'owner') on conflict do nothing`,
    [INSTALLATION],
  );
  for (const [id, org] of [
    ["pay_a", A_OWNER.orgId],
    ["pay_b", B_OWNER.orgId],
  ] as const) {
    const q = insertSql("payments", {
      id,
      org_id: org,
      amount_dkk: 1200,
      vat_dkk: 240,
      invoice_no: `F-${id}`,
      period_from: "2026-10-01",
      period_to: "2027-09-30",
      registered_by: INSTALLATION,
    });
    await admin.query(q.text, q.values);
  }
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

const ids = async (c: Client) =>
  (await c.query("select id from payments order by id")).rows.map((r) => r.id as string);

describe("price_plans", () => {
  it("starts with Martin's three prices, VAT included", async () => {
    const { rows } = await admin.query(
      `select key, price_year_dkk, per_rider_dkk, included_riders, ai_budget_micro::bigint as ai,
              file_quota_bytes::bigint as files, vat_included from price_plans order by key`,
    );
    expect(rows).toEqual([
      {
        key: "club",
        price_year_dkk: 1200,
        per_rider_dkk: 50,
        included_riders: 20,
        ai: "5000000",
        files: "20000000000",
        vat_included: true,
      },
      {
        key: "person",
        price_year_dkk: 290,
        per_rider_dkk: null,
        included_riders: null,
        ai: "5000000",
        files: "2000000000",
        vat_included: true,
      },
      {
        key: "youth",
        price_year_dkk: 0,
        per_rider_dkk: null,
        included_riders: null,
        ai: "2000000",
        files: "2000000000",
        vat_included: true,
      },
    ]);
  });

  it("is read by the application in every context, a workspace's or none", async () => {
    for (const ctx of [A_MEMBER, null]) {
      const { rows } = await asApp(app, ctx, (c) => c.query("select key from price_plans"));
      expect(rows.length).toBe(3);
    }
  });

  it("is written by nobody but the owner's function", async () => {
    for (const sql of [
      "insert into price_plans (key, name_da, name_en, price_year_dkk, ai_budget_micro, file_quota_bytes) values ('x', 'x', 'x', 1, 0, 0)",
      "update price_plans set price_year_dkk = 1 where key = 'club'",
      "delete from price_plans where key = 'club'",
    ]) {
      expect(await asApp(app, A_OWNER, (c) => expectSqlError(c.query(sql))), sql).toBe("42501");
    }
    const auth = await authClient();
    try {
      expect(await expectSqlError(auth.query("select key from price_plans"))).toBe("42501");
    } finally {
      await auth.end();
    }
  });

  it("adds up in the database as it does in the code", async () => {
    const { rows } = await admin.query(
      "select key, price_year_dkk, per_rider_dkk, included_riders from price_plans",
    );
    for (const row of rows) {
      const plan: PricePlan = {
        key: row.key,
        priceYearDkk: row.price_year_dkk,
        perRiderDkk: row.per_rider_dkk,
        includedRiders: row.included_riders,
      };
      for (const riders of [0, 1, 12, 20, 21, 40]) {
        const sum = await asApp(app, A_MEMBER, (c) =>
          c.query("select plan_yearly_dkk($1, $2) as n", [row.key, riders]),
        );
        expect(sum.rows[0].n, `${row.key} ${riders}`).toBe(yearlyPrice(plan, riders));
      }
    }
  });
});

describe("payments", () => {
  it("are read by the workspace's owner, and only its own", async () => {
    expect(await asApp(app, A_OWNER, ids)).toEqual(["pay_a"]);
    expect(await asApp(app, B_OWNER, ids)).toEqual(["pay_b"]);
  });

  it("are not read by the workspace's other coaches, its members, or nobody at all", async () => {
    expect(await asApp(app, A_ADMIN, ids)).toEqual([]);
    expect(await asApp(app, A_MEMBER, ids)).toEqual([]);
    expect(await asApp(app, null, ids)).toEqual([]);
    // Another workspace's owner with this one named in the context.
    expect(await asApp(app, { orgId: A_OWNER.orgId, userId: B_OWNER.userId }, ids)).toEqual([]);
  });

  it("are read whole by the installation's owner", async () => {
    const all = await asApp(app, { orgId: "", userId: INSTALLATION }, ids);
    expect(all.filter((id) => id.startsWith("pay_"))).toEqual(["pay_a", "pay_b"]);
  });

  it("are written by nobody in a workspace, its owner included", async () => {
    for (const sql of [
      `insert into payments (org_id, amount_dkk, vat_dkk, invoice_no, period_from, period_to, registered_by)
       values ('org_bill_a', 1, 0, 'x', '2026-01-01', '2026-01-02', 'user_bill_a_owner')`,
      "update payments set amount_dkk = 1 where id = 'pay_a'",
      "delete from payments where id = 'pay_a'",
    ]) {
      expect(await asApp(app, A_OWNER, (c) => expectSqlError(c.query(sql))), sql).toBe("42501");
    }
  });

  it("are audited under the workspace", async () => {
    const { rows } = await admin.query(
      "select org_id from audit_log where entity_type = 'payments' and entity_id = 'pay_a'",
    );
    expect(rows).toEqual([{ org_id: A_OWNER.orgId }]);
  });
});

describe("a workspace's plan", () => {
  it("is read by its members and changed by none of them", async () => {
    const { rows } = await asApp(app, A_MEMBER, (c) =>
      c.query("select plan from organizations where id = $1", [A_OWNER.orgId]),
    );
    expect(rows).toEqual([{ plan: "free" }]);
    expect(
      await asApp(app, A_OWNER, (c) =>
        expectSqlError(
          c.query(
            "update organizations set plan = 'paid', paid_until = now() + interval '9 years' where id = $1",
            [A_OWNER.orgId],
          ),
        ),
      ),
    ).toBe("42501");
  });

  it("is one of four words", async () => {
    expect(
      await expectSqlError(
        admin.query("update organizations set plan = 'gold' where id = $1", [A_OWNER.orgId]),
      ),
    ).toBe("23514");
  });
});
