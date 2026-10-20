import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { moveItem } from "@/components/week-plan/move";
import { fromDraftPayload, toDraftPayload } from "@/components/week-plan/types";
import { Refused } from "@/core/action";
import {
  clearWeekPlanDraft,
  getWeekPlanDraft,
  saveWeekPlanDraft,
} from "@/modules/training/week-plan-draft";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The week planner's shared draft (ADR 0043, amended 2026-10-07; backlog
 * P2-05), through its service: a coach's save is the other coach's read,
 * with who saved it and when; the last save wins; the team's plan and a
 * rider's plan for the same week are kept apart; a rider of another team
 * is no scope; ids that are not the team's riders are left out; the draft
 * is cleared when the week is laid in; and riders and parents are refused.
 * A session one coach moves to another day is the other coach's read.
 */

const ORG = "org_wpdraft";
const HEAD = { orgId: ORG, userId: "user_wpdraft_head" };
const ASSISTANT = { orgId: ORG, userId: "user_wpdraft_assistant" };
const RIDER = { orgId: ORG, userId: "user_wpdraft_rider" };
const OTHER = { orgId: "org_wpdraft_other", userId: "user_wpdraft_other" };
const MONDAY = "2026-11-09";
const TEAM = { monday: MONDAY, scope: "team" };

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
const built = (day: number, title: string) => ({
  kind: "built" as const,
  day,
  startTime: "17:30",
  meetingPlace: "Klubhuset",
  session: {
    sport: "bike" as const,
    title,
    description: "",
    structure: bike,
    plannedMinutes: 60,
    plannedKm: null,
  },
});

let admin: Pool;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, HEAD.userId, "owner");
  await seedPerson(admin, ORG, ASSISTANT.userId, "admin");
  await seedPerson(admin, ORG, RIDER.userId, "member");
  await seedPerson(admin, OTHER.orgId, OTHER.userId, "owner");
  await admin.query(`update users set name = 'Mads' where id = $1`, [ASSISTANT.userId]);
  for (const [orgId, id, userId] of [
    [ORG, "wpdraft_a", RIDER.userId],
    [ORG, "wpdraft_b", null],
    [OTHER.orgId, "wpdraft_other", null],
  ] as const) {
    const q = insertSql("riders", {
      org_id: orgId,
      id,
      user_id: userId,
      name: id,
      birth_year: 2010,
    });
    await admin.query(q.text, q.values);
  }
});

afterAll(async () => {
  await admin.end();
});

