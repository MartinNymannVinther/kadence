import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import pg, { type Pool } from "pg";
import { withOrgContext } from "@/core/db/tenant";
import { monthHours } from "@/modules/dcu";
import { riderMonth, teamMonth } from "@/modules/calendar/month-data";
import { riderSeason, teamSeason } from "@/modules/calendar/season-data";
import { bikeTotalsIn } from "@/modules/season/bike-totals";
import { createSeasonPlan, getSeasonPlan } from "@/modules/season/plans";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * What the calendar's month and season read (docs/adr/0093): the bike
 * hours and sessions summed in the database by rider and month or week,
 * under RLS — a rider never gets a teammate's hours, a parent only the
 * child who confirmed them — and a fixed number of queries whatever the
 * size of the team.
 */

const ORG = "org_calmonth";
const COACH = { orgId: ORG, userId: "user_calmonth_coach" };
const ASTRID = { orgId: ORG, userId: "user_calmonth_astrid" };
const PARENT = { orgId: ORG, userId: "user_calmonth_parent" };
const PENDING = { orgId: ORG, userId: "user_calmonth_pending" };
const TODAY = "2026-11-12";
const SEASON = 2026;
const BIG = Array.from({ length: 20 }, (_, i) => `calm_big_${i}`);

let admin: Pool;

async function insert(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, { org_id: ORG, ...values });
  await admin.query(q.text, q.values);
}

async function session(
  rider: string,
  onDate: string,
  sport: string,
  minutes: number,
  ride?: number,
) {
  const activityId = ride !== undefined ? `act_${rider}_${onDate}_${sport}` : null;
  if (activityId)
    await insert("activities", {
      id: activityId,
      rider_id: rider,
      started_at: new Date(`${onDate}T15:00:00Z`),
      on_date: onDate,
      sport,
      moving_seconds: ride! * 60,
      source: "manual",
    });
  await insert("planned_sessions", {
    rider_id: rider,
    on_date: onDate,
    sport,
    title: "Pas",
    planned_minutes: minutes,
    activity_id: activityId,
  });
}

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [ASTRID, PARENT, PENDING]) await seedPerson(admin, ORG, p.userId, "member");
  await insert("riders", {
    id: "calm_astrid",
    user_id: ASTRID.userId,
    name: "Astrid",
    birth_year: 2010,
  });
  await insert("riders", { id: "calm_bo", name: "Bo", birth_year: 2010 });
  await insert("guardians", {
    id: "calm_g1",
    rider_id: "calm_astrid",
    user_id: PARENT.userId,
    name: "Forælder",
    confirmed_at: new Date(),
  });
  await insert("guardians", {
    id: "calm_g2",
    rider_id: "calm_bo",
    user_id: PENDING.userId,
    name: "Venter",
  });
  // Astrid: October ridden as planned, November half done and one ahead, a ride without a plan.
  await session("calm_astrid", "2026-10-05", "bike", 120, 120);
  await session("calm_astrid", "2026-10-07", "strength", 60, 60);
  await session("calm_astrid", "2026-11-02", "bike", 90, 60);
  await session("calm_astrid", "2026-11-04", "bike", 60);
  await session("calm_astrid", "2026-11-20", "bike", 180);
  await insert("activities", {
    rider_id: "calm_astrid",
    started_at: new Date("2026-11-08T09:00:00Z"),
    on_date: "2026-11-08",
    sport: "bike",
    moving_seconds: 90 * 60,
    source: "manual",
  });
  // Bo, a teammate: hours that must never show up in Astrid's.
  await session("calm_bo", "2026-11-03", "bike", 300, 300);
  await insert("calendar_events", {
    rider_id: null,
    kind: "race",
    title: "Holdløb",
    starts_on: "2026-11-07",
    ends_on: "2026-11-07",
  });
  await insert("calendar_events", {
    rider_id: "calm_bo",
    kind: "camp",
    title: "Bos lejr",
    starts_on: "2026-12-27",
    ends_on: "2026-12-30",
  });
  await createSeasonPlan(COACH, "calm_astrid", SEASON, "U17-2");
  for (const id of BIG) await insert("riders", { id, name: id, birth_year: 2009 });
  for (const id of BIG.slice(0, 5)) await session(id, "2026-11-05", "bike", 60, 55);
});

