import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { applyBlock, previewBlock } from "@/modules/training/block-apply";
import { blockItemInput } from "@/modules/training/block-items";
import { createBlock, listBlocks, updateBlock } from "@/modules/training/blocks";
import { listSessions } from "@/modules/training/sessions";
import { createTemplate } from "@/modules/training/templates";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A block: kept by a coach, read by a rider, previewed against the
 * corridor and applied into calendars as ordinary sessions — never by a
 * rider. Saved from the week planner, it may hold sessions of its own
 * beside the library's (ADR 0058).
 */

const ORG = "org_blocks";
const COACH = { orgId: ORG, userId: "user_blocks_coach" };
const RIDER = { orgId: ORG, userId: "user_blocks_rider" };
const MONDAY = "2026-11-02";

let admin: Pool;
let blockId: string;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await seedPerson(admin, ORG, RIDER.userId, "member");
  for (const [id, uid] of [
    ["b_ida", RIDER.userId],
    ["b_noah", null],
  ] as const) {
    const q = insertSql("riders", { org_id: ORG, id, user_id: uid, name: id, birth_year: 2009 });
    await admin.query(q.text, q.values);
  }
});

afterAll(async () => {
  await admin.end();
});

describe("a training block", () => {
  it("is made by a coach from the library's templates", async () => {
    const ride = await createTemplate(COACH, {
      name: "Grundtur",
      sport: "bike",
      description: "",
      structure: { kind: "bike", steps: [] },
      plannedMinutes: 120,
    });
    const gym = await createTemplate(COACH, {
      name: "Styrke",
      sport: "strength",
      description: "",
      structure: { kind: "strength", warmup: "", exercises: [], progression: [], minutes: 60 },
      plannedMinutes: 60,
    });
    const items = [
      { day: 0, templateId: gym.id },
      { day: 1, templateId: gym.id },
      { day: 2, templateId: ride.id },
      { day: 5, templateId: ride.id },
      { day: 9, templateId: ride.id },
    ];
    blockId = (await createBlock(COACH, { name: "Vinterblok", description: "", weeks: 2, items }))
      .id;
    const [block] = await listBlocks(RIDER);
    expect(block).toMatchObject({ name: "Vinterblok", weeks: 2 });
    expect(block!.items).toHaveLength(5);
  });

  it("refuses a rider making one", async () => {
    await expect(
      createBlock(RIDER, { name: "Min", description: "", weeks: 1, items: [] }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("previews each rider's weeks with the guardrails' word", async () => {
    const [ida] = await previewBlock(COACH, { blockId, riderIds: ["b_ida"], startMonday: MONDAY });
    expect(ida!.weeks).toHaveLength(2);
    expect(ida!.weeks[0]).toMatchObject({ monday: MONDAY, bikeHours: 4, strengthSessions: 2 });
    expect(ida!.weeks[0]!.flags.map((f) => f.kind)).toContain("strength_spacing");
    expect(ida!.weeks[0]!.corridor).not.toBeNull();
  });

  it("puts the block into the riders' calendars as sessions, and never for a rider", async () => {
    await expect(
      applyBlock(RIDER, { blockId, riderIds: ["b_ida"], startMonday: MONDAY }),
    ).rejects.toMatchObject({ code: "forbidden" });
    const { sessions } = await applyBlock(COACH, {
      blockId,
      riderIds: ["b_ida", "b_noah"],
      startMonday: MONDAY,
    });
    expect(sessions).toBe(10);
    const planned = await listSessions(COACH, {
      from: MONDAY,
      to: "2026-11-15",
      riderIds: ["b_ida"],
    });
    expect(planned).toHaveLength(5);
    expect(planned.map((s) => s.onDate).sort()).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-07",
      "2026-11-11",
    ]);
    expect(planned.every((s) => s.groupKey)).toBe(true);
  });
});

describe("a block with sessions of its own (ADR 0058)", () => {
  const ride = {
    sport: "bike" as const,
    title: "Holdtur",
    description: "Rolig, samlet",
    structure: {
      kind: "bike" as const,
      steps: [
        {
          kind: "step" as const,
          intent: "steady" as const,
          seconds: 5400,
          target: { kind: "zone" as const, zone: 2 },
        },
      ],
    },
    plannedMinutes: 0,
  };
  let ownId = "";

  it("keeps a session built in the planner beside the library's, with time and place", async () => {
    const [library] = await listBlocks(COACH);
    const templateId = library!.items[0]!.templateId!;
    ownId = (
      await createBlock(COACH, {
        name: "Uge 46",
        description: "",
        weeks: 1,
        items: [
          { day: 1, session: ride, startTime: "17:30", meetingPlace: "Klubhuset" },
          { day: 3, templateId, startTime: "06:45", meetingPlace: "" },
        ],
      })
    ).id;
    const block = (await listBlocks(RIDER)).find((b) => b.id === ownId)!;
    expect(block.items).toEqual([
      {
        day: 1,
        templateId: null,
        title: "Holdtur",
        sport: "bike",
        plannedMinutes: 90,
        startTime: "17:30",
        meetingPlace: "Klubhuset",
        session: { description: "Rolig, samlet", structure: ride.structure },
      },
      expect.objectContaining({ day: 3, templateId, startTime: "06:45", session: null }),
    ]);
  });

  it("previews the session of its own with the rest", async () => {
    const [ida] = await previewBlock(COACH, {
      blockId: ownId,
      riderIds: ["b_ida"],
      startMonday: "2026-11-16",
    });
    expect(ida!.weeks[0]).toMatchObject({ sessions: 2 });
    expect(ida!.weeks[0]!.bikeHours).toBeGreaterThanOrEqual(1.5);
  });

  it("lays both into the calendars, each with its time and place", async () => {
    const { sessions } = await applyBlock(COACH, {
      blockId: ownId,
      riderIds: ["b_ida", "b_noah"],
      startMonday: "2026-11-16",
    });
    expect(sessions).toBe(4);
    const week = await listSessions(COACH, { from: "2026-11-16", to: "2026-11-22" });
    const own = week.filter((s) => s.title === "Holdtur");
    expect(own).toHaveLength(2);
    expect(own[0]).toMatchObject({
      onDate: "2026-11-17",
      templateId: null,
      description: "Rolig, samlet",
      plannedMinutes: 90,
      meetingPlace: "Klubhuset",
    });
    expect(own[0]!.startTime).toBe("17:30:00");
    expect(new Set(own.map((s) => s.groupKey)).size).toBe(1);
    const fromLibrary = week.filter((s) => s.onDate === "2026-11-19");
    expect(fromLibrary.map((s) => s.startTime)).toEqual(["06:45:00", "06:45:00"]);
  });

  it("keeps the session of its own when the block is saved again", async () => {
    const block = (await listBlocks(COACH)).find((b) => b.id === ownId)!;
    await updateBlock(COACH, ownId, {
      name: "Uge 46, rettet",
      description: "",
      weeks: 1,
      items: block.items.map(blockItemInput),
    });
    const again = (await listBlocks(COACH)).find((b) => b.id === ownId)!;
    expect(again.items).toEqual(block.items);
  });
});
