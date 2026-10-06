import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import {
  archiveTeamExercise,
  createTeamExercise,
  getTeamExercise,
  listTeamExercises,
  updateTeamExercise,
} from "@/modules/exercises/team-exercises";
import { adminPool } from "../helpers/db";
import { PLANK, POSE, seedTeam, type Team } from "./team-fixtures";

/**
 * A team's own exercises through the services: a coach makes, changes and
 * archives them; a rider and a parent read them and change nothing; what
 * does not fit the contract is refused before it reaches the database; an
 * id of another team's is not found; and every change is audited.
 */

let admin: Pool;
let a: Team;
let b: Team;
let plankId: string;

beforeAll(async () => {
  admin = adminPool();
  a = await seedTeam(admin, "texs_a");
  b = await seedTeam(admin, "texs_b");
});

afterAll(async () => {
  await admin.end();
});

describe("a team's own exercise", () => {
  it("is made by a coach and read by the whole team", async () => {
    const made = await createTeamExercise(a.coach, PLANK);
    plankId = made.id;
    expect(made.ref).toBe(`team:${made.id}`);
    expect(made.id).toMatch(/^[0-9a-f-]{36}$/);
    for (const who of [a.coach, a.rider, a.parent]) {
      const [plank] = await listTeamExercises(who);
      expect(plank).toMatchObject({
        id: plankId,
        ref: `team:${plankId}`,
        name: "Planke",
        group: "core",
        equipment: ["mat"],
        // The contract's defaults, filled in on the way in.
        dose: { kind: "time", seconds: 45, perSide: false, sets: 1 },
        archived: false,
      });
      expect(plank!.pose.joints.head).toEqual(POSE.joints.head);
    }
  });

  it("is made or changed by no rider and no parent", async () => {
    for (const who of [a.rider, a.parent]) {
      await expect(createTeamExercise(who, PLANK)).rejects.toMatchObject({ code: "forbidden" });
      await expect(updateTeamExercise(who, plankId, PLANK)).rejects.toMatchObject({
        code: "forbidden",
      });
      await expect(archiveTeamExercise(who, plankId)).rejects.toMatchObject({ code: "forbidden" });
    }
  });

  it("refuses a figure outside its box, a dose out of range and an unknown group", async () => {
    const outside = structuredClone(POSE);
    outside.joints.head = [300, 20];
    for (const draft of [
      { ...PLANK, pose: outside },
      { ...PLANK, pose: { ...POSE, arrows: [1, 2, 3, 4] } },
      { ...PLANK, dose: { kind: "time", seconds: 1 } },
      { ...PLANK, dose: { kind: "reps", reps: 0 } },
      { ...PLANK, group: "cardio" },
      { ...PLANK, equipment: ["trampoline"] },
      { ...PLANK, name: "   " },
    ]) {
      await expect(createTeamExercise(a.coach, draft as never)).rejects.toMatchObject({
        code: "invalid",
      });
    }
  });

  it("keeps each piece of equipment once, in the contract's order", async () => {
    const made = await createTeamExercise(a.coach, {
      ...PLANK,
      name: "Bænkdip",
      equipment: ["bench", "mat", "bench"],
    });
    expect((await getTeamExercise(a.coach, made.id))!.equipment).toEqual(["mat", "bench"]);
    await archiveTeamExercise(a.coach, made.id);
  });

  it("is changed by a coach", async () => {
    await updateTeamExercise(a.coach, plankId, {
      ...PLANK,
      name: "Sideplanke",
      dose: { kind: "time", seconds: 30, perSide: true },
    });
    const plank = await getTeamExercise(a.rider, plankId);
    expect(plank).toMatchObject({
      name: "Sideplanke",
      dose: { kind: "time", seconds: 30, perSide: true, sets: 1 },
    });
  });

  it("is not found by another team, which can neither read nor change it", async () => {
    expect(await getTeamExercise(b.coach, plankId)).toBeNull();
    expect(await listTeamExercises(b.coach, { includeArchived: true })).toEqual([]);
    await expect(updateTeamExercise(b.coach, plankId, PLANK)).rejects.toMatchObject({
      code: "notFound",
    });
    await expect(archiveTeamExercise(b.coach, plankId)).rejects.toMatchObject({
      code: "notFound",
    });
    expect((await getTeamExercise(a.coach, plankId))!.name).toBe("Sideplanke");
  });

  it("leaves the list when archived, and comes back when asked for", async () => {
    await archiveTeamExercise(a.coach, plankId);
    expect(await listTeamExercises(a.rider)).toEqual([]);
    const all = await listTeamExercises(a.coach, { includeArchived: true });
    expect(all.map((e) => [e.name, e.archived]).sort()).toEqual([
      ["Bænkdip", true],
      ["Sideplanke", true],
    ]);
    expect((await getTeamExercise(a.rider, plankId))!.archived).toBe(true);
    await archiveTeamExercise(a.coach, plankId, false);
    expect((await listTeamExercises(a.rider)).map((e) => e.id)).toEqual([plankId]);
  });

  it("is audited: who made it, who changed it, who archived it", async () => {
    const { rows } = await admin.query(
      `select action, actor_user_id from audit_log
       where entity_type = 'team_exercises' and entity_id = $1 order by created_at, id`,
      [plankId],
    );
    expect(rows[0]).toEqual({ action: "team_exercises.insert", actor_user_id: a.coach.userId });
    expect(rows.slice(1).map((r) => r.action)).toEqual([
      "team_exercises.update",
      "team_exercises.update",
      "team_exercises.update",
    ]);
    expect(rows.every((r) => r.actor_user_id === a.coach.userId)).toBe(true);
  });
});
