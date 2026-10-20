import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { platformOverview } from "@/core/admin/overview";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import { lastFullWeek } from "@/modules/insight/pilot-numbers";
import { getPilotWeeks, PILOT_WEEKS } from "@/modules/insight/pilot-service";
import { createSession } from "@/modules/training/sessions";
import { SessionInput } from "@/modules/training/vocabulary";
import { adminPool, appClient, asApp } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Pilotens tre tal through the database (docs/adr/0066): the coaches read
 * their own team's weeks under the ordinary policies, nobody else on the
 * team reads them, another team's rows never count, and the installation's
 * owner gets the same numbers for the last full week from
 * platform_overview() (drizzle/0031) — counts, never a name.
 */

const ORG = "org_pilot";
const OTHER = "org_pilot_other";
const COACH = { orgId: ORG, userId: "user_pilot_coach" };
const COACH2 = { orgId: ORG, userId: "user_pilot_coach2" };
const RIDER = { orgId: ORG, userId: "user_pilot_rider" };
const PARENT = { orgId: ORG, userId: "user_pilot_parent" };
const OTHER_COACH = { orgId: OTHER, userId: "user_pilot_other" };
const OWNER = "user_pilot_owner";

const today = todayInCopenhagen();
const week = lastFullWeek(today);
const day = (n: number) => addDaysIso(week, n);
/** 10:00 UTC is 11:00 or 12:00 in Copenhagen: the same day either way. */
const at = (n: number, clock = "10:00:00") => `${day(n)}T${clock}Z`;
const longAgo = `${addDaysIso(week, -60)}T10:00:00Z`;

let admin: Pool;
let app: Client;

async function seed(orgId: string, table: string, values: Record<string, unknown>) {
  const q = insertSql(table, { org_id: orgId, ...values });
  await admin.query(q.text, q.values);
}

async function rider(orgId: string, id: string, extra: Record<string, unknown> = {}) {
  await seed(orgId, "riders", { id, name: `Hemmelig ${id}`, birth_year: 2009, ...extra });
}

async function checkins(orgId: string, riderId: string, n: number) {
  for (let i = 0; i < n; i++) await seed(orgId, "checkins", { rider_id: riderId, on_date: day(i) });
}

async function session(orgId: string, riderId: string, n: number, done: boolean) {
  const activityId = done ? `act_${riderId}_${n}` : null;
  if (activityId)
    await seed(orgId, "activities", {
      id: activityId,
      rider_id: riderId,
      started_at: at(n),
      on_date: day(n),
      sport: "bike",
      moving_seconds: 3600,
      source: "manual",
    });
  await seed(orgId, "planned_sessions", {
    rider_id: riderId,
    on_date: day(n),
    sport: "bike",
    title: "Grundtur",
    activity_id: activityId,
  });
}

/** An audit row as the trigger writes one, at a moment of the test's choosing. */
async function edit(orgId: string, actor: string | null, iso: string, entity = "planned_sessions") {
  await admin.query(
    `insert into audit_log (org_id, actor_user_id, actor_type, action, entity_type, entity_id, created_at)
     values ($1, $2, $3, $4, $5, 'x', $6)`,
    [orgId, actor, actor ? "user" : "system", `${entity}.insert`, entity, iso],
  );
}

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner", "Pilotholdet");
  await seedPerson(admin, ORG, COACH2.userId, "admin");
  await seedPerson(admin, ORG, RIDER.userId, "member");
  await seedPerson(admin, ORG, PARENT.userId, "member");
  await seedPerson(admin, OTHER, OTHER_COACH.userId, "owner", "Et andet hold");
  await admin.query(
    `insert into users (id, name, email, platform_role) values ($1, $1, $2, 'owner') on conflict do nothing`,
    [OWNER, `${OWNER}@example.com`],
  );

  // Three riders on the team all week, one archived, one who came on Wednesday.
  await rider(ORG, "pr1", { user_id: RIDER.userId, created_at: longAgo });
  await rider(ORG, "pr2", { created_at: longAgo });
  await rider(ORG, "pr3", { created_at: longAgo });
  await rider(ORG, "pr_gone", { created_at: longAgo, archived: true });
  await rider(ORG, "pr_new", { created_at: at(2) });
  await seed(ORG, "guardians", {
    rider_id: "pr1",
    user_id: PARENT.userId,
    name: "Forælder",
    confirmed_at: longAgo,
  });

  await checkins(ORG, "pr1", 5);
  await checkins(ORG, "pr2", 3);
  await checkins(ORG, "pr_gone", 7);
  await checkins(ORG, "pr_new", 5);

  await session(ORG, "pr1", 0, true);
  await session(ORG, "pr1", 2, true);
  await session(ORG, "pr1", 4, false);
  await session(ORG, "pr2", 1, false);
  await session(ORG, "pr2", 5, false);
  await session(ORG, "pr_gone", 1, true);
  await session(ORG, "pr_new", 3, true);

  // The first coach: 16:00–16:12 in one stretch, and one save on Thursday.
  await edit(ORG, COACH.userId, at(1, "16:00:00"));
  await edit(ORG, COACH.userId, at(1, "16:05:00"), "training_blocks");
  await edit(ORG, COACH.userId, at(1, "16:12:00"), "training_block_items");
  await edit(ORG, COACH.userId, at(3, "18:00:00"), "season_plans");
  // The second coach: two saves half an hour apart, two minutes each.
  await edit(ORG, COACH2.userId, at(2, "09:00:00"));
  await edit(ORG, COACH2.userId, at(2, "09:30:00"));
  // Not planning: a rider's change, a coach's check-in, the system.
  await edit(ORG, RIDER.userId, at(1, "16:20:00"));
  await edit(ORG, COACH.userId, at(1, "16:25:00"), "checkins");
  await edit(ORG, null, at(1, "16:30:00"));

  // Another team, planning the same week.
  await rider(OTHER, "po1", { created_at: longAgo });
  await checkins(OTHER, "po1", 7);
  await edit(OTHER, OTHER_COACH.userId, at(1, "16:03:00"));
});