describe("the shared week plan draft", () => {
  it("is nothing until a coach saves one", async () => {
    expect(await getWeekPlanDraft(HEAD, TEAM)).toBeNull();
  });

  it("is what the other coach reads, with who saved it and when", async () => {
    const saved = await saveWeekPlanDraft(HEAD, {
      ...TEAM,
      payload: { riderIds: ["wpdraft_a", "wpdraft_b"], items: [built(1, "Intervaller")] },
    });
    expect(saved.by).toEqual({ name: HEAD.userId, me: true });
    const read = await getWeekPlanDraft(ASSISTANT, TEAM);
    expect(read?.payload).toEqual(saved.payload);
    expect(read?.payload.items[0]).toMatchObject({ day: 1, startTime: "17:30" });
    expect(read?.updatedAt).toBe(saved.updatedAt);
    expect(read?.by).toEqual({ name: HEAD.userId, me: false });
  });

  it("is the last save's: the assistant's change replaces the head coach's", async () => {
    const before = await getWeekPlanDraft(HEAD, TEAM);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const saved = await saveWeekPlanDraft(ASSISTANT, {
      ...TEAM,
      payload: { riderIds: ["wpdraft_a"], items: [built(5, "Langtur")] },
    });
    expect(Date.parse(saved.updatedAt)).toBeGreaterThan(Date.parse(before!.updatedAt));
    const read = await getWeekPlanDraft(HEAD, TEAM);
    expect(read?.payload.items.map((i) => i.day)).toEqual([5]);
    expect(read?.by).toEqual({ name: "Mads", me: false });
  });

  it("carries a session moved to another day to the other coach, the rest untouched", async () => {
    const week = { monday: "2026-11-16", scope: "team" };
    const first = await saveWeekPlanDraft(HEAD, {
      ...week,
      payload: { riderIds: ["wpdraft_a"], items: [built(1, "Intervaller"), built(3, "Langtur")] },
    });
    // The assistant's planner holds the draft, drags Intervaller from Tuesday to Thursday.
    const shown = fromDraftPayload(first.payload, []);
    const key = shown.items.find((i) => i.day === 1)!.key;
    await new Promise((resolve) => setTimeout(resolve, 5));
    await saveWeekPlanDraft(ASSISTANT, {
      ...week,
      payload: toDraftPayload({ ...shown, items: moveItem(shown.items, key, 3) }),
    });
    const read = await getWeekPlanDraft(HEAD, week);
    expect(read?.payload.items.map((i) => [i.day, i.kind === "built" && i.session.title])).toEqual([
      [3, "Langtur"],
      [3, "Intervaller"],
    ]);
    expect(read?.payload.items[1]).toMatchObject({ startTime: "17:30", meetingPlace: "Klubhuset" });
    expect(read?.by).toEqual({ name: "Mads", me: false });
  });

  it("keeps a rider's plan apart from the team's for the same week", async () => {
    const rider = { monday: MONDAY, scope: "wpdraft_b" };
    expect(await getWeekPlanDraft(HEAD, rider)).toBeNull();
    await saveWeekPlanDraft(HEAD, { ...rider, payload: { riderIds: ["wpdraft_b"], items: [] } });
    expect((await getWeekPlanDraft(HEAD, rider))?.payload.riderIds).toEqual(["wpdraft_b"]);
    expect((await getWeekPlanDraft(HEAD, TEAM))?.payload.riderIds).toEqual(["wpdraft_a"]);
  });

  it("reads any day of the week as its Monday", async () => {
    const wednesday = { monday: "2026-11-11", scope: "team" };
    expect((await getWeekPlanDraft(HEAD, wednesday))?.payload.items.map((i) => i.day)).toEqual([5]);
  });

  it("leaves out ids that are not the team's riders", async () => {
    const saved = await saveWeekPlanDraft(HEAD, {
      monday: "2026-11-16",
      scope: "team",
      payload: { riderIds: ["wpdraft_a", "wpdraft_other", "nobody", "wpdraft_a"], items: [] },
    });
    expect(saved.payload.riderIds).toEqual(["wpdraft_a"]);
  });

  it("takes no rider of another team as its scope", async () => {
    const scope = { monday: MONDAY, scope: "wpdraft_other" };
    await expect(
      saveWeekPlanDraft(HEAD, { ...scope, payload: { riderIds: [], items: [] } }),
    ).rejects.toMatchObject({ code: "notFound" });
    await expect(getWeekPlanDraft(HEAD, scope)).rejects.toBeInstanceOf(Refused);
  });

  it("does not read a draft that no longer holds together", async () => {
    await admin.query(
      `insert into week_plan_drafts (org_id, week_monday, payload) values ($1, '2026-11-23', '{"items": "x"}')`,
      [ORG],
    );
    expect(await getWeekPlanDraft(HEAD, { monday: "2026-11-23", scope: "team" })).toBeNull();
  });

  it("is cleared when the week is laid in, and clearing again is no error", async () => {
    await clearWeekPlanDraft(ASSISTANT, TEAM);
    expect(await getWeekPlanDraft(HEAD, TEAM)).toBeNull();
    await clearWeekPlanDraft(ASSISTANT, TEAM);
    await clearWeekPlanDraft(ASSISTANT, { monday: MONDAY, scope: "wpdraft_other" });
    // The rider's own plan for the week is still there.
    expect(await getWeekPlanDraft(HEAD, { monday: MONDAY, scope: "wpdraft_b" })).not.toBeNull();
  });

  it("is a coach's: a rider is refused, and a coach of another team sees none", async () => {
    await expect(getWeekPlanDraft(RIDER, TEAM)).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      saveWeekPlanDraft(RIDER, { ...TEAM, payload: { riderIds: [], items: [] } }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(clearWeekPlanDraft(RIDER, TEAM)).rejects.toMatchObject({ code: "forbidden" });
    expect(await getWeekPlanDraft(OTHER, { monday: MONDAY, scope: "team" })).toBeNull();
  });
});
