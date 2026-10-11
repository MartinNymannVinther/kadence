import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { adminPool, appClient, asApp, asAppCommit, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * The history follows the rider (docs/adr/0081): `move_rider_history`
 * (drizzle/0046) moves every row carrying one rider's id from their rider
 * row in one workspace onto their rider row in another. It is the first
 * function that writes across two workspaces, so it is tried here as the
 * application role with raw SQL — what any bug in a service could do —
 * and adversarially: the rider can, a coach in both workspaces cannot, a
 * stranger cannot, a target with history is refused, and a failure half
 * way leaves nothing moved.
 *
 * Two workspaces: ALONE, a person's own with their training, and TEAM,
 * where a coach prepared a rider row for the same person. The coach
 * coaches both; the stranger belongs to both and rides in neither.
 */

const ALONE = "org_hm_alone";
const TEAM = "org_hm_team";
const RIDER = "user_hm_rider";
const COACH = "user_hm_coach";
const STRANGER = "user_hm_stranger";
const FROM = "hm_r_alone";
const TO = "hm_r_team";
const DAY = "2026-11-02";
const KEY_HASH = "c3".repeat(32);

let admin: Pool;
let app: Client;

async function seed(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, { org_id: ALONE, ...values });
  await admin.query(q.text, q.values);
}

const where = (table: string, rider: string) =>
  admin
    .query(`select count(*)::int as n, min(org_id) as org from "${table}" where rider_id = $1`, [
      rider,
    ])
    .then((r) => r.rows[0] as { n: number; org: string | null });

/** A second membership for somebody seedPerson already made (its id is per person). */
async function alsoMemberOf(orgId: string, userId: string, role: string) {
  await admin.query(
    `insert into memberships (id, organization_id, user_id, role) values ($1, $2, $3, $4)`,
    [`mem_${userId}_${orgId}`, orgId, userId, role],
  );
}

const move = (ctx: { orgId: string; userId: string }, from = FROM, to = TO) =>
  asApp(app, ctx, (c) => c.query("select * from move_rider_history($1, $2)", [from, to]));

/** Everything of the source rider's, as the function should find it. */
async function seedHistory() {
  await seed("workout_templates", {
    id: "hm_tpl_lib",
    name: "Bibliotekets",
    sport: "bike",
    structure: {},
  });
  await seed("workout_templates", {
    id: "hm_tpl_own",
    rider_id: FROM,
    name: "Mit eget pas",
    sport: "bike",
    structure: {},
    copied_from: "hm_tpl_lib",
  });
  await seed("planned_sessions", {
    id: "hm_ps_lib",
    rider_id: FROM,
    on_date: DAY,
    sport: "bike",
    title: "Fra biblioteket",
    template_id: "hm_tpl_lib",
  });
  await seed("planned_sessions", {
    id: "hm_ps_own",
    rider_id: FROM,
    on_date: DAY,
    sport: "bike",
    title: "Mit eget",
    template_id: "hm_tpl_own",
  });
  await seed("activities", {
    id: "hm_act",
    rider_id: FROM,
    started_at: `${DAY}T08:00:00Z`,
    on_date: DAY,
    sport: "bike",
    moving_seconds: 3600,
    source: "fit",
  });
  await seed("activity_files", {
    rider_id: FROM,
    activity_id: "hm_act",
    file_name: "tur.fit",
    sha256: "ab".repeat(32),
    bytes: Buffer.from("fit"),
  });
  await seed("upload_keys", {
    id: "hm_key",
    rider_id: FROM,
    name: "Telefon",
    key_hash: KEY_HASH,
    hint: "wxyz",
    created_by: RIDER,
  });
  await seed("comments", { rider_id: FROM, author_id: RIDER, activity_id: "hm_act", body: "Godt" });
  await seed("checkins", { rider_id: FROM, on_date: DAY, energy: 4 });
  await seed("rider_measurements", {
    rider_id: FROM,
    measured_on: DAY,
    kind: "height_cm",
    value: 178,
  });
  await seed("rider_goals", {
    rider_id: FROM,
    title: "Mål",
    kind: "manual",
    target: 10,
    starts_on: DAY,
    ends_on: DAY,
  });
  await seed("flag_resolutions", {
    rider_id: FROM,
    kind: "ramp",
    severity: "warn",
    week_monday: DAY,
  });
  await seed("season_plans", {
    rider_id: FROM,
    season_start_year: 2026,
    basis: "U19-1",
    months: [],
  });
  await seed("calendar_events", {
    id: "hm_race",
    rider_id: FROM,
    kind: "race",
    title: "Løb",
    starts_on: DAY,
    ends_on: DAY,
  });
  await seed("race_results", {
    rider_id: FROM,
    event_id: "hm_race",
    source_ref: "1:2",
    race: "Løb",
    discipline: "Landevej",
    race_class: "U19",
    raced_on: DAY,
    result_url: "https://www.sportstiming.dk/event/1/results",
  });
  await seed("device_links", {
    rider_id: FROM,
    provider: "wahoo",
    external_user_id: "w_hm",
    access_token_sealed: "sealed",
  });
  // What stays: a parent's link, and a deleted session the team remembers.
  await seed("guardians", { rider_id: FROM, name: "Mor" });
  await seed("planned_session_deletions", { rider_id: FROM, on_date: DAY, title: "Slettet" });
}

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ALONE, RIDER, "owner", "Alene");
  await seedPerson(admin, TEAM, COACH, "owner", "Holdet");
  await seedPerson(admin, ALONE, STRANGER, "member");
  await alsoMemberOf(TEAM, RIDER, "member");
  await alsoMemberOf(ALONE, COACH, "admin");
  await alsoMemberOf(TEAM, STRANGER, "member");
  await seed("riders", {
    id: FROM,
    user_id: RIDER,
    name: "Rytter",
    birth_year: 2009,
    ftp_watts: 260,
    sex: "female",
    share_wellbeing: true,
  });
  await seed("riders", { org_id: TEAM, id: TO, user_id: RIDER, name: "Rytter", birth_year: 2009 });
  await seedHistory();
});

