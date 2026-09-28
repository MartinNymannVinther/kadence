import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Workspace isolation for every product table, proven as the application
 * role with raw SQL. Each table gets one row per workspace, seeded as the
 * superuser; a coach must then see exactly their own team's row, nothing
 * without a context, and be refused when writing for the other team. New
 * tables are added to TABLES here, or the meta-test in tenant-isolation
 * fails them for missing RLS anyway.
 *
 * A second block proves the references: a row in team A cannot name a
 * rider, a template, an activity or a session that belongs to B, even
 * though a foreign key alone would let it (drizzle/0003). Who inside one
 * team sees what is rider-isolation.test.ts.
 */

const A = { orgId: "org_prod_a", userId: "user_prod_a" };
const B = { orgId: "org_prod_b", userId: "user_prod_b" };

const DAY = "2026-11-02";
const FIT = Buffer.from("fit");

/** Table → a row factory keyed by workspace suffix. Order is insertion order. */
const TABLES: Array<{ table: string; row: (s: string) => Record<string, unknown> }> = [
  { table: "team_settings", row: () => ({ team_kind: "U19" }) },
  { table: "riders", row: (s) => ({ id: `rider_${s}`, name: `Rytter ${s}`, birth_year: 2009 }) },
  { table: "guardians", row: (s) => ({ rider_id: `rider_${s}`, name: `Forælder ${s}` }) },
  {
    table: "rider_measurements",
    row: (s) => ({ rider_id: `rider_${s}`, measured_on: DAY, kind: "height_cm", value: 178 }),
  },
  {
    table: "rider_goals",
    row: (s) => ({
      rider_id: `rider_${s}`,
      title: "30 styrkepas",
      kind: "strength_sessions",
      target: 30,
      starts_on: DAY,
      ends_on: DAY,
    }),
  },
  {
    table: "season_plans",
    row: (s) => ({ rider_id: `rider_${s}`, season_start_year: 2026, basis: "U19-1", months: [] }),
  },
  {
    table: "workout_templates",
    row: (s) => ({ id: `tpl_${s}`, name: `Skabelon ${s}`, sport: "bike", structure: {} }),
  },
  {
    table: "training_blocks",
    row: (s) => ({ id: `blk_${s}`, name: `Blok ${s}`, weeks: 2 }),
  },
  {
    table: "training_block_items",
    row: (s) => ({ block_id: `blk_${s}`, template_id: `tpl_${s}`, day: 0 }),
  },
  {
    table: "activities",
    row: (s) => ({
      id: `act_${s}`,
      rider_id: `rider_${s}`,
      started_at: `${DAY}T08:00:00Z`,
      on_date: DAY,
      sport: "bike",
      moving_seconds: 3600,
      source: "manual",
    }),
  },
  {
    table: "activity_files",
    row: (s) => ({
      rider_id: `rider_${s}`,
      activity_id: `act_${s}`,
      file_name: "ride.fit",
      sha256: `sha_${s}`,
      bytes: FIT,
    }),
  },
  {
    table: "planned_sessions",
    row: (s) => ({
      id: `ses_${s}`,
      rider_id: `rider_${s}`,
      on_date: DAY,
      sport: "bike",
      title: `Pas ${s}`,
      template_id: `tpl_${s}`,
      activity_id: `act_${s}`,
    }),
  },
  { table: "checkins", row: (s) => ({ rider_id: `rider_${s}`, on_date: DAY, energy: 4 }) },
  {
    table: "calendar_events",
    row: (s) => ({ kind: "race", title: `Løb ${s}`, starts_on: DAY, ends_on: DAY }),
  },
  {
    table: "comments",
    row: (s) => ({
      rider_id: `rider_${s}`,
      author_id: `user_prod_${s}`,
      planned_session_id: `ses_${s}`,
      body: `Godt kørt ${s}`,
    }),
  },
  {
    table: "device_links",
    row: (s) => ({
      rider_id: `rider_${s}`,
      provider: "wahoo",
      external_user_id: `wahoo_${s}`,
      access_token_sealed: "sealed",
    }),
  },
  { table: "ai_calls", row: () => ({ kind: "week_draft" }) },
  { table: "workspace_llm_settings", row: (s) => ({ provider: "ollama", model: `model-${s}` }) },
];

