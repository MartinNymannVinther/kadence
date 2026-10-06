import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { toCard } from "@/components/calendar/to-card";
import { createGroupSessions, scheduleTemplate } from "@/modules/training/group";
import { listSessions, moveSession, updateSession } from "@/modules/training/sessions";
import { createTemplate } from "@/modules/training/templates";
import { byStartTime, clockOf, clockText, timePlaceText } from "@/modules/training/time-place";
import { SessionInput } from "@/modules/training/vocabulary";
import { copyWeek } from "@/modules/training/week-copy";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Time and place on a session (ADR 0057): "17.30 fra klubhuset", carried
 * by every way a session is made — by hand, for a group, as a series,
 * from the library, copied — changed as far as the rest of a change goes,
 * and kept when a change does not mention them. A day's sessions come in
 * the order they start.
 */

const ORG = "org_timeplace";
const COACH = { orgId: ORG, userId: "user_timeplace_coach" };
const RIDERS = ["tp_ida", "tp_noa", "tp_liv"];
const MONDAY = "2026-11-02";

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

async function week(monday = MONDAY) {
  const to = new Date(Date.parse(`${monday}T12:00:00Z`) + 6 * 864e5).toISOString().slice(0, 10);
  return listSessions(COACH, { from: monday, to, riderIds: RIDERS });
}

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const id of RIDERS) {
    const q = insertSql("riders", { org_id: ORG, id, name: id, birth_year: 2010 });
    await admin.query(q.text, q.values);
  }
});

afterAll(async () => {
  await admin.end();
});

describe("the words", () => {
  it("reads the database's time as the form's, and writes it as a reader does", () => {
    expect(clockOf("17:30:00")).toBe("17:30");
    expect(clockOf("07:05")).toBe("07:05");
    expect(clockOf("")).toBeNull();
    expect(clockOf("25:00")).toBeNull();
    expect(clockText("17:30:00", "da")).toBe("17.30");
    expect(clockText("17:30", "en")).toBe("17:30");
    expect(timePlaceText({ startTime: "17:30:00", meetingPlace: "Klubhuset" }, "da")).toBe(
      "17.30 · Klubhuset",
    );
    expect(timePlaceText({ startTime: null, meetingPlace: " Klubhuset " }, "da")).toBe("Klubhuset");
    expect(timePlaceText({ startTime: null, meetingPlace: "" }, "en")).toBe("");
  });

  it("orders a day by start time, those without a time after, in their own order", () => {
    const day = [
      { id: "a", startTime: null },
      { id: "b", startTime: "17:30:00" },
      { id: "c", startTime: null },
      { id: "d", startTime: "06:45" },
    ];
    expect(byStartTime(day).map((s) => s.id)).toEqual(["d", "b", "a", "c"]);
  });

  it("refuses a time that is not a clock and a place over 120 characters", () => {
    const base = { ...input("x", MONDAY), riderId: "tp_ida" };
    expect(SessionInput.safeParse({ ...base, startTime: "17:30" }).success).toBe(true);
    expect(SessionInput.safeParse({ ...base, startTime: null }).success).toBe(true);
    expect(SessionInput.safeParse({ ...base, startTime: "24:00" }).success).toBe(false);
    expect(SessionInput.safeParse({ ...base, startTime: "5.30" }).success).toBe(false);
    expect(SessionInput.safeParse({ ...base, meetingPlace: "x".repeat(121) }).success).toBe(false);
    expect(SessionInput.safeParse({ ...base, meetingPlace: "x".repeat(120) }).success).toBe(true);
  });
});

