import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { DEFAULT_MONTHLY_BUDGET_MICRO } from "@/modules/ai/limits";
import { aiMonth } from "@/modules/ai/usage";
import { workspacePlan } from "@/modules/billing/plan";
import { defaultQuotaBytes, fileQuota } from "@/modules/storage/quota";
import { adminPool } from "../helpers/db";
import { seedStorageTeam, type StorageTeam } from "../storage/fixture";
import { withBilling } from "./fixture";

/**
 * A plan's AI budget and file quota are its workspaces' (docs/adr/0090,
 * amended 12 October 2026): with BILLING=on a workspace gets its own
 * number when the owner gave it one, else its price plan's, else the
 * installation's default; with it off, the plans say nothing and it is as
 * before (ADR 0087, 0089). A plan of its own here, so the installation's
 * three are left alone.
 */

const KEY = "limits-test";
const PLAN_AI = 3_000_000;
const PLAN_FILES = 7_000_000_000;
let admin: Pool;
let team: StorageTeam;

const own = (ai: number | null, files: number | null) =>
  admin.query(
    `insert into team_settings (org_id, ai_budget_micro, file_quota_bytes) values ($1, $2, $3)
     on conflict (org_id) do update set ai_budget_micro = $2, file_quota_bytes = $3`,
    [team.orgId, ai, files],
  );

beforeAll(async () => {
  admin = adminPool();
  team = await seedStorageTeam(admin, "planlim");
  await admin.query(
    `insert into price_plans (key, name_da, name_en, price_year_dkk, ai_budget_micro, file_quota_bytes, valid_from)
     values ($1, 'Grænser', 'Limits', 100, $2, $3, current_date - 1)`,
    [KEY, PLAN_AI, PLAN_FILES],
  );
  await admin.query("update organizations set price_plan = $2 where id = $1", [team.orgId, KEY]);
  await own(null, null);
});

afterAll(async () => {
  await admin.query("delete from organizations where id = $1", [team.orgId]);
  await admin.query("delete from price_plans where key = $1", [KEY]);
  await admin.end();
});

describe("with BILLING=off", () => {
  it("gives the installation's defaults, whatever the plan holds", async () => {
    expect((await aiMonth(team.coach)).budgetMicro).toBe(DEFAULT_MONTHLY_BUDGET_MICRO);
    expect(await fileQuota(team.coach)).toMatchObject({
      quotaBytes: defaultQuotaBytes("club"),
      own: false,
    });
    expect(await workspacePlan(team.coach)).toMatchObject({
      aiBudgetMicro: null,
      fileQuotaBytes: null,
    });
  });
});

describe("with BILLING=on", () => {
  it("gives a workspace without its own number its plan's", async () => {
    const restore = withBilling("on");
    try {
      expect(await workspacePlan(team.coach)).toMatchObject({
        aiBudgetMicro: PLAN_AI,
        fileQuotaBytes: PLAN_FILES,
      });
      expect((await aiMonth(team.coach)).budgetMicro).toBe(PLAN_AI);
      expect(await fileQuota(team.coach)).toMatchObject({ quotaBytes: PLAN_FILES, own: false });
      // The quota is the workspace's, for a rider in it too.
      expect((await fileQuota(team.rider)).quotaBytes).toBe(PLAN_FILES);
    } finally {
      restore();
    }
  });

  it("lets the workspace's own number win over the plan's", async () => {
    const restore = withBilling("on");
    try {
      await own(9_000_000, 123_000);
      expect((await aiMonth(team.coach)).budgetMicro).toBe(9_000_000);
      expect(await fileQuota(team.coach)).toMatchObject({ quotaBytes: 123_000, own: true });
    } finally {
      await own(null, null);
      restore();
    }
  });

  it("falls back to the installation's default when the plan has no row", async () => {
    const restore = withBilling("on");
    try {
      await admin.query("update organizations set price_plan = 'no-such-plan' where id = $1", [
        team.orgId,
      ]);
      expect((await aiMonth(team.coach)).budgetMicro).toBe(DEFAULT_MONTHLY_BUDGET_MICRO);
      expect((await fileQuota(team.coach)).quotaBytes).toBe(defaultQuotaBytes("club"));
    } finally {
      await admin.query("update organizations set price_plan = $2 where id = $1", [
        team.orgId,
        KEY,
      ]);
      restore();
    }
  });

  it("follows today's row of the plan", async () => {
    const restore = withBilling("on");
    try {
      await admin.query(
        `insert into price_plans (key, name_da, name_en, price_year_dkk, ai_budget_micro, file_quota_bytes, valid_from)
         values ($1, 'Grænser', 'Limits', 100, 4000000, 8000000000, current_date + 2)`,
        [KEY],
      );
      expect((await aiMonth(team.coach)).budgetMicro).toBe(PLAN_AI);
    } finally {
      restore();
    }
  });
});