afterAll(async () => {
  await admin.end();
});

describe("bike totals", () => {
  it("sum bike hours by rider and month in the database, sessions of every sport counted", async () => {
    const rows = await withOrgContext(COACH, (tx) =>
      bikeTotalsIn(
        tx,
        ["calm_astrid", "calm_bo"],
        { from: "2026-10-01", to: "2027-09-30" },
        "month",
        TODAY,
      ),
    );
    const astrid = rows.filter((r) => r.riderId === "calm_astrid");
    expect(astrid.map((r) => r.key)).toEqual(["2026-10", "2026-11"]);
    expect(astrid[0]).toMatchObject({
      plannedMinutes: 120,
      doneSeconds: 120 * 60,
      sessions: 2,
      sessionsDone: 2,
    });
    // 60 ridden on the 2nd and 90 without a plan; 180 still ahead, the 4th missed.
    expect(astrid[1]).toMatchObject({
      plannedMinutes: 330,
      doneSeconds: 150 * 60,
      aheadMinutes: 180,
      sessions: 3,
      sessionsDone: 1,
    });
    expect(rows.find((r) => r.riderId === "calm_bo")).toMatchObject({
      key: "2026-11",
      doneSeconds: 300 * 60,
    });
  });

  it("sum by ISO week, Monday first", async () => {
    const rows = await withOrgContext(COACH, (tx) =>
      bikeTotalsIn(tx, ["calm_astrid"], { from: "2026-10-26", to: "2026-12-06" }, "week", TODAY),
    );
    expect(rows.map((r) => r.key)).toEqual(["2026-11-02", "2026-11-16"]);
    expect(rows[0]!.doneSeconds).toBe(150 * 60);
  });

  it("give a rider their own and never a teammate's", async () => {
    const rows = await withOrgContext(ASTRID, (tx) =>
      bikeTotalsIn(
        tx,
        ["calm_astrid", "calm_bo"],
        { from: "2026-10-01", to: "2027-09-30" },
        "month",
        TODAY,
      ),
    );
    expect(new Set(rows.map((r) => r.riderId))).toEqual(new Set(["calm_astrid"]));
  });
});

describe("the season", () => {
  it("reads one rider's twelve months against the plan, and the season so far", async () => {
    const { months, soFar } = await riderSeason(COACH, "calm_astrid", SEASON, TODAY);
    expect(months.map((m) => m.month)).toEqual([
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
      "2027-04",
      "2027-05",
      "2027-06",
      "2027-07",
      "2027-08",
      "2027-09",
    ]);
    const plan = (await getSeasonPlan(COACH, "calm_astrid", SEASON))!;
    expect(months[1]!.volume.goal).toBeCloseTo(plan.months.find((m) => m.month === 11)!.hours, 9);
    expect(months[1]!.volume.dcu?.target).toBeCloseTo(monthHours("U17-2", 11), 9);
    expect(months[1]!.volume.done).toBeCloseTo(2.5, 9);
    expect(months[1]!.sessions).toBe(3);
    // October is DCU's break, so it stands against nothing; November is heading under the plan.
    expect(months[0]!.standing).toBeNull();
    expect(months[1]!.standing).toBe("under");
    expect(months[2]!.standing).toBeNull();
    expect(soFar!.done).toBeCloseTo(4.5, 9);
    expect(soFar!.goalSeason).toBeCloseTo(
      plan.months.reduce((s, m) => s + m.hours, 0),
      9,
    );
  });

  it("gives the coach the team's riders by month and the team's races", async () => {
    const { months, races } = await teamSeason(COACH, ["calm_astrid", "calm_bo"], SEASON, TODAY);
    expect(months.get("calm_bo")![1]!.volume.done).toBeCloseTo(5, 9);
    expect(races.map((r) => r.title)).toEqual(["Holdløb"]);
  });

  it("gives a rider and a parent only the rider who is theirs", async () => {
    for (const who of [ASTRID, PARENT]) {
      const { months } = await teamSeason(who, ["calm_astrid", "calm_bo"], SEASON, TODAY);
      expect([...months.keys()]).toEqual(["calm_astrid"]);
      expect(await riderSeason(who, "calm_bo", SEASON, TODAY)).toMatchObject({
        months: [],
        soFar: null,
      });
    }
    // A parent whose link is not confirmed sees nothing, not even a camp.
    const pending = await riderSeason(PENDING, "calm_bo", SEASON, TODAY);
    expect(pending).toMatchObject({ months: [], soFar: null });
    expect(pending.events.map((e) => e.title)).not.toContain("Bos lejr");
  });
});

