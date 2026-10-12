import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { expireWorkspaces } from "@/modules/billing/jobs";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The daily move (drizzle/0052 expire_workspaces, docs/adr/0090): a trial
 * past its end and a payment past its end become read only; a free
 * workspace past its date becomes a trial of TRIAL_DAYS days, a young
 * rider's priced as a person's from then; everything else stays as it
 * is — a trial or a payment still running, a free workspace without a
 * date, one already read only, and a demo whatever its dates say. The
 * clock is the database's, so the rows are dated around now.
 */

const P = "org_expire_";
let admin: Pool;
let app: Client;

type Seed = {
  plan: string;
  trial?: string;
  paid?: string;
  free?: string;
  reason?: string;
  price?: string;
};

const SEEDS: Record<string, Seed> = {
  trial_past: { plan: "trial", trial: "-1 hour" },
  trial_running: { plan: "trial", trial: "+3 days" },
  paid_past: { plan: "paid", trial: "-400 days", paid: "-1 minute" },
  paid_running: { plan: "paid", paid: "+20 days" },
  first_season_past: { plan: "free", free: "-1 hour", reason: "first-season" },
  youth_past: { plan: "free", free: "-1 hour", reason: "youth", price: "youth" },
  first_season_running: { plan: "free", free: "+200 days", reason: "first-season" },
  free_for_good: { plan: "free", reason: "pilot" },
  already_expired: { plan: "expired", trial: "-30 days" },
  demo_past: { plan: "trial", trial: "-1 day" },
};

const at = (offset?: string) => (offset ? `now() + interval '${offset}'` : "null");

async function row(key: string) {
  const { rows } = await admin.query(
    `select plan, free_reason, free_until, price_plan,
            round(extract(epoch from trial_ends_at - now()) / 86400) as trial_days
     from organizations where id = $1`,
    [P + key],
  );
  return rows[0];
}

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  for (const [key, seed] of Object.entries(SEEDS)) {
    await seedPerson(admin, P + key, `user_expire_${key}`, "owner", key);
    await admin.query(
      `update organizations set plan = $2, trial_ends_at = ${at(seed.trial)}, paid_until = ${at(seed.paid)},
         free_until = ${at(seed.free)}, free_reason = $3, price_plan = $4 where id = $1`,
      [P + key, seed.plan, seed.reason ?? null, seed.price ?? null],
    );
  }
  const demo = insertSql("demo_workspaces", {
    organization_id: P + "demo_past",
    user_id: "user_expire_demo_past",
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
  });
  await admin.query(demo.text, demo.values);
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe("expire_workspaces", () => {
  it("moves exactly the rows time has moved, and answers them", async () => {
    const moved = (await expireWorkspaces(30)).filter((m) => m.orgId.startsWith(P));
    expect(moved).toEqual(
      [
        { orgId: P + "first_season_past", from: "free", to: "trial" },
        { orgId: P + "paid_past", from: "paid", to: "expired" },
        { orgId: P + "trial_past", from: "trial", to: "expired" },
        { orgId: P + "youth_past", from: "free", to: "trial" },
      ].sort((a, b) => a.orgId.localeCompare(b.orgId)),
    );

    expect(await row("trial_past")).toMatchObject({ plan: "expired" });
    expect(await row("paid_past")).toMatchObject({ plan: "expired" });
    expect(await row("first_season_past")).toMatchObject({
      plan: "trial",
      trial_days: "30",
      free_until: null,
      free_reason: null,
    });
    // A young rider who has grown out of U19 is priced as a person from now.
    expect(await row("youth_past")).toMatchObject({
      plan: "trial",
      trial_days: "30",
      price_plan: null,
    });

    for (const key of ["trial_running", "paid_running", "first_season_running", "free_for_good"])
      expect((await row(key)).plan, key).toBe(SEEDS[key]!.plan);
    expect(await row("already_expired")).toMatchObject({ plan: "expired" });
    expect(await row("demo_past")).toMatchObject({ plan: "trial" });
  });

  it("does nothing the second time", async () => {
    expect((await expireWorkspaces(30)).filter((m) => m.orgId.startsWith(P))).toEqual([]);
  });

  it("leaves a free workspace free for good when the installation gives no trial", async () => {
    await admin.query(
      `update organizations set free_until = now() - interval '1 hour', free_reason = 'first-season'
       where id = $1`,
      [P + "first_season_running"],
    );
    const moved = (await expireWorkspaces(0)).filter((m) => m.orgId.startsWith(P));
    expect(moved).toEqual([{ orgId: P + "first_season_running", from: "free", to: "free" }]);
    expect(await row("first_season_running")).toMatchObject({ plan: "free", free_until: null });
  });

  it("is refused from a workspace, and refuses a trial of nonsense length", async () => {
    const ctx = { orgId: P + "trial_running", userId: "user_expire_trial_running" };
    expect(
      await asApp(app, ctx, (c) => expectSqlError(c.query("select * from expire_workspaces(30)"))),
    ).toBe("42501");
    expect(
      await asApp(app, ctx, (c) => expectSqlError(c.query("select * from billing_notices_due()"))),
    ).toBe("42501");
    expect(
      await asApp(app, null, (c) => expectSqlError(c.query("select * from expire_workspaces(-1)"))),
    ).toBe("22023");
  });
});
