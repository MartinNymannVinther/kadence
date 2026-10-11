import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { personsSummary, platformOverview } from "@/core/admin/overview";
import { todayInCopenhagen } from "@/core/dates";
import { lastFullWeek } from "@/modules/insight/pilot-numbers";
import { adminPool, appClient, expectSqlError } from "../helpers/db";
import { seedMember, seedWorkspace } from "../helpers/workspace";

/**
 * The installation's overview (drizzle/0019, docs/adr/0048): the owner
 * gets one row per club with counts only; anyone else is refused, by the
 * service and by the database function itself. The pilot's three numbers
 * (drizzle/0031, docs/adr/0066) are counts for the last full week;
 * tests/insight/pilot-overview proves them against the coaches' own.
 */

let admin: Pool;
let app: Client;

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedWorkspace(admin, "ov_owner");
  await admin.query(`update users set platform_role = 'owner' where id = 'user_ov_owner'`);
  const club = await seedWorkspace(admin, "ov_club");
  await seedMember(admin, club.orgId, "ov_rider");
  await admin.query(
    `insert into riders (id, org_id, user_id, name, birth_year) values ('rider_ov', 'org_ov_club', 'user_ov_rider', 'Hemmelig Rytter', 2010)`,
  );
  const person = await seedWorkspace(admin, "ov_person");
  await admin.query(
    `update organizations set kind = 'personal', name = 'Sofies træning' where id = $1`,
    [person.orgId],
  );
  await admin.query(
    `insert into riders (id, org_id, user_id, name, birth_year) values ('rider_ov_person', $1, $2, 'Sofie Alene', 2010)`,
    [person.orgId, person.userId],
  );
  await seedWorkspace(admin, "ov_demo");
  await admin.query(
    `insert into demo_workspaces (organization_id, user_id, expires_at) values ('org_ov_demo', 'user_ov_demo', now() + interval '1 day')`,
  );
});

afterAll(async () => {
  await app?.end();
  await admin?.end();
});