afterAll(async () => {
  await app?.end();
  await admin?.end();
});

describe("who may move", () => {
  const refusal = (ctx: { orgId: string; userId: string }, from = FROM, to = TO) =>
    asApp(app, ctx, async (c) => {
      try {
        await c.query("select * from move_rider_history($1, $2)", [from, to]);
        return "NO_ERROR";
      } catch (error) {
        const e = error as { code?: string; detail?: string };
        return `${e.code}:${e.detail}`;
      }
    });

  it("a coach of both workspaces cannot pull the history to the team", async () => {
    expect(await refusal({ orgId: TEAM, userId: COACH })).toBe("42501:not_own_rider");
  });

  it("a stranger in both workspaces cannot, and learns nothing about the rows", async () => {
    expect(await refusal({ orgId: TEAM, userId: STRANGER })).toBe("42501:not_own_rider");
    expect(await refusal({ orgId: TEAM, userId: STRANGER }, "no_such_row", TO)).toBe(
      "42501:not_own_rider",
    );
  });

  it("nobody without a context", async () => {
    expect(await expectSqlError(move(null as never))).toBe("42501");
  });

  it("the two rows must be in different workspaces", async () => {
    expect(await refusal({ orgId: ALONE, userId: RIDER }, FROM, FROM)).toBe("42501:same_workspace");
  });

  it("the rider must be a member of both", async () => {
    await admin.query("delete from memberships where id = $1", [`mem_${RIDER}_${TEAM}`]);
    try {
      expect(await refusal({ orgId: TEAM, userId: RIDER })).toBe("42501:not_member");
    } finally {
      await alsoMemberOf(TEAM, RIDER, "member");
    }
  });

  it("refuses a target that already has history", async () => {
    await admin.query(
      `insert into checkins (id, org_id, rider_id, on_date, energy) values ('hm_ci_to', $1, $2, $3, 2)`,
      [TEAM, TO, DAY],
    );
    try {
      expect(await refusal({ orgId: TEAM, userId: RIDER })).toBe("42501:target_has_history");
    } finally {
      await admin.query("delete from checkins where id = 'hm_ci_to'");
    }
  });

  it("refuses a key that would collide, naming the table", async () => {
    await admin.query(
      `insert into season_plans (id, org_id, rider_id, season_start_year, basis, months)
       values ('hm_sp_to', $1, $2, 2026, 'U19-1', '[]')`,
      [TEAM, TO],
    );
    try {
      expect(await refusal({ orgId: TEAM, userId: RIDER })).toBe("42501:would_collide");
    } finally {
      await admin.query("delete from season_plans where id = 'hm_sp_to'");
    }
    expect((await where("planned_sessions", FROM)).n).toBe(2);
  });
});

