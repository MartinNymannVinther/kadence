import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { addComment, deleteComment, editComment, listComments } from "@/modules/training/comments";
import { completeSession, reopenSession, setFeedback } from "@/modules/training/complete";
import { createEvent, listEvents } from "@/modules/training/events";
import { createGroupSessions, scheduleTemplate } from "@/modules/training/group";
import {
  deleteSession,
  listSessions,
  moveSession,
  updateSession,
} from "@/modules/training/sessions";
import { createTemplate, updateTemplate } from "@/modules/training/templates";
import type { StrengthStructure } from "@/modules/workouts/structure";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The calendar's services with the people who use them: a coach who plans
 * for two riders at once, a rider who does their own session and says how
 * hard it was, a parent who reads and cannot write, and the strength
 * programme that numbers each rider's sessions so the progression follows.
 */

const ORG = "org_training";
const COACH = { orgId: ORG, userId: "user_training_coach" };
const ANNA = { orgId: ORG, userId: "user_training_anna" };
const BO = { orgId: ORG, userId: "user_training_bo" };
const MOR = { orgId: ORG, userId: "user_training_mor" };
const DAY = "2026-11-02";

const bike = {
  kind: "bike" as const,
  steps: [
    {
      kind: "step" as const,
      intent: "steady" as const,
      seconds: 5400,
      target: { kind: "zone" as const, zone: 2 },
    },
  ],
};

let admin: Pool;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [ANNA, BO, MOR]) await seedPerson(admin, ORG, p.userId, "member");
  for (const [rid, uid] of [
    ["t_anna", ANNA.userId],
    ["t_bo", BO.userId],
  ]) {
    const q = insertSql("riders", {
      org_id: ORG,
      id: rid,
      user_id: uid,
      name: rid,
      birth_year: 2009,
    });
    await admin.query(q.text, q.values);
  }
  const g = insertSql("guardians", {
    org_id: ORG,
    rider_id: "t_anna",
    user_id: MOR.userId,
    name: "Mor",
    confirmed_at: new Date(),
  });
  await admin.query(g.text, g.values);
});

afterAll(async () => {
  await admin.end();
});

const input = (title: string) => ({
  onDate: DAY,
  sport: "bike" as const,
  title,
  description: "",
  structure: bike,
  plannedMinutes: 0,
  plannedKm: null,
  templateId: null,
});

