import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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
import { getRiders } from "@/modules/team/riders";
import { recentRides } from "@/modules/today/recent-rides";
import { hasRidesForProposal, proposeThresholds } from "@/modules/training/threshold-proposal";
import { rideToRate } from "@/components/today/rpe-pick";
import { addDaysIso, mondayOf, todayInCopenhagen } from "@/core/dates";
import { listEvents } from "@/modules/training/events";
import { listOwnTemplates } from "@/modules/training/templates";
import { getWeekPlanDraft } from "@/modules/training/week-plan-draft";
import { whoAmI } from "@/modules/team/access";
import { listLinkableMembers } from "@/modules/team/member-guardians";
import { getPilotWeeks } from "@/modules/insight/pilot-service";
import { listRiderNews } from "@/modules/team/news";
import { adminPool } from "../helpers/db";

/**
 * The demo, built through the ordinary sign-up path: a real workspace, a
 * throwaway account, and a date it stops existing. The suite runs with
 * DEMO=on (see the test environment); the shipped default is off and
 * proven in tests/core/env. A demo opens on a seeded portfolio, written
 * through the ordinary services (src/modules/demo/seed.ts), with a rider
 * and a parent beside the coach so the visitor can see all three roles
 * (src/modules/demo/roles.ts). The demo follows the installation's flags
 * (docs/adr/0057): built here once with them off, as a new installation
 * has them, and once with the championship and the room on.
 */

const on = vi.hoisted(() => new Set<string>());
vi.mock("@/core/features", async (importOriginal) =>
  (await import("../helpers/features")).featuresWith(await importOriginal(), on),
);

/** The newest demo's workspace and account. */
async function newestDemo(admin: Pool): Promise<{ orgId: string; userId: string }> {
  const row = await admin.query(
    `select organization_id, user_id from demo_workspaces order by created_at desc limit 1`,
  );
  return { orgId: row.rows[0].organization_id, userId: row.rows[0].user_id };
}

let admin: Pool;
let orgId: string;
let userId: string;
let people: string[] = [];

beforeAll(async () => {
  admin = adminPool();
  // A demo opens only on an installation somebody owns (backlog P1-09).
  await admin.query(
    `insert into users (id, name, email, email_verified, platform_role)
     values ('user_demo_suite_owner', 'Ejer', 'demo-suite-owner@example.org', false, 'owner')
     on conflict (id) do update set platform_role = 'owner'`,
  );
});

afterAll(async () => {
  await admin.query("delete from users where id = 'user_demo_suite_owner'");
  await admin.end();
});