describe("all or nothing", () => {
  it("a failure half way through leaves every row where it was", async () => {
    // A key the function does not know about, on a table late in its
    // order, with a colliding row on the target: the update of that table
    // fails after the earlier tables have been moved.
    await admin.query(
      `insert into rider_goals (id, org_id, rider_id, title, kind, target, starts_on, ends_on)
       values ('hm_goal_to', $1, $2, 'Mål', 'manual', 10, $3, $3)`,
      [TEAM, TO, DAY],
    );
    await admin.query("create unique index hm_goal_title_uq on rider_goals (rider_id, title)");
    try {
      expect(await expectSqlError(move({ orgId: TEAM, userId: RIDER }))).toBe("23505");
    } finally {
      await admin.query("drop index hm_goal_title_uq");
      await admin.query("delete from rider_goals where id = 'hm_goal_to'");
    }
    for (const table of ["planned_sessions", "activities", "checkins", "comments"]) {
      expect(await where(table, TO), table).toEqual({ n: 0, org: null });
    }
    expect((await where("planned_sessions", FROM)).org).toBe(ALONE);
    const trail = await admin.query(
      `select count(*)::int as n from audit_log
       where action like 'rider.history_moved_%' and org_id in ($1, $2)`,
      [ALONE, TEAM],
    );
    expect(trail.rows[0].n).toBe(0);
  });
});

