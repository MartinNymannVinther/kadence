import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { Refused } from "@/core/action";
import { addDaysIso } from "@/core/dates";
import { getInsights } from "@/modules/insight/service";
import { checkinZone } from "@/modules/load/wellbeing";
import { getCheckin, saveCheckin, type CheckinInputT } from "@/modules/wellbeing/checkins";
import {
  addKnownPain,
  changeKnownPain,
  listKnownPains,
  removeKnownPain,
} from "@/modules/wellbeing/known-pains";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Known pains through the services (docs/adr/0097): the rider and the
 * coach keep them, five at most and one per place; a check-in stores the
 * ticked ones as they stood and refuses an id that is not the rider's;
 * the day is green when the pain is the usual one. A rider under 18 in a
 * club whose known pain is ticked three weeks running is a quiet point on
 * the coach's list — not an adult, and not in a personal workspace.
 */

const CLUB = "org_kp_service";
const PERSONAL = "org_kp_personal";
const COACH = { orgId: CLUB, userId: "user_kps_coach" };
const YOUTH = { orgId: CLUB, userId: "user_kps_youth" };
const ADULT = { orgId: CLUB, userId: "user_kps_adult" };
const SELF = { orgId: PERSONAL, userId: "user_kps_self" };
const TODAY = "2026-11-20";

let admin: Pool;

const day = (riderId: string, onDate: string): CheckinInputT => ({
  riderId,
  onDate,
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
});

async function refusal(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return "none";
  } catch (error) {
    return error instanceof Refused ? `${error.code}:${error.detail ?? ""}` : String(error);
  }
}

async function seedRider(id: string, orgId: string, userId: string, birthYear: number) {
  const q = insertSql("riders", {
    id,
    org_id: orgId,
    user_id: userId,
    name: id,
    birth_year: birthYear,
  });
  await admin.query(q.text, q.values);
}

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, CLUB, COACH.userId, "owner", "Klubben");
  await seedPerson(admin, CLUB, YOUTH.userId, "member");
  await seedPerson(admin, CLUB, ADULT.userId, "member");
  await seedPerson(admin, PERSONAL, SELF.userId, "owner", "Egen træning");
  await admin.query(`update organizations set kind = 'personal' where id = $1`, [PERSONAL]);
  await seedRider("kps_youth", CLUB, YOUTH.userId, 2010);
  await seedRider("kps_adult", CLUB, ADULT.userId, 1990);
  await seedRider("kps_self", PERSONAL, SELF.userId, 2010);
});

afterAll(async () => {
  await admin.query("delete from organizations where id = any($1)", [[CLUB, PERSONAL]]);
  await admin.query("delete from users where id like 'user_kps_%'");
  await admin.end();
});

describe("keeping known pains", () => {
  it("lets the rider and the coach add, change and remove, five at most and one per place", async () => {
    const back = await addKnownPain(YOUTH, { riderId: "kps_youth", place: "Ryg", usualLevel: 2 });
    expect(
      await refusal(addKnownPain(COACH, { riderId: "kps_youth", place: "ryg", usualLevel: 1 })),
    ).toBe("invalid:knownPainTwice");
    for (const place of ["Knæ", "Hofte", "Skulder", "Nakke"])
      await addKnownPain(COACH, { riderId: "kps_youth", place, usualLevel: 1 });
    expect(
      await refusal(addKnownPain(YOUTH, { riderId: "kps_youth", place: "Hæl", usualLevel: 1 })),
    ).toBe("invalid:knownPainsFull");
    await changeKnownPain(COACH, { knownPainId: back.id, place: "Ryg", usualLevel: 1 });
    await changeKnownPain(YOUTH, { knownPainId: back.id, place: "Ryg", usualLevel: 2 });
    for (const pain of await listKnownPains(COACH, "kps_youth"))
      if (pain.id !== back.id) await removeKnownPain(YOUTH, pain.id);
    const left = await listKnownPains(YOUTH, "kps_youth");
    expect(left.map((p) => [p.place, p.usualLevel])).toEqual([["Ryg", 2]]);
  });

  it("refuses a teammate", async () => {
    const [back] = await listKnownPains(COACH, "kps_youth");
    expect(
      await refusal(addKnownPain(ADULT, { riderId: "kps_youth", place: "Fod", usualLevel: 1 })),
    ).toBe("forbidden:");
    expect(await refusal(removeKnownPain(ADULT, back!.id))).toBe("notFound:");
  });
});

describe("a check-in with a known pain ticked", () => {
  it("stores the pain as it stood, and the day is green", async () => {
    const [back] = await listKnownPains(YOUTH, "kps_youth");
    await saveCheckin(YOUTH, { ...day("kps_youth", TODAY), pain: 2, knownPainIds: [back!.id] });
    const row = await getCheckin(YOUTH, "kps_youth", TODAY);
    expect(row?.usualPains).toEqual([{ id: back!.id, place: "Ryg", level: 2 }]);
    expect(checkinZone(row!).zone).toBe("green");
    // Without the tick, the same answer is yellow, as before.
    await saveCheckin(YOUTH, { ...day("kps_youth", TODAY), pain: 2 });
    const plain = await getCheckin(YOUTH, "kps_youth", TODAY);
    expect(plain?.usualPains).toEqual([]);
    expect(checkinZone(plain!).zone).toBe("yellow");
  });

  it("refuses an id that is not the rider's known pain", async () => {
    const [back] = await listKnownPains(COACH, "kps_youth");
    expect(
      await refusal(
        saveCheckin(ADULT, { ...day("kps_adult", TODAY), pain: 2, knownPainIds: [back!.id] }),
      ),
    ).toBe("notFound:");
    expect(
      await refusal(saveCheckin(YOUTH, { ...day("kps_youth", TODAY), knownPainIds: ["nope"] })),
    ).toBe("notFound:");
  });
});

/** The rider's known pain ticked on a check-in in each of the last three weeks. */
async function tickThreeWeeks(ctx: typeof COACH, riderId: string) {
  const { id } = await addKnownPain(ctx, { riderId, place: "Lyske", usualLevel: 1 });
  for (const ago of [20, 12, 5, 0])
    await saveCheckin(ctx, {
      ...day(riderId, addDaysIso(TODAY, -ago)),
      pain: 1,
      knownPainIds: [id],
    });
}

const pointsFor = async (ctx: typeof COACH, riderId: string) => {
  const [insight] = await getInsights(ctx, { riderIds: [riderId], today: TODAY });
  return insight!.flags.filter((f) => f.kind === "known_pain_lasting");
};

describe("a known pain three weeks running", () => {
  it("is a quiet point on the coach's list for a rider under 18 in a club", async () => {
    await tickThreeWeeks(COACH, "kps_youth");
    const [flag] = await pointsFor(COACH, "kps_youth");
    expect(flag).toMatchObject({ severity: "info", values: { place: "Lyske" } });
  });

  it("is nothing for an adult", async () => {
    await tickThreeWeeks(COACH, "kps_adult");
    expect(await pointsFor(COACH, "kps_adult")).toEqual([]);
  });

  it("is nothing in a personal workspace, where there is no coach", async () => {
    await tickThreeWeeks(SELF, "kps_self");
    expect(await pointsFor(SELF, "kps_self")).toEqual([]);
  });
});