describe("a demo workspace", () => {
  it("is created with a signed-in guest, a portfolio in it, and lands on the overview", async () => {
    const demo = await createDemoWorkspace("da");
    expect(demo).not.toBeNull();
    expect(demo!.headers.get("cookie")).toMatch(/better-auth/);
    ({ orgId, userId } = await newestDemo(admin));
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
    expect(seeded.rows[0].checkins).toBe(6 * 42);
    expect(seeded.rows[0].dcu).toBe(3);
  });

  it("shows the product and leaves out what the installation has parked", async () => {
    const coach = { orgId, userId };
    const settings = await getTeamSettings(coach);
    expect(settings).toMatchObject({ clubChampionship: false, lowIntensityFirst: true });
    const images = await admin.query(
      `select kind from org_images where org_id = $1 order by kind`,
      [orgId],
    );
    expect(images.rows.map((r) => r.kind)).toEqual(["cover", "logo"]);
    expect((await listOwnTemplates(coach)).map((t) => t.riderName)).toEqual(["Emma Holm"]);

    const parked = await admin.query(
      `select (select count(*)::int from club_championships where org_id = $1) as championships,
              (select count(*)::int from club_champions where org_id = $1) as champions,
              (select count(*)::int from community_threads where demo_org_id = $1) as threads`,
      [orgId],
    );
    expect(parked.rows[0]).toEqual({ championships: 0, champions: 0, threads: 0 });
    expect(await listChampionships(coach)).toBeNull();
    expect(await listThreads(coach)).toEqual([]);
    expect(await unreadThreadCount(coach)).toBe(0);
  });

  it("has a ride from yesterday that Today asks the rider how hard it felt (ADR 0063)", async () => {
    const coach = { orgId, userId };
    const today = todayInCopenhagen();
    const emma = (await getRiders(coach)).find((r) => r.name === "Emma Holm")!;
    const rides = await recentRides(coach, emma.id, { from: addDaysIso(today, -2), to: today });
    const asked = rideToRate(rides, today);
    expect(asked).not.toBeNull();
    expect(asked).toMatchObject({ onDate: addDaysIso(today, -1), rpe: null, sport: "bike" });
  });

  it("shows no ride from Garmin and no Garmin link, since its rides are made up (ADR 0110)", async () => {
    const { rows } = await admin.query(
      `select (select count(*)::int from activities where org_id = $1 and (source = 'garmin' or device_name is not null)) as rides,
              (select count(*)::int from device_links where org_id = $1) as links`,
      [orgId],
    );
    expect(rows[0]).toEqual({ rides: 0, links: 0 });
  });

  it("proposes thresholds from a rider's rides that sit near her own (ADR 0094)", async () => {
    const coach = { orgId, userId };
    const emma = (await getRiders(coach)).find((r) => r.name === "Emma Holm")!;
    expect(await hasRidesForProposal(coach, emma.id)).toBe(true);
    const { estimates, read } = await proposeThresholds(coach, emma.id);
    // The demo's rides are a few weeks of training at Emma's own FTP (225 W) and
    // threshold pulse (176), with no all-out 20 minutes: the proposal stays under
    // them, says it is not sure, and reads the pulse of a few rides only.
    const ftp = estimates.ftpWatts;
    expect(ftp.value).toBeGreaterThanOrEqual(225 * 0.75);
    expect(ftp.value).toBeLessThanOrEqual(225 * 1.05);
    expect(ftp.confidence).not.toBe("high");
    expect(ftp.sources.length).toBeGreaterThan(0);
    if (estimates.thresholdHr.value === null)
      expect(estimates.thresholdHr.missing).toBe("noHardHeartRate");
    else expect(Math.abs(estimates.thresholdHr.value - 176)).toBeLessThanOrEqual(18);
    expect(estimates.maxHr.missing).toBe("notAboveCurrent");
    expect(estimates.restingHr.missing).toBe("noMeasurement");
    expect(read.streams).toBeLessThanOrEqual(18);
    expect(read.streams).toBeLessThan(read.rides);
  });

  it("meets at the clubhouse for the rides the team does together (ADR 0058)", async () => {
    const placed = await admin.query(
      `select count(*)::int as n from planned_sessions
        where org_id = $1 and start_time is not null and meeting_place = 'Klubhuset'`,
      [orgId],
    );
    expect(placed.rows[0].n).toBeGreaterThan(0);
  });

  it("says when and where the season opener starts, and who drives (backlog P2-03)", async () => {
    const race = await admin.query(
      `select start_time, meeting_place, transport_note from calendar_events
        where org_id = $1 and kind = 'race' and start_time is not null`,
      [orgId],
    );
    expect(race.rows).toHaveLength(1);
    expect(race.rows[0]).toMatchObject({
      start_time: "09:30:00",
      meeting_place: "Hillerød Stadion",
    });
    expect(race.rows[0].transport_note).toMatch(/^Klubbens bus/);
  });

  it("holds a session the coach built in the planner itself, not the library (ADR 0059)", async () => {
    const own = await admin.query(
      `select tbi.sport, tbi.title, tbi.start_time, tbi.meeting_place
         from training_block_items tbi
         join training_blocks tb on tb.id = tbi.block_id
        where tb.org_id = $1 and tb.name = 'Vinterblok, 4 uger' and tbi.template_id is null`,
      [orgId],
    );
    expect(own.rows).toHaveLength(1);
    expect(own.rows[0]).toMatchObject({
      sport: "bike",
      title: "Teknik og sving",
      start_time: "16:00:00",
    });
    expect(own.rows[0].meeting_place.length).toBeGreaterThan(0);
  });

  it("has a programme Emma laid into her own calendar herself (ADR 0078)", async () => {
    const { orgId, userId } = await newestDemo(admin);
    const emma = (await getRiders({ orgId, userId })).find((r) => r.name === "Emma Holm")!;
    const session = await admin.query(
      `select sport, title from planned_sessions
        where org_id = $1 and rider_id = $2 and on_date = $3 and sport = 'strength'`,
      [orgId, emma.id, addDaysIso(todayInCopenhagen(), 2)],
    );
    expect(session.rows.map((r) => r.title)).toContain("Bevægelighed hele dagen");
  });

  it("has the team's own drawn exercise, mixed into a programme laid into today's calendar (ADR 0067)", async () => {
    const exercises = await admin.query(`select name, pose from team_exercises where org_id = $1`, [
      orgId,
    ]);
    expect(exercises.rows).toHaveLength(1);
    expect(exercises.rows[0].name).toBe("Rygstræk på bænk");
    expect(exercises.rows[0].pose.joints.head).toBeDefined();

    const programs = await admin.query(
      `select id, name, parts from team_programs where org_id = $1`,
      [orgId],
    );
    expect(programs.rows).toHaveLength(1);
    expect(programs.rows[0].name).toBe("Holdets mobilitet efter fællestræning");
    const refs: string[] = programs.rows[0].parts.flatMap((p: { items: { exercise: string }[] }) =>
      p.items.map((i) => i.exercise),
    );
    expect(refs.some((r) => r.startsWith("builtin:"))).toBe(true);
    expect(refs.some((r) => r.startsWith("team:"))).toBe(true);

    const emma = (await getRiders({ orgId, userId })).find((r) => r.name === "Emma Holm")!;
    const session = await admin.query(
      `select structure from planned_sessions
        where org_id = $1 and rider_id = $2 and title = $3`,
      [orgId, emma.id, programs.rows[0].name],
    );
    expect(session.rows).toHaveLength(1);
    const refsInSession: Array<string | undefined> = session.rows[0].structure.exercises.map(
      (e: { ref?: string }) => e.ref,
    );
    expect(refsInSession.some((r) => r?.startsWith("builtin:"))).toBe(true);
    expect(refsInSession.some((r) => r?.startsWith("team:"))).toBe(true);
  });

  it("has the week after next half planned, as the coaches' shared draft (ADR 0043)", async () => {
    const monday = addDaysIso(mondayOf(todayInCopenhagen()), 14);
    const draft = await getWeekPlanDraft({ orgId, userId }, { monday, scope: "team" });
    expect(draft?.by.me).toBe(true);
    expect(draft?.payload.riderIds).toHaveLength(6);
    expect(draft?.payload.items.map((i) => [i.day, i.startTime, i.meetingPlace])).toEqual([
      [1, "17:30", "Klubhuset"],
      [5, "09:00", "Klubhuset"],
    ]);
    const laidIn = await admin.query(
      `select count(*)::int as n from planned_sessions
        where org_id = $1 and on_date between $2 and $3`,
      [orgId, monday, addDaysIso(monday, 6)],
    );
    expect(laidIn.rows[0].n).toBe(0);
  });

  it("shows the coach the team's three numbers over the weeks it has planned (ADR 0066)", async () => {
    const weeks = (await getPilotWeeks({ orgId, userId }))!;
    expect(weeks).toHaveLength(8);
    // The last full week: six riders who all checked in, most sessions done.
    expect(weeks[1]).toMatchObject({ inProgress: false, riders: 6, checkedIn: 6 });
    expect(weeks[1]!.receipts).toBeGreaterThan(weeks[1]!.sessions / 2);
    // The riders have been on the team since the first planned week, not before.
    expect(weeks[6]!.riders).toBe(6);
    expect(weeks[7]!.riders).toBe(0);
    // The seeding is this week's planning; no older audit row is made up.
    expect(weeks[0]!.minutes).toBeGreaterThanOrEqual(2);
    expect(weeks.slice(1).every((w) => w.minutes === 0)).toBe(true);
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

    // The parent's holiday in Emma's calendar, seen by the coach as a parent's (ADR 0069).
    const ahead = addDaysIso(todayInCopenhagen(), 40);
    const events = await listEvents({ orgId, userId }, { from: todayInCopenhagen(), to: ahead });
    expect(events.filter((e) => e.fromParent)).toMatchObject([
      { kind: "holiday", title: "Efterårsferie i sommerhuset", createdBy: parent.userId },
    ]);
    // The coach can link her to a second child from that rider's page (backlog P2-16).
    const oskar = (await getRiders({ orgId, userId })).find((r) => r.name === "Oskar Lund")!;
    const members = await listLinkableMembers({ orgId, userId }, oskar.id);
    expect(members.find((m) => m.userId === parent.userId)?.parentOf).toEqual(["Emma Holm"]);

    const switched = await switchDemoRole({ userId, orgId }, "parent");
    expect(switched?.getSetCookie().join(";")).toMatch(/better-auth/);
    expect(await switchDemoRole({ userId: "someone-else", orgId }, "rider")).toBeNull();
    expect(await switchDemoRole({ userId, orgId: "another-org" }, "rider")).toBeNull();
  });

  it("shows the coach a rider's own comment and the check-in notes under Nyt fra rytterne", async () => {
    const news = await listRiderNews({ orgId, userId }, { today: todayInCopenhagen() });
    expect(news.filter((n) => n.kind === "comment")).toMatchObject([
      {
        riderName: "Emma Holm",
        on: "session",
        text: "Benene var tunge i starten, men det løsnede op efter en halv time.",
      },
    ]);
    expect(news.filter((n) => n.kind === "checkin").map((n) => n.text)).toEqual(
      expect.arrayContaining(["Tunge ben efter weekenden", "Knæet driller lidt"]),
    );
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
    // No trail either (ADR 0084): with DEMO=on it used to grow by a
    // demo's worth of rows for every visitor, forever.
    const trail = await admin.query(
      `select count(*)::int as n from audit_log
       where org_id = $1 or actor_user_id = any($2)
          or (entity_type = 'users' and entity_id = any($2))
          or before_data ->> 'user_id' = any($2) or after_data ->> 'user_id' = any($2)`,
      [orgId, [userId, ...people]],
    );
    expect(trail.rows[0].n).toBe(0);
  });
});