let admin: Pool;
let app: Client;

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  for (const [ctx, s] of [
    [A, "a"],
    [B, "b"],
  ] as const) {
    await seedPerson(admin, ctx.orgId, ctx.userId, "owner", `Prod ${s}`);
    for (const spec of TABLES) {
      const q = insertSql(spec.table, { org_id: ctx.orgId, ...spec.row(s) });
      await admin.query(q.text, q.values);
    }
  }
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe.each(TABLES.map((spec) => spec.table))("product table %s", (table) => {
  it("shows a coach only the active team's rows", async () => {
    const asA = await asApp(app, A, (c) => c.query(`select org_id from "${table}"`));
    expect(asA.rows.length).toBeGreaterThan(0);
    expect(asA.rows.every((r) => r.org_id === A.orgId)).toBe(true);

    const asB = await asApp(app, B, (c) => c.query(`select org_id from "${table}"`));
    expect(asB.rows.every((r) => r.org_id === B.orgId)).toBe(true);
  });

  it("shows nothing without a context", async () => {
    const rows = await asApp(app, null, (c) => c.query(`select 1 from "${table}"`));
    expect(rows.rows).toEqual([]);
  });

  it("shows nothing with the other team's id but not its membership", async () => {
    const rows = await asApp(app, { orgId: B.orgId, userId: A.userId }, (c) =>
      c.query(`select 1 from "${table}" where org_id = $1`, [B.orgId]),
    );
    // Team-wide tables follow the context alone (the app sets it only
    // after checking membership); everything about a rider asks who the
    // caller is, and a stranger is nobody.
    const teamWide = [
      "team_settings",
      "workout_templates",
      "calendar_events",
      "training_blocks",
      "training_block_items",
    ];
    const foundation = ["ai_calls", "workspace_llm_settings"];
    if (!teamWide.includes(table) && !foundation.includes(table)) expect(rows.rows).toEqual([]);
  });

  it("refuses to update the other team's row", async () => {
    const result = await asApp(app, A, (c) =>
      c.query(`update "${table}" set org_id = org_id where org_id = $1`, [B.orgId]),
    );
    expect(result.rowCount).toBe(0);
  });

  it("refuses to insert a row for the other team", async () => {
    const spec = TABLES.find((t) => t.table === table)!;
    const q = insertSql(table, { ...spec.row("x"), org_id: B.orgId });
    const code = await expectSqlError(asApp(app, A, (c) => c.query(q.text, q.values)));
    // 42501 = RLS policy violation; a foreign key that cannot see its
    // target row is the same refusal by another name.
    expect(["42501", "23503", "23505"]).toContain(code);
  });
});

describe("a row can only name rows of its own team (drizzle/0003)", () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    [
      "a session for B's rider",
      { table: "planned_sessions", rider_id: "rider_b", on_date: DAY, sport: "bike", title: "x" },
    ],
    [
      "a session from B's template",
      {
        table: "planned_sessions",
        rider_id: "rider_a",
        on_date: DAY,
        sport: "bike",
        title: "x",
        template_id: "tpl_b",
      },
    ],
    [
      "a session fulfilled by B's activity",
      {
        table: "planned_sessions",
        rider_id: "rider_a",
        on_date: DAY,
        sport: "bike",
        title: "x",
        activity_id: "act_b",
      },
    ],
    ["a check-in for B's rider", { table: "checkins", rider_id: "rider_b", on_date: "2026-11-03" }],
    [
      "an activity for B's rider",
      {
        table: "activities",
        rider_id: "rider_b",
        started_at: `${DAY}T09:00:00Z`,
        on_date: DAY,
        sport: "bike",
        moving_seconds: 60,
        source: "manual",
      },
    ],
    [
      "a file on B's activity",
      {
        table: "activity_files",
        rider_id: "rider_a",
        activity_id: "act_b",
        file_name: "x.fit",
        sha256: "x",
        bytes: FIT,
      },
    ],
    ["a guardian for B's rider", { table: "guardians", rider_id: "rider_b", name: "x" }],
    [
      "a comment on B's session",
      {
        table: "comments",
        rider_id: "rider_a",
        author_id: A.userId,
        planned_session_id: "ses_b",
        body: "x",
      },
    ],
    [
      "a comment on B's activity",
      {
        table: "comments",
        rider_id: "rider_a",
        author_id: A.userId,
        activity_id: "act_b",
        body: "x",
      },
    ],
    [
      "B's rider's exam in A's calendar",
      {
        table: "calendar_events",
        rider_id: "rider_b",
        kind: "exam",
        title: "x",
        starts_on: DAY,
        ends_on: DAY,
      },
    ],
  ];

  it.each(cases)("refuses %s", async (_label, spec) => {
    const { table, ...values } = spec as { table: string } & Record<string, unknown>;
    const q = insertSql(table, { org_id: A.orgId, ...values });
    const code = await expectSqlError(asApp(app, A, (c) => c.query(q.text, q.values)));
    expect(["42501", "23503"]).toContain(code);
  });

  it("allows the same rows when they name A's own", async () => {
    const q = insertSql("planned_sessions", {
      org_id: A.orgId,
      rider_id: "rider_a",
      on_date: "2026-11-03",
      sport: "bike",
      title: "egen",
      template_id: "tpl_a",
    });
    const result = await asApp(app, A, (c) => c.query(q.text, q.values));
    expect(result.rowCount).toBe(1);
  });
});
