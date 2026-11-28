import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import type { OrgContext } from "@/core/db/tenant";
import { listAiActions, undoAiAction } from "@/modules/mcp/ai-actions";
import { DEFAULT_PERMISSIONS, PERMISSIONS, type Permission } from "@/modules/mcp/permissions";
import { serverFor } from "@/modules/mcp/server";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * A person's own assistant writing and deleting (docs/adr/0120): only what
 * the person switched on, only the person's own, and everything undone by
 * "Fortryd" — a deleted ride with its file and its session. The undo log is
 * the person's alone, and a change made over MCP says so.
 */

const ORG = "org_mcp_writes";
const TODAY = "2026-11-28";
const IDA: OrgContext = { orgId: ORG, userId: "user_mw_ida", channel: "mcp" };
const IDA_APP: OrgContext = { orgId: ORG, userId: "user_mw_ida" };
const COACH: OrgContext = { orgId: ORG, userId: "user_mw_coach", channel: "mcp" };

let admin: Pool;
let app: Client;

async function seed(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, values);
  await admin.query(q.text, q.values);
}

const server = (ctx: OrgContext, riderId: string, permissions: readonly Permission[]) =>
  serverFor({ ctx, riderId, today: TODAY, connectionId: null, permissions }, ["kadence:read"]);

const one = async (sql: string, values: unknown[]) => (await admin.query(sql, values)).rows[0];

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await seedPerson(admin, ORG, IDA.userId, "member");
  await seed("riders", {
    id: "mw_ida",
    org_id: ORG,
    user_id: IDA.userId,
    name: "Ida",
    birth_year: 2008,
  });
  // The coach rides too: their own rider row, and Ida's sessions within reach of a coach.
  await seed("riders", {
    id: "mw_coach",
    org_id: ORG,
    user_id: COACH.userId,
    name: "Træner",
    birth_year: 1980,
  });
  for (const [id, day] of [
    ["mw_s1", "2026-11-29"],
    ["mw_s2", "2026-11-30"],
  ])
    await seed("planned_sessions", {
      id,
      org_id: ORG,
      rider_id: "mw_ida",
      on_date: day,
      sport: "bike",
      title: `Pas ${id}`,
      planned_minutes: 60,
    });
  await seed("activities", {
    id: "mw_ride",
    org_id: ORG,
    rider_id: "mw_ida",
    started_at: "2026-11-27T08:00:00Z",
    on_date: "2026-11-27",
    sport: "bike",
    moving_seconds: 3600,
    source: "fit",
  });
  await seed("activity_files", {
    org_id: ORG,
    rider_id: "mw_ida",
    activity_id: "mw_ride",
    file_name: "tur.fit",
    sha256: "e".repeat(64),
    bytes: Buffer.from("fit-bytes"),
    size_bytes: 9,
  });
  await seed("planned_sessions", {
    id: "mw_done",
    org_id: ORG,
    rider_id: "mw_ida",
    on_date: "2026-11-27",
    sport: "bike",
    title: "Kørt",
    planned_minutes: 60,
    activity_id: "mw_ride",
  });
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe("what an assistant may do", () => {
  it("is what the person switched on, and nothing more", async () => {
    const reading = server(IDA, "mw_ida", DEFAULT_PERMISSIONS);
    expect(await reading.call("skip_my_session", { sessionId: "mw_s1" })).toEqual({
      kind: "unknownTool",
    });
  });

  it("reaches only the person's own, even for a coach who rides", async () => {
    const coach = server(COACH, "mw_coach", PERMISSIONS);
    expect(await coach.call("skip_my_session", { sessionId: "mw_s1" })).toMatchObject({
      kind: "refused",
    });
    expect(
      (await one("select skipped_at from planned_sessions where id = $1", ["mw_s1"])).skipped_at,
    ).toBeNull();
  });
});

describe("Fortryd", () => {
  const ida = () => server(IDA, "mw_ida", PERMISSIONS);
  const lastAction = async () => (await listAiActions(IDA_APP))[0]!;

  it("plans a skipped session again, and the change says it came from the assistant", async () => {
    expect(
      await ida().call("skip_my_session", { sessionId: "mw_s1", reason: "tired" }),
    ).toMatchObject({
      kind: "data",
    });
    expect(
      (await one("select via from session_changes where planned_session_id = $1", ["mw_s1"])).via,
    ).toBe("ai");
    await undoAiAction(IDA_APP, (await lastAction()).id);
    expect(
      (await one("select skipped_at from planned_sessions where id = $1", ["mw_s1"])).skipped_at,
    ).toBeNull();
  });

  it("brings a deleted ride back with its file and on its session", async () => {
    expect(await ida().call("delete_my_ride", { id: "mw_ride" })).toMatchObject({ kind: "data" });
    expect(await one("select id from activities where id = $1", ["mw_ride"])).toBeUndefined();
    await undoAiAction(IDA_APP, (await lastAction()).id);
    expect(await one("select id from activities where id = $1", ["mw_ride"])).toBeDefined();
    const file = await one("select bytes from activity_files where activity_id = $1", ["mw_ride"]);
    expect(Buffer.from(file.bytes).toString()).toBe("fit-bytes");
    expect(
      (await one("select activity_id from planned_sessions where id = $1", ["mw_done"]))
        .activity_id,
    ).toBe("mw_ride");
  });

  it("removes a check-in the assistant made, and only once", async () => {
    const answers = { date: TODAY, sleepQuality: 4, energy: 4, mood: 4, soreness: 4, stress: 4 };
    expect(await ida().call("save_my_checkin", answers)).toMatchObject({ kind: "data" });
    const action = await lastAction();
    await undoAiAction(IDA_APP, action.id);
    expect(
      await one("select id from checkins where rider_id = $1 and on_date = $2", ["mw_ida", TODAY]),
    ).toBeUndefined();
    await expect(undoAiAction(IDA_APP, action.id)).rejects.toMatchObject({ code: "notFound" });
  });

  it("refuses when somebody changed the row since, rather than overwrite them", async () => {
    await ida().call("update_my_session", { sessionId: "mw_s2", title: "Ny titel" });
    const action = await lastAction();
    await admin.query(
      "update planned_sessions set title = 'Trænerens', updated_at = now() + interval '1 second' where id = 'mw_s2'",
    );
    await expect(undoAiAction(IDA_APP, action.id)).rejects.toMatchObject({ code: "conflict" });
  });
});

describe("the undo log", () => {
  it("is the person's alone", async () => {
    const count = (ctx: OrgContext) =>
      asApp(app, ctx, (c) => c.query("select id from ai_actions")).then((r) => r.rowCount ?? 0);
    expect(await count(IDA_APP)).toBeGreaterThan(0);
    expect(await count({ orgId: ORG, userId: COACH.userId })).toBe(0);
  });

  it("notes nothing but the undo after it is written", async () => {
    await expectSqlError(asApp(app, IDA_APP, (c) => c.query("update ai_actions set tool = 'x'")));
  });

  it("will not let a change made in the app say it came from an assistant", async () => {
    await expectSqlError(
      asApp(app, IDA_APP, (c) =>
        c.query(
          `insert into session_changes (org_id, rider_id, kind, from_date, sport, title, planned_minutes, by_role, via, changed_by)
           values ($1, 'mw_ida', 'skipped', '2026-11-29', 'bike', 'x', 60, 'rider', 'ai', $2)`,
          [ORG, IDA.userId],
        ),
      ),
    );
  });
});