describe("a demo where the installation has the championship and the room on", () => {
  let coach: { orgId: string; userId: string };

  beforeAll(async () => {
    on.add("clubChampionship");
    on.add("coachesRoom");
    expect(await createDemoWorkspace("da")).not.toBeNull();
    coach = await newestDemo(admin);
  });

  afterAll(() => {
    on.clear();
  });

  it("turns the championship on and seeds its seasons and champions", async () => {
    expect(await getTeamSettings(coach)).toMatchObject({ clubChampionship: true });
    const championships = (await listChampionships(coach))!;
    expect(championships).toHaveLength(2);
    const latest = (await getChampionship(coach, championships[0]!.id))!;
    expect(latest.rounds).toHaveLength(3);
    expect(latest.improvement?.name).toBe("Freja Dahl");
    expect(latest.rounds.some((r) => r.entries.some((e) => e.record))).toBe(true);
    expect((await listChampions(coach)).length).toBeGreaterThanOrEqual(8);
  });

  it("fills its own Trænerrum with the example threads", async () => {
    const threads = (await listThreads(coach))!;
    expect(threads).toHaveLength(7);
    expect(new Set(threads.map((t) => t.category)).size).toBe(6);
    expect(threads.every((t) => t.authorName && t.clubName && t.unread)).toBe(true);
    expect(await unreadThreadCount(coach)).toBe(7);
    const inRoom = await admin.query(
      `select count(*)::int as n, count(workout)::int as w from community_threads where demo_org_id = $1`,
      [coach.orgId],
    );
    expect(inRoom.rows[0]).toEqual({ n: 7, w: 1 });
  });

  it("goes whole when its time is up", async () => {
    await admin.query(
      `update demo_workspaces set expires_at = now() - interval '1 minute' where organization_id = $1`,
      [coach.orgId],
    );
    expect(await cleanupExpiredDemos()).toBe(1);
    const room = await admin.query(`select 1 from community_threads where demo_org_id = $1`, [
      coach.orgId,
    ]);
    expect(room.rowCount).toBe(0);
  });
});
