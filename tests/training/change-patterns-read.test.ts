import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import { getInsights } from "@/modules/insight/service";
import { skipSession } from "@/modules/training/session-move";
import { patternsFor, riderChanges } from "@/modules/training/session-changes";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * What a rider's changes tell (docs/adr/0119): the coach's attention list
 * warns when sessions were dropped for pain twice in a week, the rider's
 * page and the planner see the patterns, and a parent reads the changes
 * without the words beside them.
 */

const ORG = "org_change_patterns";
const COACH = { orgId: ORG, userId: "user_cp_coach" };
const IDA = { orgId: ORG, userId: "user_cp_ida" };
const MOR = { orgId: ORG, userId: "user_cp_mor" };
const TODAY = todayInCopenhagen();

let admin: Pool;

async function seed(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, values);
  await admin.query(q.text, q.values);
}

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [IDA, MOR]) await seedPerson(admin, ORG, p.userId, "member");
  await seed("riders", {
    id: "cp_ida",
    org_id: ORG,
    user_id: IDA.userId,
    name: "Ida",
    birth_year: 2009,
  });
  await seed("guardians", {
    org_id: ORG,
    rider_id: "cp_ida",
    user_id: MOR.userId,
    name: "Mor",
    confirmed_at: new Date(),
  });
  // Two sessions this week dropped for pain, three a week apart for school.
  const sessions: [string, string][] = [
    ["cp_p1", addDaysIso(TODAY, -1)],
    ["cp_p2", addDaysIso(TODAY, -3)],
    ["cp_s1", addDaysIso(TODAY, -14)],
    ["cp_s2", addDaysIso(TODAY, -21)],
    ["cp_s3", addDaysIso(TODAY, -28)],
  ];
  for (const [id, onDate] of sessions)
    await seed("planned_sessions", {
      id,
      org_id: ORG,
      rider_id: "cp_ida",
      on_date: onDate,
      sport: "bike",
      title: id,
      planned_minutes: 60,
    });
  for (const id of ["cp_p1", "cp_p2"])
    await skipSession(IDA, id, { reason: "pain", note: "Knæet driller" });
  for (const id of ["cp_s1", "cp_s2", "cp_s3"]) await skipSession(IDA, id, { reason: "school" });
});

afterAll(async () => {
  await admin.end();
});

describe("what the changes tell", () => {
  it("warn the coach of sessions dropped for pain twice in a week", async () => {
    const [ida] = await getInsights(COACH, { riderIds: ["cp_ida"], today: TODAY });
    expect(ida!.flags).toContainEqual(
      expect.objectContaining({ kind: "changed_for_pain", severity: "warn", values: { count: 2 } }),
    );
  });

  it("show the reasons and the patterns on the rider's page, with the rider's words", async () => {
    const { summary, recent } = await riderChanges(COACH, "cp_ida", TODAY);
    expect(summary).toMatchObject({ moved: 0, skipped: 5 });
    expect(summary.patterns).toContainEqual(
      expect.objectContaining({ key: "reason", reason: "school", count: 3, total: 5 }),
    );
    expect(recent.some((c) => c.note === "Knæet driller")).toBe(true);
  });

  it("give the planner the patterns of the riders who have any", async () => {
    const patterns = await patternsFor(COACH, ["cp_ida", "nobody"], TODAY);
    expect(Object.keys(patterns)).toEqual(["cp_ida"]);
  });

  it("let a parent read the changes, never the words", async () => {
    const { recent } = await riderChanges(MOR, "cp_ida", TODAY);
    expect(recent.length).toBeGreaterThan(0);
    expect(recent.every((c) => c.note === null)).toBe(true);
  });
});
