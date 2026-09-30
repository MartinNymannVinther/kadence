import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { rulleStart } from "@/modules/rulle/service";
import { whoAmI } from "@/modules/team/access";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * What Rulle starts from (ADR 0035): besides the session planned for today,
 * the team's own bike sessions from the library, to choose when none is.
 * A rider reads the library as every member does; only bike sessions with
 * steps to ride are offered, never an archived one, never another team's.
 */

const ORG = "org_rulle_start";
const OTHER = "org_rulle_start_b";
const IDA = { orgId: ORG, userId: "user_rstart_ida" };
const COACH = { orgId: ORG, userId: "user_rstart_coach" };
const DAY = "2026-11-12";

let admin: Pool;

const steps = (zone: number) => ({
  kind: "bike",
  steps: [{ kind: "step", intent: "work", seconds: 600, target: { kind: "zone", zone } }],
});

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await seedPerson(admin, ORG, IDA.userId, "member");
  await seedPerson(admin, OTHER, "user_rstart_bo", "owner");
  const rider = insertSql("riders", {
    org_id: ORG,
    id: "rstart_ida",
    user_id: IDA.userId,
    name: "Ida Holm",
    birth_year: 2009,
    ftp_watts: 230,
  });
  await admin.query(rider.text, rider.values);
  const templates = [
    { org_id: ORG, id: "rstart_tempo", name: "Holdets tempo", sport: "bike", structure: steps(3) },
    {
      org_id: ORG,
      id: "rstart_empty",
      name: "Uden trin",
      sport: "bike",
      structure: { kind: "bike", steps: [] },
    },
    {
      org_id: ORG,
      id: "rstart_old",
      name: "Gammelt pas",
      sport: "bike",
      structure: steps(4),
      archived: true,
    },
    {
      org_id: ORG,
      id: "rstart_legs",
      name: "Ben",
      sport: "strength",
      structure: { kind: "strength", exercises: [] },
    },
    { org_id: OTHER, id: "rstart_bo", name: "Andet holds pas", sport: "bike", structure: steps(2) },
  ];
  for (const t of templates) {
    const q = insertSql("workout_templates", { planned_minutes: 10, ...t });
    await admin.query(q.text, q.values);
  }
});

afterAll(async () => {
  await admin.end();
});

describe("what a rider can choose in Rulle", () => {
  it("is the team's own bike sessions with steps, and nothing else", async () => {
    const start = await rulleStart(IDA, await whoAmI(IDA.orgId, IDA.userId), null, DAY);
    expect(start.library.map((t) => [t.id, t.title])).toEqual([["rstart_tempo", "Holdets tempo"]]);
    expect(start.library[0]!.structure.steps).toHaveLength(1);
    expect(start.riderId).toBe("rstart_ida");
  });

  it("is the same library for a coach, who rides it as a trial", async () => {
    const start = await rulleStart(COACH, await whoAmI(COACH.orgId, COACH.userId), null, DAY);
    expect(start.library.map((t) => t.id)).toEqual(["rstart_tempo"]);
    expect(start.riderId).toBeNull();
  });
});