describe("the installation's overview", () => {
  it("gives the owner counts per club, and no person's name", async () => {
    const clubs = await platformOverview("user_ov_owner");
    const club = clubs?.find((c) => c.orgId === "org_ov_club");
    expect(club).toMatchObject({ coaches: 1, riders: 1, parents: 0, members: 2 });
    expect(JSON.stringify(clubs)).not.toContain("Hemmelig Rytter");
  });

  it("adds the pilot's numbers for the last full week, where a rider added today is not yet", async () => {
    const club = (await platformOverview("user_ov_owner"))?.find((c) => c.orgId === "org_ov_club");
    expect(club?.pilot).toEqual({
      week: lastFullWeek(todayInCopenhagen()),
      riders: 0,
      checkedIn: 0,
      sessions: 0,
      receipts: 0,
      minutes: 0,
    });
  });

  it("gives a personal workspace's kind and counts, never its name (ADR 0080)", async () => {
    const rows = await platformOverview("user_ov_owner");
    const person = rows?.find((c) => c.orgId === "org_ov_person");
    expect(person).toMatchObject({ kind: "personal", name: "", riders: 1 });
    expect(rows?.find((c) => c.orgId === "org_ov_club")?.kind).toBe("club");
    expect(JSON.stringify(rows)).not.toContain("Sofies træning");
    expect(JSON.stringify(rows)).not.toContain("Sofie Alene");
    expect(personsSummary(rows ?? [], new Date())).toMatchObject({ count: 1, seenWeek: 0 });
  });

  it("adds persons up into one line: how many, seen this week, files and AI calls", () => {
    const base = {
      orgId: "x",
      name: "",
      createdAt: new Date(),
      coaches: 1,
      riders: 1,
      parents: 0,
      members: 1,
      aiUnpricedMonth: 0,
      aiBudgetMicro: null,
      fileQuotaBytes: null,
      pilot: { week: "2026-10-05", riders: 0, checkedIn: 0, sessions: 0, receipts: 0, minutes: 0 },
    };
    const now = new Date("2026-10-11T12:00:00Z");
    const rows = [
      {
        ...base,
        kind: "personal" as const,
        lastSeen: new Date("2026-10-10T12:00:00Z"),
        fileBytes: 10,
        aiCallsDay: 2,
        aiCostMonthMicro: 1_500,
      },
      {
        ...base,
        kind: "personal" as const,
        lastSeen: new Date("2026-09-01T12:00:00Z"),
        fileBytes: 5,
        aiCallsDay: 0,
        aiCostMonthMicro: 0,
      },
      {
        ...base,
        kind: "personal" as const,
        lastSeen: null,
        fileBytes: 0,
        aiCallsDay: 1,
        aiCostMonthMicro: 500,
        aiUnpricedMonth: 2,
      },
      {
        ...base,
        kind: "club" as const,
        lastSeen: now,
        fileBytes: 999,
        aiCallsDay: 9,
        aiCostMonthMicro: 9_999,
      },
    ];
    expect(personsSummary(rows, now)).toEqual({
      count: 3,
      seenWeek: 1,
      fileBytes: 15,
      aiCallsDay: 3,
      aiCostMonthMicro: 2_000,
      aiUnpricedMonth: 2,
    });
  });

  it("leaves demo workspaces out", async () => {
    const clubs = await platformOverview("user_ov_owner");
    expect(clubs?.some((c) => c.orgId === "org_ov_demo")).toBe(false);
  });

  it("is nothing to anyone else", async () => {
    expect(await platformOverview("user_ov_club")).toBeNull();
  });

  it("the database refuses a caller who is not the owner, and one who says nothing", async () => {
    const call = (userId: string | null) => async () => {
      await app.query("begin");
      try {
        if (userId) await app.query("select set_config('app.user_id', $1, true)", [userId]);
        return await app.query("select * from platform_overview()");
      } finally {
        await app.query("rollback");
      }
    };
    expect(await expectSqlError(call("user_ov_club")())).toBe("42501");
    expect(await expectSqlError(call(null)())).toBe("42501");
    const owner = await call("user_ov_owner")();
    expect(owner.rows.length).toBeGreaterThan(0);
    // Nothing but the club, its name and counts: a new column is a decision.
    expect(owner.fields.map((f) => f.name)).toEqual([
      "org_id",
      "name",
      "kind",
      "created_at",
      "coaches",
      "riders",
      "parents",
      "members",
      "last_seen",
      "file_bytes",
      "ai_calls_day",
      "pilot_week",
      "pilot_riders",
      "pilot_checked_in",
      "pilot_sessions",
      "pilot_receipts",
      "pilot_minutes",
      "ai_cost_month_micro",
      "ai_unpriced_month",
      "ai_budget_micro",
      "file_quota_bytes",
    ]);
  });

  /**
   * docs/adr/0089: this month's cost on the installation's key, the calls
   * whose price is unknown, and the workspace's own budget. A call on the
   * workspace's own key and a call from last month are not this month's
   * bill. The month is Copenhagen's, so "last month" is placed safely
   * before its first day.
   */
  it("adds this month's AI cost, the unpriced calls and the budget", async () => {
    await admin.query(
      `insert into ai_calls (org_id, kind, engine, tokens_in, tokens_out, cost_micro, billed_to, created_at) values
         ('org_ov_club', 'test', 'mistral:x', 1000, 100, 1200, 'installation', now()),
         ('org_ov_club', 'test', 'mistral:x', 1000, 100, 300, 'installation', now()),
         ('org_ov_club', 'test', 'mistral:x', 1000, 100, 9000, 'workspace', now()),
         ('org_ov_club', 'test', 'mistral:x', 1000, 100, null, 'installation', now()),
         ('org_ov_club', 'test', 'mistral:x', null, null, null, 'installation', now()),
         ('org_ov_club', 'test', 'mistral:x', 1000, 100, 7777,  'installation',
          date_trunc('month', now() at time zone 'Europe/Copenhagen') at time zone 'Europe/Copenhagen' - interval '1 hour')`,
    );
    let club = (await platformOverview("user_ov_owner"))?.find((c) => c.orgId === "org_ov_club");
    expect(club).toMatchObject({ aiCostMonthMicro: 1500, aiUnpricedMonth: 1, aiBudgetMicro: null });

    const owner = await admin.connect();
    try {
      await owner.query("begin");
      await owner.query("select set_config('app.user_id', 'user_ov_owner', true)");
      await owner.query("select set_ai_budget('org_ov_club', 12000000)");
      await owner.query("commit");
    } finally {
      owner.release();
    }
    club = (await platformOverview("user_ov_owner"))?.find((c) => c.orgId === "org_ov_club");
    expect(club?.aiBudgetMicro).toBe(12_000_000);
    await admin.query("delete from ai_calls where org_id = 'org_ov_club'");
  });
});
