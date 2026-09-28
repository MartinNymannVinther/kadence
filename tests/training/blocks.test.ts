import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { applyBlock, createBlock, listBlocks, previewBlock } from "@/modules/training/blocks";
import { listSessions } from "@/modules/training/sessions";
import { createTemplate } from "@/modules/training/templates";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A block: kept by a coach, read by a rider, previewed against the
 * corridor and applied into calendars as ordinary sessions — never by a
 * rider.
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