describe("planning", () => {
  it("lays one plan on two riders, as one group", async () => {
    const { ids, groupKey } = await createGroupSessions(
      COACH,
      ["t_anna", "t_bo"],
      input("Grundtur"),
    );
    expect(ids).toHaveLength(2);
    expect(groupKey).not.toBe("");
    const sessions = await listSessions(COACH, { from: DAY, to: DAY });
    const group = sessions.filter((s) => s.groupKey === groupKey);
    expect(group.map((s) => s.plannedMinutes)).toEqual([90, 90]);
    expect(group.every((s) => (s.plannedLoad ?? 0) > 0)).toBe(true);

    expect(
      await updateSession(
        COACH,
        ids[0]!,
        { ...input("Grundtur, rettet"), riderId: undefined } as never,
        "group",
      ),
    ).toBe(2);
    const after = await listSessions(COACH, { from: DAY, to: DAY });
    expect(after.filter((s) => s.groupKey === groupKey).map((s) => s.title)).toEqual([
      "Grundtur, rettet",
      "Grundtur, rettet",
    ]);
  });

  it("lets a rider plan their own session, never a teammate's or a group", async () => {
    const own = await createGroupSessions(ANNA, ["t_anna"], {
      ...input("Egen tur"),
      onDate: "2026-11-21",
    });
    expect(own.ids).toHaveLength(1);
    await expect(createGroupSessions(ANNA, ["t_bo"], input("x"))).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(createGroupSessions(ANNA, ["t_anna", "t_bo"], input("x"))).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(createGroupSessions(MOR, ["t_anna"], input("x"))).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("lets a rider move their own session and not a teammate's", async () => {
    const annas = (await listSessions(ANNA, { from: DAY, to: DAY }))[0]!;
    await moveSession(ANNA, annas.id, "2026-11-03");
    const bos = (await listSessions(BO, { from: DAY, to: DAY }))[0]!;
    await expect(moveSession(ANNA, bos.id, "2026-11-03")).rejects.toMatchObject({
      code: "notFound",
    });
  });

  it("shows each rider their own calendar and the parent their child's", async () => {
    const range = { from: "2026-11-01", to: "2026-11-30" };
    expect((await listSessions(BO, range)).every((s) => s.riderId === "t_bo")).toBe(true);
    expect((await listSessions(MOR, range)).every((s) => s.riderId === "t_anna")).toBe(true);
    expect((await listSessions(MOR, range)).length).toBeGreaterThan(0);
  });
});

describe("a strength programme", () => {
  it("numbers each rider's sessions so the progression follows", async () => {
    const structure: StrengthStructure = {
      kind: "strength",
      warmup: "",
      minutes: 60,
      exercises: [{ name: "Benpres", group: "legs", sets: 3, reps: "16", load: "", note: "" }],
      progression: [
        { group: "legs", from: 1, to: 1, sets: 3, reps: "16", load: "" },
        { group: "legs", from: 2, to: null, sets: 3, reps: "12", load: "" },
      ],
    };
    const { id } = await createTemplate(COACH, {
      name: "Styrke",
      sport: "strength",
      description: "",
      structure,
      plannedMinutes: 0,
    });
    await scheduleTemplate(COACH, id, ["t_anna", "t_bo"], "2026-11-04");
    await scheduleTemplate(COACH, id, ["t_anna"], "2026-11-07");
    const annas = (
      await listSessions(COACH, { from: "2026-11-04", to: "2026-11-07", riderIds: ["t_anna"] })
    )
      .filter((s) => s.templateId === id)
      .map((s) => s.programmeSession);
    expect(annas).toEqual([1, 2]);
  });

  it("refuses a rider editing the library", async () => {
    await expect(
      createTemplate(ANNA, {
        name: "x",
        sport: "bike",
        description: "",
        structure: bike,
        plannedMinutes: 0,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    // A template of the team's that exists: a rider is refused, not told it is missing.
    const { id } = await createTemplate(COACH, {
      name: "Holdets",
      sport: "bike",
      description: "",
      structure: bike,
      plannedMinutes: 0,
    });
    await expect(
      updateTemplate(ANNA, id, {
        name: "x",
        sport: "bike",
        description: "",
        structure: bike,
        plannedMinutes: 0,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("doing a session", () => {
  it("records it with a load from how hard it was, and can be undone", async () => {
    const s = (await listSessions(BO, { from: DAY, to: DAY }))[0]!;
    const activity = await completeSession(BO, s.id, {
      minutes: 80,
      distanceKm: 32,
      rpe: 4,
      feel: 4,
      note: "",
    });
    const done = (await listSessions(BO, { from: DAY, to: DAY }))[0]!;
    expect(done.activity).toMatchObject({ id: activity.id, loadMethod: "rpe", rpe: 4 });
    await expect(
      completeSession(BO, s.id, { minutes: 1, distanceKm: null, rpe: 1, feel: 1, note: "" }),
    ).rejects.toMatchObject({
      code: "conflict",
    });
    await setFeedback(BO, activity.id, { rpe: 7, feel: 2, note: "tunge ben" });
    const harder = (await listSessions(BO, { from: DAY, to: DAY }))[0]!;
    expect(harder.activity!.load!).toBeGreaterThan(done.activity!.load!);
    await expect(
      setFeedback(ANNA, activity.id, { rpe: 1, feel: 1, note: "" }),
    ).rejects.toMatchObject({
      code: "notFound",
    });
    await reopenSession(BO, s.id);
    expect((await listSessions(BO, { from: DAY, to: DAY }))[0]!.activity).toBeNull();
  });

  it("lets a parent read and not tick off", async () => {
    const s = (await listSessions(MOR, { from: "2026-11-01", to: "2026-11-30" }))[0]!;
    await expect(
      completeSession(MOR, s.id, { minutes: 60, distanceKm: null, rpe: 5, feel: 3, note: "" }),
    ).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});

describe("the conversation and the calendar", () => {
  it("keeps one thread that the parent reads, and each author their own words", async () => {
    const s = (await listSessions(ANNA, { from: "2026-11-01", to: "2026-11-30" }))[0]!;
    const { id: coachComment } = await addComment(
      COACH,
      { plannedSessionId: s.id },
      "Hold pulsen nede",
    );
    await addComment(ANNA, { plannedSessionId: s.id }, "Det gik fint");
    await expect(addComment(MOR, { plannedSessionId: s.id }, "Hej")).rejects.toMatchObject({
      code: "forbidden",
    });
    const thread = await listComments(MOR, { plannedSessionId: s.id });
    expect(thread.map((c) => c.body)).toEqual(["Hold pulsen nede", "Det gik fint"]);
    await expect(editComment(ANNA, coachComment, "ændret")).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(deleteComment(ANNA, coachComment)).rejects.toMatchObject({ code: "forbidden" });
    await deleteComment(COACH, coachComment);
  });

  it("puts a team race in everyone's calendar and an exam in one rider's", async () => {
    await createEvent(COACH, {
      riderId: null,
      kind: "race",
      title: "DM",
      startsOn: "2026-11-10",
      endsOn: "2026-11-10",
      priority: "A",
      note: "",
    });
    await createEvent(ANNA, {
      riderId: "t_anna",
      kind: "exam",
      title: "Terminsprøve",
      startsOn: "2026-11-12",
      endsOn: "2026-11-13",
      priority: null,
      note: "",
    });
    await expect(
      createEvent(ANNA, {
        riderId: null,
        kind: "race",
        title: "x",
        startsOn: DAY,
        endsOn: DAY,
        priority: null,
        note: "",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    const range = { from: "2026-11-01", to: "2026-11-30" };
    expect((await listEvents(BO, range)).map((e) => e.title)).toEqual(["DM"]);
    expect((await listEvents(ANNA, range)).map((e) => e.title)).toEqual(["DM", "Terminsprøve"]);
  });

  it("lets a coach take a whole group plan off the calendar", async () => {
    const { ids } = await createGroupSessions(COACH, ["t_anna", "t_bo"], {
      ...input("Aflyst"),
      onDate: "2026-11-20",
    });
    expect(await deleteSession(COACH, ids[0]!, "group")).toBe(2);
  });
});
