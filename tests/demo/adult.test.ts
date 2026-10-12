import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { navRole } from "@/app/[locale]/(app)/nav-items";
import { seasonStartYear } from "@/modules/dcu";
import { SENIOR_BIKE_SESSIONS, SENIOR_WEEKS, seasonOfMonth, seniorWeek } from "@/modules/paradigms";
import { cleanupExpiredDemos, createDemoWorkspace, isDemoWorkspace } from "@/modules/demo/service";
import { getSeasonPlan } from "@/modules/season/plans";
import { whoAmI } from "@/modules/team/access";
import { workspaceKind } from "@/modules/team/workspace-kind";
import { addDaysIso, mondayOf, todayInCopenhagen } from "@/core/dates";
import { adminPool } from "../helpers/db";

/**
 * "Prøv som voksen" (`/demo?alene=voksen`, docs/adr/0091, ADR 0054): an
 * adult alone in a personal workspace, born 1984, on the Supermotionist
 * profile, with a season plan from the profile's hours and six weeks of
 * training, as the youth rider alone has; Kadence's sessions, programmes
 * and ready weeks for adults in the library, and the profile's ready week
 * for the time of year laid into next week (ADR 0092). Built through the
 * ordinary sign-up path and services.
 */

let admin: Pool;
let orgId: string;
let userId: string;

beforeAll(async () => {
  admin = adminPool();
  await admin.query(
    `insert into users (id, name, email, email_verified, platform_role)
     values ('user_adult_suite_owner', 'Ejer', 'adult-suite-owner@example.org', false, 'owner')
     on conflict (id) do update set platform_role = 'owner'`,
  );
  expect(await createDemoWorkspace("da", "adult")).not.toBeNull();
  const row = await admin.query(
    `select organization_id, user_id from demo_workspaces order by created_at desc limit 1`,
  );
  ({ organization_id: orgId, user_id: userId } = row.rows[0]);
});

afterAll(async () => {
  await admin.query("delete from users where id = 'user_adult_suite_owner'");
  await admin.end();
});

describe("a demo of an adult alone", () => {
  it("is a personal workspace whose owner and only rider is a senior supermotionist", async () => {
    expect(await isDemoWorkspace(orgId)).toBe(true);
    const org = await admin.query(`select kind, name from organizations where id = $1`, [orgId]);
    expect(org.rows[0]).toEqual({ kind: "personal", name: "Lars' træning" });
    expect(await workspaceKind(orgId, userId)).toBe("personal");
    const riders = await admin.query(
      `select name, birth_year, training_profile, user_id from riders where org_id = $1`,
      [orgId],
    );
    expect(riders.rows).toEqual([
      { name: "Lars Holm", birth_year: 1984, training_profile: "super-motionist", user_id: userId },
    ]);
    const me = await whoAmI(orgId, userId);
    expect(me).toMatchObject({ role: "owner", isCoach: true });
    expect(navRole(me, "personal")).toBe("self");
  });

  it("holds a season plan from the profile and six weeks of training", async () => {
    const [{ id: riderId }] = (
      await admin.query(`select id from riders where org_id = $1`, [orgId])
    ).rows;
    const plan = await getSeasonPlan(
      { orgId, userId },
      riderId,
      seasonStartYear(todayInCopenhagen()),
    );
    expect(plan?.basis).toBe("senior-super-motionist");
    expect(plan?.months.reduce((sum, m) => sum + m.hours, 0)).toBe(520);
    const seeded = await admin.query(
      `select (select count(*)::int from planned_sessions where org_id = $1) as sessions,
              (select count(*)::int from planned_sessions where org_id = $1 and activity_id is not null) as done,
              (select count(*)::int from activity_files where org_id = $1) as files,
              (select count(*)::int from checkins where org_id = $1) as checkins,
              (select count(*)::int from calendar_events where org_id = $1 and rider_id is not null) as own_events,
              (select count(*)::int from rider_goals where org_id = $1 and source = 'dcu') as dcu_goals`,
      [orgId],
    );
    const s = seeded.rows[0];
    expect(s.sessions).toBeGreaterThan(25);
    expect(s.done).toBeGreaterThan(15);
    expect(s.files).toBeGreaterThan(3);
    expect(s.checkins).toBe(42);
    expect(s.own_events).toBeGreaterThan(0);
    // DCU's winter goal is U17's and U19's.
    expect(s.dcu_goals).toBe(0);
  });

  it("holds Kadence's content for adults, and next week is a ready week", async () => {
    const library = await admin.query(
      `select source, source_key from workout_templates where org_id = $1 and source = 'kadence'`,
      [orgId],
    );
    expect(library.rows).toHaveLength(SENIOR_BIKE_SESSIONS.length + 2);
    const weeks = await admin.query(
      `select source_key from training_blocks where org_id = $1 and source_key is not null`,
      [orgId],
    );
    expect(weeks.rows.map((r) => r.source_key).sort()).toEqual(
      SENIOR_WEEKS.map((w) => w.key).sort(),
    );
    const monday = addDaysIso(mondayOf(todayInCopenhagen()), 7);
    const week = seniorWeek("super-motionist", seasonOfMonth(Number(monday.slice(5, 7))));
    const next = await admin.query(
      `select s.on_date::text as on_date, t.source_key from planned_sessions s
       left join workout_templates t on t.id = s.template_id
       where s.org_id = $1 and s.on_date between $2 and $3 order by s.on_date`,
      [orgId, monday, addDaysIso(monday, 6)],
    );
    expect(next.rows).toHaveLength(week.items.length);
    expect(next.rows.every((r) => r.source_key?.startsWith("kadence-"))).toBe(true);
    // His strength through the six weeks is the Supermotionist programme.
    const strength = await admin.query(
      `select distinct t.source_key from planned_sessions s join workout_templates t on t.id = s.template_id
       where s.org_id = $1 and s.sport = 'strength'`,
      [orgId],
    );
    expect(strength.rows.map((r) => r.source_key)).toEqual(["kadence-strength-super-motionist"]);
  });

  it("goes whole when its time is up", async () => {
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
