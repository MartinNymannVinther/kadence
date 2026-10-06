import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import {
  cleanupExpiredDemos,
  createDemoWorkspace,
  demoLandingUrl,
  isDemoWorkspace,
} from "@/modules/demo/service";
import { readAccounts, switchDemoRole } from "@/modules/demo/roles";
import { getChampionship, listChampions, listChampionships } from "@/modules/club/service";
import { listThreads, unreadThreadCount } from "@/modules/community/service";
import { getTeamSettings } from "@/modules/team/settings";
import { listOwnTemplates } from "@/modules/training/templates";
import { whoAmI } from "@/modules/team/access";
import { adminPool } from "../helpers/db";

/**
 * The demo, built through the ordinary sign-up path: a real workspace, a
 * throwaway account, and a date it stops existing. The suite runs with
 * DEMO=on (see the test environment); the shipped default is off and
 * proven in tests/core/env. A demo opens on a seeded portfolio, written
 * through the ordinary services (src/modules/demo/seed.ts), with a rider
 * and a parent beside the coach so the visitor can see all three roles
 * (src/modules/demo/roles.ts).
 */

let admin: Pool;
let orgId: string;
let userId: string;
let people: string[] = [];

beforeAll(async () => {
  admin = adminPool();
});

afterAll(async () => {
  await admin.end();
});

describe("a demo workspace", () => {
  it("is created with a signed-in guest, a portfolio in it, and lands on the overview", async () => {
    const demo = await createDemoWorkspace("da");
    expect(demo).not.toBeNull();
    expect(demo!.headers.get("cookie")).toMatch(/better-auth/);
    const row = await admin.query(
      `select organization_id, user_id from demo_workspaces order by created_at desc limit 1`,
    );
    orgId = row.rows[0].organization_id;
    userId = row.rows[0].user_id;
    expect(await isDemoWorkspace(orgId)).toBe(true);
    expect(demoLandingUrl("da").pathname).toBe("/today");
    expect(demoLandingUrl("en").pathname).toBe("/en/today");
    const seeded = await admin.query(
      `select (select count(*)::int from riders where org_id = $1) as riders,
              (select count(*)::int from planned_sessions where org_id = $1) as sessions,
              (select count(*)::int from planned_sessions where org_id = $1 and activity_id is not null) as done,
              (select count(*)::int from checkins where org_id = $1) as checkins,
              (select count(*)::int from workout_templates where org_id = $1 and source = 'dcu') as dcu`,
      [orgId],
    );
    expect(seeded.rows[0].riders).toBe(6);
    expect(seeded.rows[0].sessions).toBeGreaterThan(150);
    expect(seeded.rows[0].done).toBeGreaterThan(100);
    expect(seeded.rows[0].checkins).toBe(6 * 14);
    expect(seeded.rows[0].dcu).toBe(3);
  });

  it("shows every part of the product: logo, own sessions, the championship, the room", async () => {
    const coach = { orgId, userId };
    const settings = await getTeamSettings(coach);
    expect(settings).toMatchObject({ clubChampionship: true, lowIntensityFirst: true });
    const images = await admin.query(
      `select kind from org_images where org_id = $1 order by kind`,
      [orgId],
    );
    expect(images.rows.map((r) => r.kind)).toEqual(["cover", "logo"]);
    expect((await listOwnTemplates(coach)).map((t) => t.riderName)).toEqual(["Emma Holm"]);

    const championships = (await listChampionships(coach))!;
    expect(championships).toHaveLength(2);
    const latest = (await getChampionship(coach, championships[0]!.id))!;
    expect(latest.rounds).toHaveLength(3);
    expect(latest.improvement?.name).toBe("Freja Dahl");
    expect(latest.rounds.some((r) => r.entries.some((e) => e.record))).toBe(true);
    expect((await listChampions(coach)).length).toBeGreaterThanOrEqual(8);

    const threads = (await listThreads(coach))!;
    expect(threads).toHaveLength(7);
    expect(new Set(threads.map((t) => t.category)).size).toBe(6);
    expect(threads.every((t) => t.authorName && t.clubName && t.unread)).toBe(true);
    expect(await unreadThreadCount(coach)).toBe(7);
    const inRoom = await admin.query(
      `select count(*)::int as n, count(workout)::int as w from community_threads where demo_org_id = $1`,
      [orgId],
    );
    expect(inRoom.rows[0]).toEqual({ n: 7, w: 1 });
  });

  it("meets at the clubhouse for the rides the team does together (ADR 0057)", async () => {
    const placed = await admin.query(
      `select count(*)::int as n from planned_sessions
        where org_id = $1 and start_time is not null and meeting_place = 'Klubhuset'`,
      [orgId],
    );
    expect(placed.rows[0].n).toBeGreaterThan(0);
  });

  it("has a rider and her parent the visitor can switch to, and nobody else can", async () => {
    const row = await admin.query(
      `select accounts from demo_workspaces where organization_id = $1`,
      [orgId],
    );
    const accounts = readAccounts(row.rows[0].accounts);
    expect(accounts.map((a) => a.role)).toEqual(["coach", "rider", "parent"]);
    people = accounts.map((a) => a.userId);
    const parent = accounts.find((a) => a.role === "parent")!;
    const me = await whoAmI(orgId, parent.userId);
    expect(me?.children).toMatchObject([{ name: "Emma Holm", confirmed: true }]);

    const switched = await switchDemoRole({ userId, orgId }, "parent");
    expect(switched?.getSetCookie().join(";")).toMatch(/better-auth/);
    expect(await switchDemoRole({ userId: "someone-else", orgId }, "rider")).toBeNull();
    expect(await switchDemoRole({ userId, orgId: "another-org" }, "rider")).toBeNull();
  });

  it("is deleted whole when its time is up, every account it made included", async () => {
    await admin.query(
      `update demo_workspaces set expires_at = now() - interval '1 minute' where organization_id = $1`,
      [orgId],
    );
    expect(await cleanupExpiredDemos()).toBe(1);
    const org = await admin.query(`select 1 from organizations where id = $1`, [orgId]);
    const user = await admin.query(`select 1 from users where id = $1`, [userId]);
    const rows = await admin.query(`select 1 from riders where org_id = $1`, [orgId]);
    expect([org.rowCount, user.rowCount, rows.rowCount]).toEqual([0, 0, 0]);
    const room = await admin.query(`select 1 from community_threads where demo_org_id = $1`, [
      orgId,
    ]);
    expect(room.rowCount).toBe(0);
    const left = await admin.query(`select count(*)::int as n from users where id = any($1)`, [
      people,
    ]);
    expect(left.rows[0].n).toBe(0);
  });
});
