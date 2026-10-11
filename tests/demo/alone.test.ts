import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { navRole } from "@/app/[locale]/(app)/nav-items";
import { myHealthConsent } from "@/modules/consent/service";
import { currentDemoRole } from "@/modules/demo/roles";
import { cleanupExpiredDemos, createDemoWorkspace, isDemoWorkspace } from "@/modules/demo/service";
import { whoAmI } from "@/modules/team/access";
import { getTeamSettings } from "@/modules/team/settings";
import { workspaceKind } from "@/modules/team/workspace-kind";
import { adminPool } from "../helpers/db";

/**
 * "Prøv alene" (`/demo?alene=1`, docs/adr/0080, ADR 0054): a demo of one
 * U19 rider alone in a personal workspace, the visitor being both its
 * owner and its rider, with six weeks of training. Built through the
 * ordinary sign-up path and services, as the team's demo is.
 */

let admin: Pool;
let orgId: string;
let userId: string;

beforeAll(async () => {
  admin = adminPool();
  // A demo opens only on an installation somebody owns (backlog P1-09).
  await admin.query(
    `insert into users (id, name, email, email_verified, platform_role)
     values ('user_alone_suite_owner', 'Ejer', 'alone-suite-owner@example.org', false, 'owner')
     on conflict (id) do update set platform_role = 'owner'`,
  );
  expect(await createDemoWorkspace("da", "alone")).not.toBeNull();
  const row = await admin.query(
    `select organization_id, user_id from demo_workspaces order by created_at desc limit 1`,
  );
  ({ organization_id: orgId, user_id: userId } = row.rows[0]);
});

afterAll(async () => {
  await admin.query("delete from users where id = 'user_alone_suite_owner'");
  await admin.end();
});

describe("a demo of one rider alone", () => {
  it("is a personal workspace whose owner and only rider is the visitor", async () => {
    expect(await isDemoWorkspace(orgId)).toBe(true);
    const org = await admin.query(`select kind, name from organizations where id = $1`, [orgId]);
    expect(org.rows[0]).toEqual({ kind: "personal", name: "Emmas træning" });
    expect(await workspaceKind(orgId, userId)).toBe("personal");
    const riders = await admin.query(`select name, user_id from riders where org_id = $1`, [orgId]);
    expect(riders.rows).toEqual([{ name: "Emma Holm", user_id: userId }]);
    const me = await whoAmI(orgId, userId);
    expect(me).toMatchObject({ role: "owner", isCoach: true });
    expect(navRole(me, "personal")).toBe("self");
  });

  it("holds six weeks of training, mostly ridden, with check-ins and the season ahead", async () => {
    const seeded = await admin.query(
      `select (select count(*)::int from planned_sessions where org_id = $1) as sessions,
              (select count(*)::int from planned_sessions where org_id = $1 and activity_id is not null) as done,
              (select count(*)::int from activity_files where org_id = $1) as files,
              (select count(*)::int from checkins where org_id = $1) as checkins,
              (select count(*)::int from season_plans where org_id = $1) as plans,
              (select count(*)::int from calendar_events where org_id = $1 and rider_id is not null) as own_events,
              (select count(*)::int from calendar_events where org_id = $1 and rider_id is null) as team_events,
              (select count(*)::int from workout_templates where org_id = $1 and source = 'dcu') as dcu`,
      [orgId],
    );
    const s = seeded.rows[0];
    expect(s.sessions).toBeGreaterThan(25);
    expect(s.done).toBeGreaterThan(15);
    expect(s.files).toBeGreaterThan(3);
    expect(s.checkins).toBe(42);
    expect(s.plans).toBe(1);
    expect(s.own_events).toBeGreaterThan(0);
    expect(s.team_events).toBe(0);
    expect(s.dcu).toBe(3);
    expect(await getTeamSettings({ orgId, userId })).toMatchObject({ clubChampionship: false });
  });

  it("has nobody to switch to, so the stripe shows no switch", async () => {
    const demo = await admin.query(
      `select accounts from demo_workspaces where organization_id = $1`,
      [orgId],
    );
    expect(demo.rows[0].accounts).toEqual([]);
    expect(await currentDemoRole(userId, orgId)).toBeNull();
    const members = await admin.query(
      `select count(*)::int as n from memberships where organization_id = $1`,
      [orgId],
    );
    expect(members.rows[0].n).toBe(1);
  });

  it("holds the consents a person gives at sign-up, so Data shows them (ADR 0088)", async () => {
    expect(await myHealthConsent({ orgId, userId })).toMatchObject({ state: "given" });
    const kinds = await admin.query(
      `select kind from consents where org_id = $1 and user_id = $2 order by kind`,
      [orgId, userId],
    );
    expect(kinds.rows.map((r) => r.kind)).toEqual(["health", "terms"]);
  });

  it("goes whole when its time is up, the visitor's account included", async () => {
    await admin.query(
      `update demo_workspaces set expires_at = now() - interval '1 minute' where organization_id = $1`,
      [orgId],
    );
    expect(await cleanupExpiredDemos()).toBeGreaterThanOrEqual(1);
    const org = await admin.query(`select 1 from organizations where id = $1`, [orgId]);
    const user = await admin.query(`select 1 from users where id = $1`, [userId]);
    expect([org.rowCount, user.rowCount]).toEqual([0, 0]);
  });
});
