import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { createGroupSessions, scheduleTemplate } from "@/modules/training/group";
import { deleteSession, listSessions, updateSession } from "@/modules/training/sessions";
import { createTemplate } from "@/modules/training/templates";
import type { StrengthStructure } from "@/modules/workouts/structure";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * "Gentag" (ADR 0041) with the people who use it: a coach puts the same
 * session on Tuesdays and Thursdays for two riders, a programme counts on
 * through the series, a change or a deletion takes this day and the
 * coming ones but never one already done — and a rider reaches only
 * their own copies.
 */

const ORG = "org_series";
const COACH = { orgId: ORG, userId: "user_series_coach" };
const ELLA = { orgId: ORG, userId: "user_series_ella" };
const RIDERS = ["sr_ella", "sr_jon"];
const TUE_THU = { weekdays: [2, 4], until: "2026-11-26" };

const bike = {
  kind: "bike" as const,
  steps: [
    {
      kind: "step" as const,
      intent: "steady" as const,
      seconds: 3600,
      target: { kind: "zone" as const, zone: 2 },
    },
  ],
};
const input = (title: string) => ({
  onDate: "2026-11-03",
  sport: "bike" as const,
  title,
  description: "",
  structure: bike,
  plannedMinutes: 0,
  plannedKm: null,
  templateId: null,
});

let admin: Pool;

async function insert(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, { org_id: ORG, ...values });
  await admin.query(q.text, q.values);
}

async function sessionsOf(riderIds: string[], title?: string) {
  const all = await listSessions(COACH, { from: "2026-11-01", to: "2026-12-31", riderIds });
  return title ? all.filter((s) => s.title === title) : all;
}

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await seedPerson(admin, ORG, ELLA.userId, "member");
  await insert("riders", { id: "sr_ella", user_id: ELLA.userId, name: "Ella", birth_year: 2010 });
  await insert("riders", { id: "sr_jon", name: "Jon", birth_year: 2010 });
});

afterAll(async () => {
  await admin.end();
});

describe("a series", () => {
  it("puts the session on every chosen weekday, a group per day, one series over all", async () => {
    const { ids } = await createGroupSessions(COACH, RIDERS, input("Tempo"), TUE_THU);
    expect(ids).toHaveLength(8 * 2);
    const made = await sessionsOf(RIDERS, "Tempo");
    expect(new Set(made.map((s) => s.seriesKey)).size).toBe(1);
    expect(made[0]!.seriesKey).not.toBeNull();
    expect(new Set(made.map((s) => s.groupKey)).size).toBe(8);
    for (const day of new Set(made.map((s) => s.onDate)))
      expect(new Set(made.filter((s) => s.onDate === day).map((s) => s.groupKey)).size).toBe(1);
    expect([...new Set(made.map((s) => s.onDate))].sort()).toEqual([
      "2026-11-03",
      "2026-11-05",
      "2026-11-10",
      "2026-11-12",
      "2026-11-17",
      "2026-11-19",
      "2026-11-24",
      "2026-11-26",
    ]);
  });

  it("counts a strength programme on, session by session, for each rider", async () => {
    const structure: StrengthStructure = {
      kind: "strength",
      warmup: "",
      minutes: 60,
      exercises: [{ name: "Benpres", group: "legs", sets: 3, reps: "16", load: "", note: "" }],
      progression: [{ group: "legs", from: 1, to: null, sets: 3, reps: "16", load: "" }],
    };
    const { id } = await createTemplate(COACH, {
      name: "Styrke",
      sport: "strength",
      description: "",
      structure,
      plannedMinutes: 0,
    });
    // Jon has had one session of it already; Ella none.
    await scheduleTemplate(COACH, id, ["sr_jon"], "2026-11-02");
    await scheduleTemplate(COACH, id, RIDERS, "2026-11-03", TUE_THU);
    const numbers = (rider: string) =>
      sessionsOf([rider], "Styrke").then((list) => list.map((s) => s.programmeSession));
    expect(await numbers("sr_ella")).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(await numbers("sr_jon")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("refuses a series that ends before it starts, or one a rider lays on a teammate", async () => {
    await expect(
      createGroupSessions(COACH, RIDERS, input("x"), { weekdays: [2], until: "2026-11-01" }),
    ).rejects.toMatchObject({ code: "invalid", detail: "repeatOrder" });
    await expect(createGroupSessions(ELLA, RIDERS, input("x"), TUE_THU)).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(createGroupSessions(ELLA, ["sr_jon"], input("x"), TUE_THU)).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});

describe("a change to a series", () => {
  it("reaches this day and the coming ones, never one already done", async () => {
    const ella = await sessionsOf(["sr_ella"], "Tempo");
    // Ella rode the second Tuesday; it stays as it was.
    await insert("activities", {
      id: "sr_ride",
      rider_id: "sr_ella",
      started_at: new Date("2026-11-17T15:00:00Z"),
      on_date: "2026-11-17",
      sport: "bike",
      moving_seconds: 3600,
      source: "manual",
    });
    await admin.query("update planned_sessions set activity_id = 'sr_ride' where id = $1", [
      ella.find((s) => s.onDate === "2026-11-17")!.id,
    ]);
    const from = ella.find((s) => s.onDate === "2026-11-12")!;
    const changed = await updateSession(COACH, from.id, { ...input("Tærskel") }, "series");
    // From the 12th: the 12th, 17th, 19th, 24th and 26th for Jon; the same for Ella but the
    // 17th, which was ridden.
    expect(changed).toBe(4 * 2 + 1);
    const titles = (await sessionsOf(RIDERS)).filter((s) => s.seriesKey === from.seriesKey);
    expect(
      titles
        .filter((s) => s.title === "Tempo")
        .map((s) => `${s.riderId} ${s.onDate}`)
        .sort(),
    ).toEqual([
      "sr_ella 2026-11-03",
      "sr_ella 2026-11-05",
      "sr_ella 2026-11-10",
      "sr_ella 2026-11-17",
      "sr_jon 2026-11-03",
      "sr_jon 2026-11-05",
      "sr_jon 2026-11-10",
    ]);
  });

  it("lets a rider delete their own coming copies, and none of a teammate's", async () => {
    const ella = await sessionsOf(["sr_ella"], "Tærskel");
    const from = ella.find((s) => s.onDate === "2026-11-19")!;
    expect(await deleteSession(ELLA, from.id, "series")).toBe(3);
    expect((await sessionsOf(["sr_ella"], "Tærskel")).map((s) => s.onDate)).toEqual(["2026-11-12"]);
    expect((await sessionsOf(["sr_jon"], "Tærskel")).map((s) => s.onDate)).toEqual([
      "2026-11-12",
      "2026-11-17",
      "2026-11-19",
      "2026-11-24",
      "2026-11-26",
    ]);
  });
});