afterAll(async () => {
  await app?.end();
  await admin?.end();
});

const expected = { riders: 3, checkedIn: 1, sessions: 5, receipts: 2, minutes: 12 + 2 + 2 + 2 };

describe("the coaches' card", () => {
  it("shows the last eight weeks, this one first and still going", async () => {
    const weeks = await getPilotWeeks(COACH);
    expect(weeks).toHaveLength(PILOT_WEEKS);
    expect(weeks![0]!.inProgress).toBe(true);
    expect(weeks![1]).toEqual({ monday: week, inProgress: false, ...expected });
    expect(await getPilotWeeks(COACH2)).toEqual(weeks);
  });

  it("is nobody's but the coaches'", async () => {
    expect(await getPilotWeeks(RIDER)).toBeNull();
    expect(await getPilotWeeks(PARENT)).toBeNull();
    expect(await getPilotWeeks({ orgId: ORG, userId: OTHER_COACH.userId })).toBeNull();
  });

  it("counts another team's coach only on their own team", async () => {
    const weeks = await getPilotWeeks(OTHER_COACH);
    expect(weeks![1]).toMatchObject({ riders: 1, checkedIn: 1, sessions: 0, minutes: 2 });
    const seen = await asApp(app, OTHER_COACH, (c) =>
      c.query(`select count(*)::int as n from audit_log where org_id = $1`, [ORG]),
    );
    expect(seen.rows[0].n).toBe(0);
  });

  it("counts a real save through the services as planning", async () => {
    expect((await getPilotWeeks(COACH))![0]!.minutes).toBe(0);
    await createSession(
      COACH,
      SessionInput.parse({
        riderId: "pr3",
        onDate: today,
        sport: "bike",
        title: "Intervaller",
        structure: { kind: "bike", steps: [] },
      }),
    );
    // One save is one stretch, and a stretch counts at least two minutes.
    expect((await getPilotWeeks(COACH))![0]!.minutes).toBe(2);
  });
});

describe("the installation's overview", () => {
  it("gives the owner the same numbers for the last full week, and no name", async () => {
    const clubs = await platformOverview(OWNER);
    const club = clubs!.find((c) => c.orgId === ORG)!;
    expect(club.pilot).toEqual({ week, ...expected });
    const card = (await getPilotWeeks(COACH))![1]!;
    expect(club.pilot).toEqual({
      week: card.monday,
      riders: card.riders,
      checkedIn: card.checkedIn,
      sessions: card.sessions,
      receipts: card.receipts,
      minutes: card.minutes,
    });
    expect(clubs!.find((c) => c.orgId === OTHER)!.pilot).toMatchObject({ riders: 1, minutes: 2 });
    // Only this file's own clubs: other suites share the test database and
    // may name a team anything; what must hold is that these rows carry no
    // person's name or id, whichever order the files run in.
    const ours = clubs!.filter((c) => c.orgId === ORG || c.orgId === OTHER);
    expect(ours).toHaveLength(2);
    expect(JSON.stringify(ours)).not.toMatch(/Hemmelig|Forælder|pr1|user_pilot/);
  });
});