describe("time and place on a session", () => {
  let groupIds: string[] = [];

  it("lands on every rider's copy of a group plan, and on the card", async () => {
    groupIds = (
      await createGroupSessions(COACH, RIDERS, {
        ...input("Holdtur", "2026-11-03"),
        startTime: "17:30",
        meetingPlace: "Klubhuset",
      })
    ).ids;
    const made = (await week()).filter((s) => s.title === "Holdtur");
    expect(made.map((s) => [clockOf(s.startTime), s.meetingPlace])).toEqual(
      RIDERS.map(() => ["17:30", "Klubhuset"]),
    );
    expect(toCard(made[0]!)).toMatchObject({ startTime: "17:30", meetingPlace: "Klubhuset" });
  });

  it("is kept by a change that does not mention it", async () => {
    await updateSession(COACH, groupIds[0]!, input("Holdtur, rolig", MONDAY), "group");
    const made = (await week()).filter((s) => s.title === "Holdtur, rolig");
    expect(made).toHaveLength(3);
    expect(made.every((s) => clockOf(s.startTime) === "17:30")).toBe(true);
  });

  it("follows the scope of a change: one copy, or the whole group", async () => {
    await updateSession(
      COACH,
      groupIds[0]!,
      { ...input("Holdtur, rolig", MONDAY), startTime: "18:00", meetingPlace: "Torvet" },
      "one",
    );
    let made = (await week()).filter((s) => s.title === "Holdtur, rolig");
    expect(made.filter((s) => s.meetingPlace === "Torvet").map((s) => s.id)).toEqual([groupIds[0]]);
    await updateSession(
      COACH,
      groupIds[1]!,
      { ...input("Holdtur, rolig", MONDAY), startTime: "09:15", meetingPlace: "Hallen" },
      "group",
    );
    made = (await week()).filter((s) => s.title === "Holdtur, rolig");
    expect(new Set(made.map((s) => `${clockOf(s.startTime)} ${s.meetingPlace}`))).toEqual(
      new Set(["09:15 Hallen"]),
    );
  });

  it("is cleared with null and an empty place", async () => {
    await updateSession(
      COACH,
      groupIds[2]!,
      { ...input("Holdtur, rolig", MONDAY), startTime: null, meetingPlace: "" },
      "one",
    );
    const [cleared] = (await week()).filter((s) => s.id === groupIds[2]);
    expect(cleared).toMatchObject({ startTime: null, meetingPlace: "" });
  });

  it("follows the series from this day on", async () => {
    const { ids } = await createGroupSessions(
      COACH,
      ["tp_liv"],
      { ...input("Rulle", "2026-11-04"), startTime: "06:30" },
      { weekdays: [3], until: "2026-11-25" },
    );
    await updateSession(
      COACH,
      ids[1]!,
      { ...input("Rulle", "2026-11-11"), startTime: "07:00", meetingPlace: "" },
      "series",
    );
    const series = await listSessions(COACH, {
      from: "2026-11-01",
      to: "2026-11-30",
      riderIds: ["tp_liv"],
    });
    expect(
      series.filter((s) => s.title === "Rulle").map((s) => [s.onDate, clockOf(s.startTime)]),
    ).toEqual([
      ["2026-11-04", "06:30"],
      ["2026-11-11", "07:00"],
      ["2026-11-18", "07:00"],
      ["2026-11-25", "07:00"],
    ]);
  });

  it("comes with a session from the library, and orders the day by it", async () => {
    const template = await createTemplate(COACH, {
      name: "Morgenstyrke",
      sport: "strength",
      description: "",
      structure: { kind: "strength", warmup: "", exercises: [], progression: [], minutes: 45 },
      plannedMinutes: 45,
    });
    await scheduleTemplate(COACH, template.id, ["tp_ida"], "2026-11-03", undefined, {
      startTime: "06:45",
      meetingPlace: "Fitnesscentret",
    });
    const day = (await week()).filter((s) => s.riderId === "tp_ida" && s.onDate === "2026-11-03");
    expect(day.map((s) => [s.title, clockOf(s.startTime)])).toEqual([
      ["Morgenstyrke", "06:45"],
      ["Holdtur, rolig", "09:15"],
    ]);
  });

  it("goes along when a session is copied, and when a week is", async () => {
    const [source] = (await week()).filter((s) => s.title === "Morgenstyrke");
    await moveSession(COACH, source!.id, "2026-11-05", true, "tp_noa");
    const [copy] = (await week()).filter(
      (s) => s.riderId === "tp_noa" && s.onDate === "2026-11-05",
    );
    expect(copy).toMatchObject({ title: "Morgenstyrke", meetingPlace: "Fitnesscentret" });
    expect(clockOf(copy!.startTime)).toBe("06:45");

    await copyWeek(COACH, { riderIds: RIDERS, fromMonday: MONDAY, toMonday: "2026-12-07" });
    const copied = await week("2026-12-07");
    const group = copied.filter((s) => s.title === "Holdtur, rolig");
    expect(group.map((s) => s.meetingPlace).sort()).toEqual(["", "Hallen", "Hallen"]);
    expect(copied.find((s) => s.title === "Morgenstyrke" && s.riderId === "tp_ida")).toMatchObject({
      meetingPlace: "Fitnesscentret",
    });
  });
});