describe("the month", () => {
  it("reads one rider's grid with each week's hours and the month's", async () => {
    const read = await riderMonth(COACH, "calm_astrid", "2026-11", TODAY);
    expect(read.sessions.map((s) => s.onDate)).toEqual(["2026-11-02", "2026-11-04", "2026-11-20"]);
    expect(read.unplanned.map((a) => a.onDate)).toEqual(["2026-11-08"]);
    expect(read.events.map((e) => e.title)).toEqual(["Holdløb"]);
    expect([...read.weeks.keys()]).toHaveLength(6);
    expect(read.weeks.get("2026-11-02")!.done).toBeCloseTo(2.5, 9);
    expect(read.weeks.get("2026-11-02")!.dcu).not.toBeNull();
    expect(read.month!.planned).toBeCloseTo(5.5, 9);
  });

  it("gives the coach every rider's month, and a rider only their own", async () => {
    const coach = await teamMonth(COACH, ["calm_astrid", "calm_bo"], "2026-11", TODAY);
    expect(coach.volumes.get("calm_bo")!.done).toBeCloseTo(5, 9);
    const own = await teamMonth(ASTRID, ["calm_astrid", "calm_bo"], "2026-11", TODAY);
    expect([...own.volumes.keys()]).toEqual(["calm_astrid"]);
    expect(own.sessions.every((s) => s.riderId === "calm_astrid")).toBe(true);
    const parent = await riderMonth(PARENT, "calm_bo", "2026-11", TODAY);
    expect(parent.sessions).toEqual([]);
    expect(parent.month).toBeNull();
  });
});

describe("the number of queries", () => {
  async function counted(run: () => Promise<unknown>): Promise<number> {
    const spy = vi.spyOn(pg.Client.prototype, "query");
    try {
      await run();
      return spy.mock.calls.length;
    } finally {
      spy.mockRestore();
    }
  }

  it("is the same for a team of two and of twenty, a month and a season alike", async () => {
    const twenty = [...BIG];
    const month = {
      two: await counted(() => teamMonth(COACH, twenty.slice(0, 2), "2026-11", TODAY)),
      twenty: await counted(() => teamMonth(COACH, twenty, "2026-11", TODAY)),
    };
    const season = {
      two: await counted(() => teamSeason(COACH, twenty.slice(0, 2), SEASON, TODAY)),
      twenty: await counted(() => teamSeason(COACH, twenty, SEASON, TODAY)),
    };
    const rider = {
      month: await counted(() => riderMonth(COACH, "calm_astrid", "2026-11", TODAY)),
      season: await counted(() => riderSeason(COACH, "calm_astrid", SEASON, TODAY)),
    };
    // Begin, set_config, the reads, commit: seven reads for the team's month (sessions, rides,
    // events, riders, plans, the team's paradigm, the hours), five for a season, eight and five
    // for one rider (a month's weeks and the month are summed separately).
    expect(month).toEqual({ two: 10, twenty: 10 });
    expect(season).toEqual({ two: 8, twenty: 8 });
    expect(rider).toEqual({ month: 11, season: 8 });
  });
});
