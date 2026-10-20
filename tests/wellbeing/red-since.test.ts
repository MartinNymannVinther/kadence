import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { saveCheckin, type CheckinInputT } from "@/modules/wellbeing/checkins";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * When a check-in turned red (drizzle/0036, docs/adr/0060, backlog P2-17):
 * the check-in service sets `red_since` when a check-in becomes red, keeps
 * it while it stays red, and clears it when it is put right, so a coach's
 * wellbeing reminder counts from the moment it turned red. Saved by the
 * rider or by a coach, the same.
 */

const ORG = "org_red_since";
const COACH = { orgId: ORG, userId: "user_redsince_coach" };
const RIDER = { orgId: ORG, userId: "user_redsince_rider" };
const RIDER_ID = "r_redsince";
const DAY = "2026-10-06";

let admin: Pool;

const green: CheckinInputT = {
  riderId: RIDER_ID,
  onDate: DAY,
  sleepHours: 8,
  sleepQuality: 4,
  energy: 4,
  mood: 4,
  soreness: 4,
  stress: 4,
  pain: 0,
  painWhere: "",
  ill: 0,
  note: "",
};

async function redSince(): Promise<Date | null> {
  const result = await admin.query(
    "select red_since from checkins where rider_id = $1 and on_date = $2",
    [RIDER_ID, DAY],
  );
  return result.rows[0]?.red_since ?? null;
}

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner", "Rød siden");
  await seedPerson(admin, ORG, RIDER.userId, "member");
  const rider = insertSql("riders", {
    id: RIDER_ID,
    org_id: ORG,
    user_id: RIDER.userId,
    name: "Emma Holm",
    birth_year: 2010,
  });
  await admin.query(rider.text, rider.values);
});

afterAll(async () => {
  await admin.query("delete from organizations where id = $1", [ORG]);
  await admin.end();
});

describe("red_since", () => {
  it("is empty for a green check-in, set when it turns red, and kept while it stays red", async () => {
    await saveCheckin(RIDER, green);
    expect(await redSince()).toBeNull();

    await saveCheckin(RIDER, { ...green, pain: 3, painWhere: "Knæ" });
    const first = await redSince();
    expect(first).toBeInstanceOf(Date);
    expect(Math.abs(first!.getTime() - Date.now())).toBeLessThan(60_000);

    await saveCheckin(RIDER, { ...green, pain: 3, painWhere: "Knæ og hofte" });
    expect((await redSince())?.getTime()).toBe(first!.getTime());
    // Red for another reason, still the same red check-in.
    await saveCheckin(COACH, { ...green, pain: 3, ill: 1 });
    expect((await redSince())?.getTime()).toBe(first!.getTime());
  });

  it("is cleared when the check-in is put right, and set anew when it turns red again", async () => {
    const before = await redSince();
    await saveCheckin(RIDER, { ...green, pain: 2 });
    expect(await redSince()).toBeNull();

    await saveCheckin(RIDER, { ...green, mood: 1 });
    const again = await redSince();
    expect(again).toBeInstanceOf(Date);
    expect(again!.getTime()).toBeGreaterThan(before!.getTime());
  });

  it("is set on the first save when that is red", async () => {
    await admin.query("delete from checkins where rider_id = $1", [RIDER_ID]);
    await saveCheckin(RIDER, { ...green, ill: 1 });
    const row = await admin.query(
      "select red_since, created_at from checkins where rider_id = $1 and on_date = $2",
      [RIDER_ID, DAY],
    );
    expect(row.rows[0].red_since?.getTime()).toBe(row.rows[0].created_at.getTime());
  });
});
