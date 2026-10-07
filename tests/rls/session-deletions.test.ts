import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import {
  adminPool,
  appClient,
  asApp,
  asAppCommit,
  expectSqlError,
  type TenantContext,
} from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Deleted sessions in a rider's next days (drizzle/0035, docs/adr/0060)
 * and who last changed a session, proven as the application role with raw
 * SQL — what any bug in a service could do, and no more. A deletion is the
 * rider's training: the coaches, the rider and a parent the rider shares
 * training with read it, a teammate and another team do not, it is written
 * only in the writer's own name, nobody changes or removes it, and the
 * sweep takes only what is past seven days. `updated_by` is always the
 * caller, whatever the statement says.
 */

const ORG = "org_psd";
const OTHER_ORG = "org_psd_other";
const COACH = { orgId: ORG, userId: "user_psd_coach" };
const R1 = { orgId: ORG, userId: "user_psd_r1" };
const R2 = { orgId: ORG, userId: "user_psd_r2" };
const PARENT = { orgId: ORG, userId: "user_psd_parent" };
const STRANGER = { orgId: OTHER_ORG, userId: "user_psd_stranger" };
const DAY = "2026-11-04";

let admin: Pool;
let app: Client;

const deletion = (values: Record<string, unknown>) =>
  insertSql("planned_session_deletions", {
    org_id: ORG,
    rider_id: "psd_r1",
    on_date: DAY,
    title: "Intervaller",
    deleted_by: COACH.userId,
    ...values,
  });

const visible = (who: TenantContext) =>
  asApp(app, who, (c) =>
    c.query("select id from planned_session_deletions where id like 'psd_%' order by id"),
  ).then((r) => r.rows.map((row) => row.id as string));

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner", "Slettede pas");
  for (const p of [R1, R2, PARENT]) await seedPerson(admin, ORG, p.userId, "member");
  await seedPerson(admin, OTHER_ORG, STRANGER.userId, "owner", "Andet hold");
  for (const [id, user] of [
    ["psd_r1", R1],
    ["psd_r2", R2],
  ] as const) {
    const q = insertSql("riders", {
      id,
      org_id: ORG,
      user_id: user.userId,
      name: id,
      birth_year: 2010,
      share_training: false,
    });
    await admin.query(q.text, q.values);
  }
  const guardian = insertSql("guardians", {
    id: "psd_g",
    org_id: ORG,
    rider_id: "psd_r1",
    user_id: PARENT.userId,
    name: "Mor",
    confirmed_at: new Date(),
  });
  await admin.query(guardian.text, guardian.values);
  for (const [id, riderId] of [
    ["psd_d1", "psd_r1"],
    ["psd_d2", "psd_r2"],
  ]) {
    const q = deletion({ id, rider_id: riderId });
    await admin.query(q.text, q.values);
  }
  const session = insertSql("planned_sessions", {
    id: "psd_s",
    org_id: ORG,
    rider_id: "psd_r1",
    on_date: DAY,
    sport: "bike",
    title: "Pas",
    created_by: COACH.userId,
  });
  await admin.query(session.text, session.values);
});

afterAll(async () => {
  await admin.query("delete from organizations where id in ($1, $2)", [ORG, OTHER_ORG]);
  await app.end();
  await admin.end();
});

describe("who reads a deleted session", () => {
  it("the coaches and the rider, never a teammate", async () => {
    expect(await visible(COACH)).toEqual(["psd_d1", "psd_d2"]);
    expect(await visible(R1)).toEqual(["psd_d1"]);
    expect(await visible(R2)).toEqual(["psd_d2"]);
  });

  it("a parent only while the rider shares training", async () => {
    expect(await visible(PARENT)).toEqual([]);
    await admin.query("update riders set share_training = true where id = 'psd_r1'");
    try {
      expect(await visible(PARENT)).toEqual(["psd_d1"]);
    } finally {
      await admin.query("update riders set share_training = false where id = 'psd_r1'");
    }
  });

  it("nobody from another team, nor without a context", async () => {
    expect(await visible(STRANGER)).toEqual([]);
    expect(await visible({ orgId: ORG, userId: STRANGER.userId })).toEqual([]);
    expect(await visible(null)).toEqual([]);
  });
});

