import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import {
  EQUIPMENT,
  EXERCISE_GROUPS,
  JOINTS,
  LIMBS,
  PART_KEYS,
  poseSchema,
  programPartsSchema,
} from "@/modules/exercises/types";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The database's own checks on a team's exercises and programmes
 * (drizzle/0032, the equipment's since drizzle/0033) agree with the contract (src/modules/exercises/types.ts):
 * the lists it accepts are the contract's lists, and its size caps leave
 * room for the largest pose and programme the contract allows.
 */

const ORG = "org_tex_schema";
let admin: Pool;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, "user_tex_schema", "owner");
});

afterAll(async () => {
  await admin.end();
});

/** The quoted words in a check constraint, sorted. */
async function listIn(constraint: string): Promise<string[]> {
  const { rows } = await admin.query(
    `select pg_get_constraintdef(oid) as def from pg_constraint where conname = $1`,
    [constraint],
  );
  return [...(rows[0].def as string).matchAll(/'([a-zA-Z]+)'/g)].map((m) => m[1]!).sort();
}

/** A number as long as a coordinate can print: what a drawing tool's arithmetic leaves. */
const long = (n: number) => n - 1e-13;

describe("the team exercise tables", () => {
  it("accept exactly the contract's groups and equipment", async () => {
    expect(await listIn("team_exercises_group")).toEqual([...EXERCISE_GROUPS].sort());
    expect(await listIn("team_exercises_equipment")).toEqual([...EQUIPMENT].sort());
  });

  it("hold the largest pose the contract allows", async () => {
    const at = (): [number, number] => [long(239), long(139)];
    const pose = poseSchema.parse({
      joints: Object.fromEntries(JOINTS.map((joint) => [joint, at()])),
      hidden: [...LIMBS],
      // TRX straps are the prop with the most points: an anchor and two handles.
      props: Array.from({ length: 6 }, () => ({
        kind: "trx",
        anchor: at(),
        handleA: at(),
        handleB: at(),
      })),
      arrows: Array.from({ length: 3 }, () => ({ from: at(), to: at(), bend: long(1) })),
    });
    const q = insertSql("team_exercises", {
      org_id: ORG,
      name: "x".repeat(60),
      group: "mobility",
      equipment: `{${EQUIPMENT.join(",")}}`,
      dose: { kind: "time", seconds: 600, perSide: false, sets: 10, load: "moderate" },
      how: "x".repeat(500),
      why: "x".repeat(300),
      pose,
    });
    expect((await admin.query(q.text, q.values)).rowCount).toBe(1);
  });

  it("refuse equipment the contract does not know", async () => {
    const q = insertSql("team_exercises", {
      org_id: ORG,
      name: "Leg press",
      group: "legs",
      equipment: "{barbell,legPress}",
      dose: { kind: "reps", reps: 10, perSide: false, sets: 3 },
      how: "x",
      pose: poseSchema.parse({
        joints: Object.fromEntries(JOINTS.map((joint) => [joint, [120, 70]])),
      }),
    });
    await expect(admin.query(q.text, q.values)).rejects.toThrow(/team_exercises_equipment/);
  });

  it("hold the largest programme the contract allows", async () => {
    const parts = programPartsSchema.parse(
      PART_KEYS.map((key) => ({
        key,
        items: Array.from({ length: 20 }, () => ({
          exercise: `builtin:a${"b".repeat(40)}`,
          dose: { kind: "time", seconds: 600, perSide: true, sets: 10, load: "moderate" },
        })),
      })),
    );
    const q = insertSql("team_programs", {
      org_id: ORG,
      name: "x".repeat(60),
      description: "x".repeat(300),
      parts,
    });
    expect((await admin.query(q.text, q.values)).rowCount).toBe(1);
  });
});