describe("the rider moves their own history", () => {
  let moved: Record<string, number>;

  beforeAll(async () => {
    const result = await asAppCommit(app, { orgId: TEAM, userId: RIDER }, (c) =>
      c.query("select * from move_rider_history($1, $2)", [FROM, TO]),
    );
    moved = Object.fromEntries(
      result.rows.map((r: { table_name: string; rows_moved: number }) => [
        r.table_name,
        Number(r.rows_moved),
      ]),
    );
  });

  it("answers table names and counts, in the function's order", async () => {
    const list = await admin.query(
      "select table_name from move_rider_history_tables() where action = 'move'",
    );
    expect(Object.keys(moved)).toEqual(list.rows.map((r) => r.table_name));
    expect(moved).toMatchObject({
      workout_templates: 1,
      planned_sessions: 2,
      activities: 1,
      upload_keys: 1,
      activity_files: 1,
      comments: 1,
      checkins: 1,
      rider_measurements: 1,
      rider_goals: 1,
      flag_resolutions: 1,
      season_plans: 1,
      race_results: 1,
      calendar_events: 1,
      device_links: 1,
    });
  });

  it("every moved row is now the team's and the team row's", async () => {
    for (const table of Object.keys(moved)) {
      expect(await where(table, FROM), table).toEqual({ n: 0, org: null });
      expect(await where(table, TO), table).toEqual({ n: moved[table], org: TEAM });
    }
  });

  it("the rider's own session still names its template; the library's does not", async () => {
    const rows = await admin.query(
      "select id, template_id from planned_sessions where rider_id = $1 order by id",
      [TO],
    );
    expect(rows.rows).toEqual([
      { id: "hm_ps_lib", template_id: null },
      { id: "hm_ps_own", template_id: "hm_tpl_own" },
    ]);
    const tpl = await admin.query(
      "select copied_from from workout_templates where id = 'hm_tpl_own'",
    );
    expect(tpl.rows[0].copied_from).toBeNull();
  });

  it("the parent's link and the deleted session stay with the old workspace", async () => {
    expect(await where("guardians", FROM)).toEqual({ n: 1, org: ALONE });
    expect(await where("planned_session_deletions", FROM)).toEqual({ n: 1, org: ALONE });
  });

  it("the team's rider row took the thresholds and sharing choices, not the coach's fields", async () => {
    // Sex and class are a coach's to set (drizzle/0018); onto a team they
    // stay the coach's call, and the rider is no coach there.
    const row = await admin.query(
      "select ftp_watts, sex, share_wellbeing from riders where id = $1",
      [TO],
    );
    expect(row.rows[0]).toEqual({ ftp_watts: 260, sex: null, share_wellbeing: true });
  });

  it("writes one counted line per table on both sides, and never a row", async () => {
    // Other suites move histories too, and their lines stay (append-only):
    // only this pair of workspaces is looked at.
    const trail = await admin.query(
      `select org_id, action, entity_type, entity_id, after_data, before_data
       from audit_log where action like 'rider.history_moved_%' and org_id in ($1, $2) order by id`,
      [ALONE, TEAM],
    );
    const out = trail.rows.filter((r) => r.action === "rider.history_moved_out");
    const into = trail.rows.filter((r) => r.action === "rider.history_moved_in");
    expect(out).toHaveLength(Object.keys(moved).length);
    expect(into).toHaveLength(Object.keys(moved).length);
    for (const row of out) {
      expect(row.org_id).toBe(ALONE);
      expect(row.entity_id).toBe(FROM);
      expect(row.after_data).toEqual({ table: row.entity_type, rows: moved[row.entity_type] });
      expect(row.before_data).toBeNull();
    }
    for (const row of into) {
      expect(row.org_id).toBe(TEAM);
      expect(row.entity_id).toBe(TO);
      expect(Object.keys(row.after_data).sort()).toEqual(["rows", "table"]);
    }
    // No row-level image of a moved row was written on either side.
    const images = await admin.query(
      `select count(*)::int as n from audit_log
       where entity_type in ('checkins', 'activities', 'planned_sessions')
         and (before_data ->> 'rider_id' in ($1, $2) or after_data ->> 'rider_id' in ($1, $2))
         and action like '%.update'`,
      [FROM, TO],
    );
    expect(images.rows[0].n).toBe(0);
  });

  it("the team's coach reads the counts in the trail, the rider does not", async () => {
    const asCoach = await asApp(app, { orgId: TEAM, userId: COACH }, (c) =>
      c.query("select count(*)::int as n from audit_log where action = 'rider.history_moved_in'"),
    );
    expect(asCoach.rows[0].n).toBe(Object.keys(moved).length);
    const asRider = await asApp(app, { orgId: TEAM, userId: RIDER }, (c) =>
      c.query("select count(*)::int as n from audit_log where action like 'rider.history_%'"),
    );
    expect(asRider.rows[0].n).toBe(0);
  });

  it("the rider now reads their training on the team, and the old row is empty", async () => {
    const onTeam = await asApp(app, { orgId: TEAM, userId: RIDER }, (c) =>
      c.query("select count(*)::int as n from planned_sessions"),
    );
    expect(onTeam.rows[0].n).toBe(2);
    const alone = await asApp(app, { orgId: ALONE, userId: RIDER }, (c) =>
      c.query("select count(*)::int as n from planned_sessions"),
    );
    expect(alone.rows[0].n).toBe(0);
  });
});

describe("the list of tables (guards future tables)", () => {
  /**
   * Every table with a rider_id column is either moved by the function or
   * named as staying; a new table about a rider that is in neither column
   * fails here, as a table without forced RLS fails the meta-test. The
   * function reads the same list, so the two cannot drift apart.
   */
  it("every table with rider_id is in the function's move list or its stays list", async () => {
    const tables = await admin.query(
      `select table_name from information_schema.columns
       where table_schema = 'public' and column_name = 'rider_id' order by table_name`,
    );
    const listed = await admin.query(
      "select table_name, action from move_rider_history_tables() order by table_name",
    );
    expect(listed.rows.map((r) => r.table_name)).toEqual(tables.rows.map((r) => r.table_name));
    expect(new Set(listed.rows.map((r) => r.action))).toEqual(new Set(["move", "stay"]));
  });

  it("is callable by the application role, and the list by nobody else", async () => {
    const rows = await admin.query(
      `select has_function_privilege('kadence_app', 'move_rider_history(text, text)', 'execute') as app,
              has_function_privilege('kadence_auth', 'move_rider_history(text, text)', 'execute') as auth,
              has_function_privilege('kadence_app', 'move_rider_history_tables()', 'execute') as list`,
    );
    expect(rows.rows[0]).toEqual({ app: true, auth: false, list: false });
  });
});