describe("who writes one", () => {
  it("a coach or the rider, in their own name", async () => {
    const mine = deletion({});
    expect((await asApp(app, COACH, (c) => c.query(mine.text, mine.values))).rowCount).toBe(1);
    const forged = deletion({ deleted_by: R2.userId });
    expect(
      await expectSqlError(asApp(app, COACH, (c) => c.query(forged.text, forged.values))),
    ).toBe("42501");
  });

  it("not a teammate, a parent or another team", async () => {
    const teammate = deletion({ deleted_by: R2.userId });
    expect(
      await expectSqlError(asApp(app, R2, (c) => c.query(teammate.text, teammate.values))),
    ).toBe("42501");
    const parent = deletion({ deleted_by: PARENT.userId });
    expect(
      await expectSqlError(asApp(app, PARENT, (c) => c.query(parent.text, parent.values))),
    ).toBe("42501");
    const here = deletion({ deleted_by: STRANGER.userId });
    expect(await expectSqlError(asApp(app, STRANGER, (c) => c.query(here.text, here.values)))).toBe(
      "42501",
    );
    // Naming this team's rider from the stranger's own team.
    const there = deletion({ org_id: OTHER_ORG, deleted_by: STRANGER.userId });
    expect(
      await expectSqlError(asApp(app, STRANGER, (c) => c.query(there.text, there.values))),
    ).toBe("42501");
  });

  it("nobody changes or removes one, the coach included", async () => {
    for (const statement of [
      "update planned_session_deletions set title = 'x' where id = 'psd_d1'",
      "delete from planned_session_deletions where id = 'psd_d1'",
    ])
      expect(await expectSqlError(asApp(app, COACH, (c) => c.query(statement))), statement).toBe(
        "42501",
      );
  });

  it("every one lands in the audit trail", async () => {
    await asApp(app, COACH, async (c) => {
      const q = deletion({ id: "psd_audited" });
      await c.query(q.text, q.values);
      const rows = await c.query(
        "select actor_user_id from audit_log where entity_type = 'planned_session_deletions' and entity_id = 'psd_audited'",
      );
      expect(rows.rows).toEqual([{ actor_user_id: COACH.userId }]);
    });
  });
});

describe("the sweep", () => {
  it("removes only what is past seven days, with nobody signed in", async () => {
    const old = deletion({ id: "psd_old", deleted_at: new Date(Date.now() - 8 * 86_400_000) });
    await admin.query(old.text, old.values);
    const swept = await asAppCommit(app, null, (c) =>
      c.query("select planned_session_deletions_sweep() as n"),
    );
    expect(swept.rows[0].n).toBeGreaterThanOrEqual(1);
    const left = await admin.query(
      "select id from planned_session_deletions where id like 'psd_%' order by id",
    );
    expect(left.rows.map((r) => r.id)).toEqual(["psd_d1", "psd_d2"]);
  });
});

describe("who last changed a session", () => {
  it("is the caller, whatever the statement names", async () => {
    const updated = await asApp(app, R1, (c) =>
      c.query(
        `update planned_sessions set title = 'Rettet', updated_by = $1, updated_at = now()
         where id = 'psd_s' returning updated_by`,
        [COACH.userId],
      ),
    );
    expect(updated.rows).toEqual([{ updated_by: R1.userId }]);
    const made = insertSql("planned_sessions", {
      org_id: ORG,
      rider_id: "psd_r1",
      on_date: DAY,
      sport: "bike",
      title: "Nyt",
      created_by: COACH.userId,
      updated_by: R2.userId,
    });
    const inserted = await asApp(app, COACH, (c) =>
      c.query(`${made.text} returning updated_by`, made.values),
    );
    expect(inserted.rows).toEqual([{ updated_by: COACH.userId }]);
  });
});
