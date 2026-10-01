import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { planCopy } from "@/modules/training/copy-week";
import { createGroupSessions, scheduleTemplate } from "@/modules/training/group";
import { listSessions } from "@/modules/training/sessions";
import { createTemplate } from "@/modules/training/templates";
import { copyWeek, previewCopyWeek } from "@/modules/training/week-copy";
import type { StrengthStructure } from "@/modules/workouts/structure";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * "Kopiér ugen" (ADR 0042): each rider's own week laid again on another.
 * A group stays a group under a new key, a programme counts on, a series
 * that already has a day in the target week is left behind, what was
 * ridden stays behind — and a rider copies only their own week.
 */

const ORG = "org_copy";
const COACH = { orgId: ORG, userId: "user_copy_coach" };
const LIV = { orgId: ORG, userId: "user_copy_liv" };
const FAR = { orgId: ORG, userId: "user_copy_far" };
const RIDERS = ["cp_liv", "cp_max"];
const FROM = "2026-11-02";
const TO = "2026-11-09";

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
const input = (title: string, onDate: string) => ({
  onDate,
  sport: "bike" as const,
  title,
  description: "",
  structure: bike,
  plannedMinutes: 0,
  plannedKm: null,
  templateId: null,
});

let admin: Pool;
let templateId = "";

async function insert(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, { org_id: ORG, ...values });
  await admin.query(q.text, q.values);
}

const week = (monday: string, riderIds = RIDERS) =>
  listSessions(COACH, {
    from: monday,
    to: new Date(Date.parse(monday) + 6 * 86_400_000).toISOString().slice(0, 10),
    riderIds,
  });

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [LIV, FAR]) await seedPerson(admin, ORG, p.userId, "member");
  await insert("riders", { id: "cp_liv", user_id: LIV.userId, name: "Liv", birth_year: 2010 });
  await insert("riders", { id: "cp_max", name: "Max", birth_year: 2010 });
  await insert("guardians", {
    rider_id: "cp_liv",
    user_id: FAR.userId,
    name: "Far",
    confirmed_at: new Date(),
  });
  // The week before: a group ride for both, Liv's own intervals (ridden), a
  // strength programme for both, and a series that already runs into next week.
  await createGroupSessions(COACH, RIDERS, input("Holdtur", "2026-11-03"));
  await createGroupSessions(COACH, ["cp_liv"], input("Intervaller", "2026-11-04"));
  const structure: StrengthStructure = {
    kind: "strength",
    warmup: "",
    minutes: 60,
    exercises: [{ name: "Benpres", group: "legs", sets: 3, reps: "16", load: "", note: "" }],
    progression: [{ group: "legs", from: 1, to: null, sets: 3, reps: "16", load: "" }],
  };
  templateId = (
    await createTemplate(COACH, {
      name: "Styrke",
      sport: "strength",
      description: "",
      structure,
      plannedMinutes: 0,
    })
  ).id;
  await scheduleTemplate(COACH, templateId, RIDERS, "2026-11-05");
  await createGroupSessions(COACH, ["cp_max"], input("Rulle", "2026-11-06"), {
    weekdays: [5],
    until: "2026-11-13",
  });
  await insert("activities", {
    id: "cp_ride",
    rider_id: "cp_liv",
    started_at: new Date("2026-11-04T15:00:00Z"),
    on_date: "2026-11-04",
    sport: "bike",
    moving_seconds: 3600,
    source: "manual",
  });
  const intervals = (await week(FROM, ["cp_liv"])).find((s) => s.title === "Intervaller")!;
  await admin.query("update planned_sessions set activity_id = 'cp_ride' where id = $1", [
    intervals.id,
  ]);
});

afterAll(async () => {
  await admin.end();
});

describe("which sessions a copy takes", () => {
  it("shifts them by the weeks between, keeps groups, and leaves a covered series", () => {
    const plan = planCopy({
      sessions: [
        { id: "a", riderId: "r1", onDate: "2026-11-03", groupKey: "g", seriesKey: null },
        { id: "b", riderId: "r2", onDate: "2026-11-03", groupKey: "g", seriesKey: null },
        { id: "c", riderId: "r1", onDate: "2026-11-06", groupKey: "h", seriesKey: "s" },
        { id: "d", riderId: "r1", onDate: "2026-11-10", groupKey: null, seriesKey: null },
      ],
      fromMonday: "2026-11-04",
      toMonday: "2026-11-23",
      seriesInTarget: (rider) => new Set(rider === "r1" ? ["s"] : []),
    });
    expect(plan.copies.map((c) => [c.source.id, c.onDate, c.groupRef])).toEqual([
      ["a", "2026-11-24", "g"],
      ["b", "2026-11-24", "g"],
    ]);
    expect(plan.skipped.map((s) => s.id)).toEqual(["c"]);
  });
});

describe("copying a week", () => {
  it("previews each rider's week before it is made", async () => {
    const preview = await previewCopyWeek(COACH, {
      riderIds: RIDERS,
      fromMonday: FROM,
      toMonday: TO,
    });
    expect(preview).toMatchObject({ copied: 5, skipped: 1 });
    const liv = preview.riders.find((r) => r.riderId === "cp_liv")!;
    expect(liv.periods[0]!.before.planned).toBe(0);
    expect(liv.periods[0]!.after.planned).toBeCloseTo(2, 9);
    expect(await week(TO)).toHaveLength(1);
  });

  it("lays the week again: groups regrouped, the programme counting on, nothing done", async () => {
    expect(await copyWeek(COACH, { riderIds: RIDERS, fromMonday: FROM, toMonday: TO })).toEqual({
      copied: 5,
      skipped: 1,
    });
    const after = await week(TO);
    const before = await week(FROM);
    const ride = after.filter((s) => s.title === "Holdtur");
    expect(ride.map((s) => s.onDate)).toEqual(["2026-11-10", "2026-11-10"]);
    expect(new Set(ride.map((s) => s.groupKey)).size).toBe(1);
    expect(ride[0]!.groupKey).not.toBe(before.find((s) => s.title === "Holdtur")!.groupKey);
    expect(after.find((s) => s.title === "Intervaller")!.activityId).toBeNull();
    expect(after.filter((s) => s.title === "Styrke").map((s) => s.programmeSession)).toEqual([
      2, 2,
    ]);
    // Max's series already had next Friday; it is not doubled.
    expect(after.filter((s) => s.title === "Rulle")).toHaveLength(1);
  });

  it("lets a rider copy their own week, and no one else's", async () => {
    await expect(
      copyWeek(LIV, { riderIds: ["cp_liv"], fromMonday: FROM, toMonday: "2026-11-16" }),
    ).resolves.toEqual({ copied: 3, skipped: 0 });
    await expect(
      copyWeek(LIV, { riderIds: RIDERS, fromMonday: FROM, toMonday: "2026-11-16" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      copyWeek(FAR, { riderIds: ["cp_liv"], fromMonday: FROM, toMonday: "2026-11-23" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      copyWeek(COACH, { riderIds: RIDERS, fromMonday: FROM, toMonday: FROM }),
    ).rejects.toMatchObject({ code: "invalid", detail: "copySameWeek" });
  });
});
