import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { Refused } from "@/core/action";
import { addDaysIso } from "@/core/dates";
import { hasRidesForProposal, proposeThresholds } from "@/modules/training/threshold-proposal";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The threshold proposal (docs/adr/0094) read under RLS: the rider and a
 * coach may ask, a parent only while the rider shares their training, a
 * teammate never — and asking writes nothing.
 */

const ORG = "org_threshold_proposal";
const COACH = { orgId: ORG, userId: "user_tp_coach" };
const ANNA = { orgId: ORG, userId: "user_tp_anna" };
const BO = { orgId: ORG, userId: "user_tp_bo" };
const PARENT = { orgId: ORG, userId: "user_tp_parent" };
const TODAY = "2026-10-12";

let admin: Pool;

async function insert(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, { org_id: ORG, ...values });
  await admin.query(q.text, q.values);
}

/** A 5-second pulse stream: easy, then 20 hard minutes and a sprint at the end. */
function hrStream(hard: number, max: number): number[] {
  return [
    ...Array.from({ length: 240 }, () => 135),
    ...Array.from({ length: 240 }, () => hard),
    max,
    max,
    max - 4,
    ...Array.from({ length: 60 }, () => 140),
  ];
}

const curve = (cp: number, wPrime: number, share: number) =>
  Object.fromEntries(
    [180, 300, 600, 900, 1200].map((s) => [String(s), Math.round((cp + wPrime / s) * share)]),
  );

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [ANNA, BO, PARENT]) await seedPerson(admin, ORG, p.userId, "member");
  await insert("riders", {
    id: "tp_anna",
    user_id: ANNA.userId,
    name: "Anna",
    birth_year: 2010,
    ftp_watts: 240,
  });
  await insert("riders", { id: "tp_bo", user_id: BO.userId, name: "Bo", birth_year: 2010 });
  await insert("guardians", {
    id: "tp_g",
    rider_id: "tp_anna",
    user_id: PARENT.userId,
    name: "Forælder",
    confirmed_at: new Date(),
  });
  for (const [i, share] of [1, 0.95, 0.9, 0.88, 0.85].entries()) {
    const onDate = addDaysIso(TODAY, -(3 + i * 7));
    await insert("activities", {
      id: `tp_a${i}`,
      rider_id: "tp_anna",
      started_at: new Date(`${onDate}T10:00:00Z`),
      on_date: onDate,
      sport: "bike",
      title: `Tur ${i}`,
      moving_seconds: 3600,
      avg_hr: 150,
      max_hr: 200,
      best_powers: curve(280, 18_000, share),
      streams: { t: [], hr: hrStream(Math.round(178 * share), Math.round(196 * share)) },
      source: "fit",
    });
  }
});

afterAll(async () => {
  await admin.end();
});

describe("the threshold proposal", () => {
  it("is the rider's own to ask for, beside what is saved", async () => {
    const p = await proposeThresholds(ANNA, "tp_anna", { today: TODAY });
    expect(p.estimates.ftpWatts).toMatchObject({
      value: Math.round(280 * 0.97),
      method: "criticalPower",
    });
    expect(p.estimates.thresholdHr.value).toBe(Math.round(178 * 0.97));
    expect(p.estimates.maxHr.value).toBe(196);
    expect(p.current.ftpWatts).toBe(240);
    expect(p.read.rides).toBe(5);
    expect(p.read.streams).toBeGreaterThan(0);
    expect(p.read.streams).toBeLessThanOrEqual(5);
    expect(await hasRidesForProposal(ANNA, "tp_anna", TODAY)).toBe(true);
  });

  it("is the coach's to ask for too", async () => {
    const p = await proposeThresholds(COACH, "tp_anna", { today: TODAY });
    expect(p.estimates.ftpWatts.value).toBe(Math.round(280 * 0.97));
  });

  it("is never a teammate's", async () => {
    await expect(proposeThresholds(BO, "tp_anna", { today: TODAY })).rejects.toBeInstanceOf(
      Refused,
    );
    expect(await hasRidesForProposal(BO, "tp_anna", TODAY)).toBe(false);
  });

  it("is a parent's only while the rider shares their training", async () => {
    const p = await proposeThresholds(PARENT, "tp_anna", { today: TODAY });
    expect(p.estimates.ftpWatts.value).not.toBeNull();
    await admin.query(`update riders set share_training = false where id = 'tp_anna'`);
    try {
      await expect(proposeThresholds(PARENT, "tp_anna", { today: TODAY })).rejects.toBeInstanceOf(
        Refused,
      );
    } finally {
      await admin.query(`update riders set share_training = true where id = 'tp_anna'`);
    }
  });

  it("writes nothing", async () => {
    const before = await admin.query(
      `select ftp_watts, threshold_hr, max_hr, resting_hr, thresholds_on, updated_at from riders where id = 'tp_anna'`,
    );
    const audit = await admin.query(`select count(*)::int as n from audit_log where org_id = $1`, [
      ORG,
    ]);
    await proposeThresholds(ANNA, "tp_anna", { today: TODAY });
    const after = await admin.query(
      `select ftp_watts, threshold_hr, max_hr, resting_hr, thresholds_on, updated_at from riders where id = 'tp_anna'`,
    );
    const auditAfter = await admin.query(
      `select count(*)::int as n from audit_log where org_id = $1`,
      [ORG],
    );
    expect(after.rows).toEqual(before.rows);
    expect(auditAfter.rows[0].n).toBe(audit.rows[0].n);
  });
});
