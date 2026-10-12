import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { workspacePayments, workspacePrice, workspacePriceForJob } from "@/modules/billing/price";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * What a workspace costs and has paid, as Abonnement reads it (docs/adr/
 * 0090): the price from price_plans and the riders it has now, for its
 * coaches and nobody else in it; the payments for its owner.
 */

const OWNER = { orgId: "org_price_club", userId: "user_price_owner" };
const ADMIN = { orgId: "org_price_club", userId: "user_price_admin" };
const RIDER = { orgId: "org_price_club", userId: "user_price_rider" };
const STRANGER = { orgId: "org_price_other", userId: "user_price_other" };

let admin: Pool;
let app: Client;

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, OWNER.orgId, OWNER.userId, "owner", "Pris CK");
  await seedPerson(admin, ADMIN.orgId, ADMIN.userId, "admin");
  await seedPerson(admin, RIDER.orgId, RIDER.userId, "member");
  await seedPerson(admin, STRANGER.orgId, STRANGER.userId, "owner", "Anden CK");
  for (let i = 0; i < 41; i += 1) {
    const q = insertSql("riders", {
      id: `price_r${i}`,
      org_id: OWNER.orgId,
      name: `R${i}`,
      birth_year: 2009,
      archived: i === 40,
    });
    await admin.query(q.text, q.values);
  }
  const p = insertSql("payments", {
    org_id: OWNER.orgId,
    amount_dkk: 2200,
    vat_dkk: 440,
    invoice_no: "2026-001",
    period_from: "2026-10-01",
    period_to: "2027-09-30",
    registered_by: "user_price_installation",
  });
  await admin.query(p.text, p.values);
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe("a workspace's price", () => {
  it("is the club's for the riders it has now, archived ones aside, a year and a month", async () => {
    expect(await workspacePrice(OWNER)).toEqual({
      planKey: "club",
      yearlyDkk: 2200,
      monthlyDkk: 183,
      riders: 40,
      includedRiders: 20,
      perRiderDkk: 50,
      vatIncluded: true,
    });
    expect((await workspacePrice(ADMIN))?.yearlyDkk).toBe(2200);
    expect((await workspacePriceForJob(OWNER.orgId))?.riders).toBe(40);
  });

  it("is not a rider's to read, nor another workspace's coach's", async () => {
    await expect(workspacePrice(RIDER)).rejects.toThrow();
    const code = await asApp(app, STRANGER, (c) =>
      expectSqlError(c.query("select * from workspace_price($1)", [OWNER.orgId])),
    );
    expect(code).toBe("42501");
  });
});

describe("a workspace's payments", () => {
  it("are its owner's to read and no other coach's", async () => {
    expect(await workspacePayments(OWNER)).toMatchObject([
      {
        amountDkk: 2200,
        vatDkk: 440,
        invoiceNo: "2026-001",
        periodFrom: "2026-10-01",
        periodTo: "2027-09-30",
      },
    ]);
    expect(await workspacePayments(ADMIN)).toEqual([]);
    expect(await workspacePayments(STRANGER)).toEqual([]);
  });
});
