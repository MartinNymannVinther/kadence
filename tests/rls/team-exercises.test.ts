import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { JOINTS } from "@/modules/exercises/types";
import { adminPool, appClient, asApp, asAppCommit, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A team's own exercises and programmes (drizzle/0032), proven as the
 * application role with raw SQL: the team's coach writes them, its rider
 * and parent read them and write nothing, a coach of another team neither
 * reads nor writes them, a context naming a team the caller is not in
 * reads nothing, nobody deletes, and every change lands in the audit log.
 */

const A = { orgId: "org_tex_a", userId: "user_tex_coach_a" };
const RIDER = { orgId: A.orgId, userId: "user_tex_rider_a" };
const PARENT = { orgId: A.orgId, userId: "user_tex_parent_a" };
const B = { orgId: "org_tex_b", userId: "user_tex_coach_b" };

const POSE = {
  joints: Object.fromEntries(JOINTS.map((joint, i) => [joint, [100 + i, 20 + i * 9]])),
  hidden: [],
  props: [{ kind: "floor", y: 122 }],
  arrows: [],
};
const DOSE = { kind: "reps", reps: 10, perSide: false, sets: 2 };
const PARTS = [{ key: "any", items: [{ exercise: "builtin:hipFlexor" }] }];

const exercise = (orgId: string, values: Record<string, unknown> = {}) =>
  insertSql("team_exercises", {
    org_id: orgId,
    name: "Planke",
    group: "core",
    equipment: "{mat}",
    dose: DOSE,
    how: "Hold kroppen lige.",
    pose: POSE,
    ...values,
  });
const program = (orgId: string, values: Record<string, unknown> = {}) =>
  insertSql("team_programs", { org_id: orgId, name: "Morgen", parts: PARTS, ...values });

let admin: Pool;
let app: Client;

async function seed(q: { text: string; values: unknown[] }) {
  await admin.query(q.text, q.values);
}

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, A.orgId, A.userId, "owner");
  await seedPerson(admin, A.orgId, RIDER.userId, "member");
  await seedPerson(admin, A.orgId, PARENT.userId, "member");
  await seedPerson(admin, B.orgId, B.userId, "owner");
  await seed(
    insertSql("riders", {
      org_id: A.orgId,
      id: "tex_rider",
      user_id: RIDER.userId,
      name: "Ida",
      birth_year: 2010,
    }),
  );
  await seed(
    insertSql("guardians", {
      org_id: A.orgId,
      rider_id: "tex_rider",
      user_id: PARENT.userId,
      name: "Mor",
      confirmed_at: new Date(),
    }),
  );
  for (const [ctx, s] of [
    [A, "a"],
    [B, "b"],
  ] as const) {
    await seed(exercise(ctx.orgId, { id: `tex_ex_${s}` }));
    await seed(program(ctx.orgId, { id: `tex_pr_${s}` }));
  }
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe.each(["team_exercises", "team_programs"])("%s", (table) => {
  const own = table === "team_exercises" ? "tex_ex_a" : "tex_pr_a";
  const insert = (orgId: string) => (table === "team_exercises" ? exercise(orgId) : program(orgId));

  it("is read by everyone on the team: coach, rider and parent", async () => {
    for (const who of [A, RIDER, PARENT]) {
      const rows = await asApp(app, who, (c) => c.query(`select id, org_id from "${table}"`));
      expect(rows.rows).toEqual([{ id: own, org_id: A.orgId }]);
    }
  });

  it("is written by the team's coach", async () => {
    const q = insert(A.orgId);
    expect((await asApp(app, A, (c) => c.query(q.text, q.values))).rowCount).toBe(1);
    const changed = await asApp(app, A, (c) =>
      c.query(`update "${table}" set archived = true where id = $1`, [own]),
    );
    expect(changed.rowCount).toBe(1);
  });

  it("is never written by the team's rider or parent", async () => {
    for (const who of [RIDER, PARENT]) {
      const q = insert(A.orgId);
      expect(await expectSqlError(asApp(app, who, (c) => c.query(q.text, q.values)))).toBe("42501");
      const changed = await asApp(app, who, (c) =>
        c.query(`update "${table}" set name = 'x' where id = $1`, [own]),
      );
      expect(changed.rowCount).toBe(0);
    }
  });

  it("is neither read nor written by a coach of another team", async () => {
    const rows = await asApp(app, B, (c) =>
      c.query(`select 1 from "${table}" where id = $1`, [own]),
    );
    expect(rows.rows).toEqual([]);
    const changed = await asApp(app, B, (c) =>
      c.query(`update "${table}" set name = 'x' where id = $1`, [own]),
    );
    expect(changed.rowCount).toBe(0);
    const q = insert(A.orgId);
    expect(await expectSqlError(asApp(app, B, (c) => c.query(q.text, q.values)))).toBe("42501");
  });

  it("reads nothing for a context naming a team the caller is not in", async () => {
    const stranger = { orgId: A.orgId, userId: B.userId };
    const rows = await asApp(app, stranger, (c) => c.query(`select 1 from "${table}"`));
    expect(rows.rows).toEqual([]);
    const none = await asApp(app, null, (c) => c.query(`select 1 from "${table}"`));
    expect(none.rows).toEqual([]);
  });

  it("is deleted by nobody, not even the team's coach: it is archived instead", async () => {
    const code = await expectSqlError(
      asApp(app, A, (c) => c.query(`delete from "${table}" where id = $1`, [own])),
    );
    expect(code).toBe("42501");
  });

  it("records every change in the audit log, with who made it", async () => {
    await asAppCommit(app, A, (c) =>
      c.query(`update "${table}" set name = 'Omdøbt' where id = $1`, [own]),
    );
    const rows = await admin.query(
      `select action, actor_user_id, org_id from audit_log
       where entity_type = $1 and entity_id = $2 and action = $3`,
      [table, own, `${table}.update`],
    );
    expect(rows.rows).toContainEqual({
      action: `${table}.update`,
      actor_user_id: A.userId,
      org_id: A.orgId,
    });
  });
});

describe("what the database itself refuses", () => {
  const refused = async (q: { text: string; values: unknown[] }) =>
    expectSqlError(asApp(app, A, (c) => c.query(q.text, q.values)));

  it("a group or a piece of equipment it does not know", async () => {
    expect(await refused(exercise(A.orgId, { group: "cardio" }))).toBe("23514");
    expect(await refused(exercise(A.orgId, { equipment: "{mat,trampoline}" }))).toBe("23514");
  });

  it("names and texts past their length, and an empty name", async () => {
    expect(await refused(exercise(A.orgId, { name: "" }))).toBe("23514");
    expect(await refused(exercise(A.orgId, { name: "x".repeat(61) }))).toBe("23514");
    expect(await refused(exercise(A.orgId, { how: "x".repeat(501) }))).toBe("23514");
    expect(await refused(exercise(A.orgId, { why: "x".repeat(301) }))).toBe("23514");
    expect(await refused(program(A.orgId, { description: "x".repeat(301) }))).toBe("23514");
  });

  it("JSON of the wrong kind or past its size", async () => {
    expect(await refused(exercise(A.orgId, { pose: "[]" }))).toBe("23514");
    expect(await refused(exercise(A.orgId, { dose: "1" }))).toBe("23514");
    expect(await refused(exercise(A.orgId, { pose: { pad: "x".repeat(9000) } }))).toBe("23514");
    expect(await refused(program(A.orgId, { parts: "{}" }))).toBe("23514");
    expect(await refused(program(A.orgId, { parts: ["x".repeat(33000)] }))).toBe("23514");
  });
});
