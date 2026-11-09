import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { completeSession } from "@/modules/training/complete";
import { moveSession, skipSession, unskipSession } from "@/modules/training/session-move";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Moving and skipping a session with a reason (docs/adr/0117): the rider
 * and the coach may, a teammate and a parent may not; every change is
 * written down as who made it, in their own role; a parent reads the
 * change and its reason but never the words beside it; another team sees
 * nothing; and a row is never changed afterwards.
 */

const ORG = "org_session_changes";
const OTHER = "org_session_changes_other";
const COACH = { orgId: ORG, userId: "user_sc_coach" };
const ANNA = { orgId: ORG, userId: "user_sc_anna" };
const BO = { orgId: ORG, userId: "user_sc_bo" };
const MOR = { orgId: ORG, userId: "user_sc_mor" };
const STRANGER = { orgId: OTHER, userId: "user_sc_stranger" };

let admin: Pool;
let app: Client;

async function seed(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, values);
  await admin.query(q.text, q.values);
}

const session = (id: string, onDate: string) =>
  seed("planned_sessions", {
    id,
    org_id: ORG,
    rider_id: "sc_anna",
    on_date: onDate,
    sport: "bike",
    title: `Pas ${id}`,
    planned_minutes: 90,
  });

const row = async (id: string) =>
  (await admin.query("select * from planned_sessions where id = $1", [id])).rows[0] as {
    on_date: string;
    skipped_at: Date | null;
    skip_reason: string | null;
    activity_id: string | null;
  };

const changesOf = async (sessionId: string) =>
  (
    await admin.query(
      "select kind, reason, by_role, changed_by, to_date from session_changes where planned_session_id = $1 order by changed_at",
      [sessionId],
    )
  ).rows as { kind: string; reason: string | null; by_role: string; changed_by: string }[];

const seen = (ctx: typeof COACH, sql: string) =>
  asApp(app, ctx, (c) => c.query(sql)).then((r) => r.rowCount ?? 0);

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  for (const p of [ANNA, BO, MOR]) await seedPerson(admin, ORG, p.userId, "member");
  await seedPerson(admin, OTHER, STRANGER.userId, "owner");
  for (const [id, uid] of [
    ["sc_anna", ANNA.userId],
    ["sc_bo", BO.userId],
  ])
    await seed("riders", { id, org_id: ORG, user_id: uid, name: id, birth_year: 2009 });
  await seed("guardians", {
    org_id: ORG,
    rider_id: "sc_anna",
    user_id: MOR.userId,
    name: "Mor",
    confirmed_at: new Date(),
  });
  await session("sc_1", "2026-11-10");
  await session("sc_2", "2026-11-11");
  await session("sc_3", "2026-11-12");
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe("skipping a session", () => {
  it("leaves it on its day, grey, with the reason, and writes down the rider's words", async () => {
    await skipSession(ANNA, "sc_1", { reason: "ill", note: "Feber siden i går" });
    const after = await row("sc_1");
    expect(after.skipped_at).not.toBeNull();
    expect(after.skip_reason).toBe("ill");
    expect(await changesOf("sc_1")).toEqual([
      expect.objectContaining({ kind: "skipped", reason: "ill", by_role: "rider" }),
    ]);
    const notes = await admin.query(
      "select n.note from session_change_notes n join session_changes c on c.id = n.change_id where c.planned_session_id = 'sc_1'",
    );
    expect(notes.rows.map((r) => r.note)).toEqual(["Feber siden i går"]);
  });

  it("is taken back with Fortryd, and the change says so", async () => {
    await unskipSession(ANNA, "sc_1");
    expect((await row("sc_1")).skipped_at).toBeNull();
    expect((await changesOf("sc_1")).map((c) => c.kind)).toEqual(["skipped", "unskipped"]);
  });

  it("is refused to a teammate and to a parent", async () => {
    await expect(skipSession(BO, "sc_2", { reason: "tired" })).rejects.toBeTruthy();
    await expect(skipSession(MOR, "sc_2", { reason: "tired" })).rejects.toBeTruthy();
    expect((await row("sc_2")).skipped_at).toBeNull();
  });

  it("is refused once the session is done", async () => {
    await skipSession(COACH, "sc_3", {});
    await completeSession(ANNA, "sc_3", {
      rpe: 5,
      feel: null,
      note: "",
      minutes: 60,
      distanceKm: null,
    });
    // Done after all: the skip is gone.
    expect((await row("sc_3")).skipped_at).toBeNull();
    await expect(skipSession(COACH, "sc_3", {})).rejects.toMatchObject({ code: "invalid" });
  });
});

describe("moving a session", () => {
  it("writes the coach's move down as the coach's, with the reason, and brings a skip back", async () => {
    await skipSession(ANNA, "sc_2", { reason: "school" });
    await moveSession(COACH, "sc_2", "2026-11-13", false, undefined, { reason: "school" });
    const after = await row("sc_2");
    expect(String(after.on_date)).toContain("2026");
    expect(after.skipped_at).toBeNull();
    expect((await changesOf("sc_2")).at(-1)).toMatchObject({
      kind: "moved",
      reason: "school",
      by_role: "coach",
      changed_by: COACH.userId,
    });
  });

  it("writes nothing when the day is the same", async () => {
    const before = (await changesOf("sc_2")).length;
    await moveSession(ANNA, "sc_2", "2026-11-13");
    expect((await changesOf("sc_2")).length).toBe(before);
  });
});

describe("who reads the changes", () => {
  const changes = "select id from session_changes";
  const notes = "select change_id from session_change_notes";

  it("the coach and the rider read the changes and the words", async () => {
    expect(await seen(COACH, changes)).toBeGreaterThan(0);
    expect(await seen(COACH, notes)).toBe(1);
    expect(await seen(ANNA, notes)).toBe(1);
  });

  it("a parent reads the changes and their reasons, never the words", async () => {
    expect(await seen(MOR, changes)).toBeGreaterThan(0);
    expect(await seen(MOR, notes)).toBe(0);
  });

  it("a teammate and another team read nothing", async () => {
    expect(await seen(BO, changes)).toBe(0);
    expect(await seen(BO, notes)).toBe(0);
    expect(await seen(STRANGER, changes)).toBe(0);
  });
});

describe("the rows themselves", () => {
  const insert = (ctx: typeof COACH, byRole: string, changedBy: string) =>
    asApp(app, ctx, (c) =>
      c.query(
        `insert into session_changes (org_id, rider_id, kind, from_date, sport, title, planned_minutes, by_role, changed_by)
         values ($1, 'sc_anna', 'skipped', '2026-11-10', 'bike', 'x', 60, $2, $3)`,
        [ORG, byRole, changedBy],
      ),
    );

  it("are written in the writer's own role and name", async () => {
    await expectSqlError(insert(ANNA, "coach", ANNA.userId));
    await expectSqlError(insert(COACH, "rider", COACH.userId));
    await expectSqlError(insert(COACH, "coach", ANNA.userId));
    await expect(insert(COACH, "coach", COACH.userId)).resolves.toBeTruthy();
  });

  it("are never changed or removed by the app", async () => {
    await expectSqlError(
      asApp(app, COACH, (c) => c.query(`update session_changes set reason = 'other'`)),
    );
    await expectSqlError(asApp(app, COACH, (c) => c.query(`delete from session_changes`)));
  });
});
