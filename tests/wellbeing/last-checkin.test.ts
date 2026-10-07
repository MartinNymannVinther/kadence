import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { getLastCheckin, saveCheckin } from "@/modules/wellbeing/checkins";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The last check-in the shorter check-in starts from (backlog P2-11): the
 * rider's latest before today, not today's own, and only ever their own.
 */

const ORG = "org_lastci";
const EMMA = { orgId: ORG, userId: "user_lastci_emma" };
const OSKAR = { orgId: ORG, userId: "user_lastci_oskar" };
const TODAY = "2026-11-10";

const answers = (energy: number) => ({
  sleepHours: 8,
  sleepQuality: 4,
  energy,
  mood: 4,
  soreness: 3,
  stress: 4,
  pain: 0,
  painWhere: "",
  ill: 0,
  note: "",
});

let admin: Pool;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, EMMA.userId, "member");
  await seedPerson(admin, ORG, OSKAR.userId, "member");
  for (const [id, userId] of [
    ["lastci_emma", EMMA.userId],
    ["lastci_oskar", OSKAR.userId],
  ] as const) {
    const q = insertSql("riders", { org_id: ORG, id, user_id: userId, name: id, birth_year: 2010 });
    await admin.query(q.text, q.values);
  }
  await saveCheckin(EMMA, { riderId: "lastci_emma", onDate: "2026-11-06", ...answers(2) });
  await saveCheckin(EMMA, { riderId: "lastci_emma", onDate: "2026-11-08", ...answers(3) });
  await saveCheckin(EMMA, { riderId: "lastci_emma", onDate: TODAY, ...answers(5) });
});

afterAll(async () => {
  await admin.end();
});

describe("getLastCheckin", () => {
  it("is the rider's latest check-in before the day, not the day's own", async () => {
    const last = await getLastCheckin(EMMA, "lastci_emma", TODAY);
    expect(last).toMatchObject({ onDate: "2026-11-08", energy: 3 });
  });

  it("is nothing before the first check-in", async () => {
    expect(await getLastCheckin(EMMA, "lastci_emma", "2026-11-06")).toBeNull();
  });

  it("is never another rider's", async () => {
    expect(await getLastCheckin(OSKAR, "lastci_emma", TODAY)).toBeNull();
  });
});
