import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { setPricePlan } from "@/core/admin/prices";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import { allPricePlanRows, currentPricePlans } from "@/modules/billing/price-list";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A price list with a history (drizzle/0053, docs/adr/0090 amended 12
 * October 2026): a change is a row from the day it takes effect; the
 * newest row that has come is today's, for the pages, the workspace's
 * price and the owner's list alike; a row for a later day waits; the
 * older rows stay. Only the installation's owner adds one, never for a
 * day that has passed. A plan of its own here, so the installation's
 * three keep one row each for the other files.
 */

const OWNER = "user_pricehist_owner";
const CLUB = { orgId: "org_pricehist", userId: "user_pricehist_coach" };
const KEY = "hist-test";
const today = todayInCopenhagen();
const tomorrow = addDaysIso(today, 1);
const monthAgo = addDaysIso(today, -30);

let admin: Pool;
let app: Client;

const input = (price: number, validFrom: string) => ({
  key: KEY,
  nameDa: "Historik",
  nameEn: "History",
  priceYearDkk: price,
  perRiderDkk: 50,
  includedRiders: 2,
  aiBudgetMicro: 1_000_000,
  fileQuotaBytes: 1_000_000_000,
  vatIncluded: true,
  validFrom,
});

const priceOf = async (orgId: string) =>
  asApp(
    app,
    CLUB,
    async (c) => (await c.query("select * from workspace_price($1)", [orgId])).rows[0],
  );

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await admin.query(
    `insert into users (id, name, email, platform_role) values ($1, 'Ejer', 'pricehist-owner@example.com', 'owner') on conflict do nothing`,
    [OWNER],
  );
  await seedPerson(admin, CLUB.orgId, CLUB.userId, "owner", "Historik CK");
  await admin.query("update organizations set price_plan = $2 where id = $1", [CLUB.orgId, KEY]);
  for (let i = 0; i < 4; i += 1) {
    const q = insertSql("riders", {
      id: `pricehist_r${i}`,
      org_id: CLUB.orgId,
      name: `R${i}`,
      birth_year: 2009,
    });
    await admin.query(q.text, q.values);
  }
  await admin.query(
    `insert into price_plans (key, name_da, name_en, price_year_dkk, per_rider_dkk, included_riders,
       ai_budget_micro, file_quota_bytes, valid_from)
     values ($1, 'Historik', 'History', 500, 50, 2, 1000000, 1000000000, $2)`,
    [KEY, monthAgo],
  );
});

afterAll(async () => {
  await admin.query("delete from organizations where id = $1", [CLUB.orgId]);
  await admin.query("delete from price_plans where key = $1", [KEY]);
  await app.end();
  await admin.end();
});

describe("a price from a later day", () => {
  it("waits for its day: today's price is still the older row", async () => {
    expect(await setPricePlan(OWNER, input(900, tomorrow))).toBe("ok");
    const now = await admin.query("select price_year_dkk from price_plan_now($1)", [KEY]);
    expect(now.rows).toEqual([{ price_year_dkk: 500 }]);
    // 500 for two riders, and 50 for each of the two beyond.
    expect(await priceOf(CLUB.orgId)).toMatchObject({ plan_key: KEY, price_year_dkk: 600 });
    expect((await currentPricePlans()).find((p) => p.key === KEY)?.priceYearDkk).toBe(500);
  });
});

describe("a price from today", () => {
  it("is today's price, for the workspace and the pages, and the older rows stay", async () => {
    expect(await setPricePlan(OWNER, input(700, today))).toBe("ok");
    expect(await priceOf(CLUB.orgId)).toMatchObject({ price_year_dkk: 800, riders: 4 });
    const listed = await currentPricePlans();
    expect(listed.filter((p) => p.key === KEY)).toHaveLength(1);
    expect(listed.find((p) => p.key === KEY)).toMatchObject({
      priceYearDkk: 700,
      validFrom: today,
    });
    const rows = (await allPricePlanRows()).filter((r) => r.key === KEY);
    expect(rows.map((r) => [r.validFrom, r.priceYearDkk])).toEqual([
      [tomorrow, 900],
      [today, 700],
      [monthAgo, 500],
    ]);
  });

  it("names every installation plan once among today's", async () => {
    const keys = (await currentPricePlans()).map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(expect.arrayContaining(["club", "person", "youth", KEY]));
  });
});

describe("what the database refuses", () => {
  const asOwner = (sql: string) =>
    asApp(app, { orgId: "", userId: OWNER }, (c) => expectSqlError(c.query(sql)));
  const call = (from: string, perRider = "50", included = "2") =>
    `select set_price_plan('${KEY}', 'H', 'H', 1, ${perRider}, ${included}, 0, 0, true, '${from}'::date)`;

  it("a day that has passed", async () => {
    expect(await asOwner(call(addDaysIso(today, -1)))).toBe("22023");
  });

  it("a price per rider without the riders it includes, and the other way", async () => {
    expect(await asOwner(call(today, "50", "null"))).toBe("22023");
    expect(await asOwner(call(today, "null", "2"))).toBe("22023");
  });

  it("anybody but the owner", async () => {
    expect(await asApp(app, CLUB, (c) => expectSqlError(c.query(call(today))))).toBe("42501");
    expect(await setPricePlan(CLUB.userId, input(1, today))).toBe("unauthorized");
  });

  it("writes nothing it refused", async () => {
    const n = await admin.query("select count(*)::int as n from price_plans where key = $1", [KEY]);
    expect(n.rows[0].n).toBe(3);
  });
});
