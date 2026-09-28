import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Who inside one team sees what (docs/adr/0011), proven as the application
 * role with raw SQL — what any bug in a service could do, and no more.
 *
 * One team: a coach, two riders with accounts, a parent of the first rider
 * whose link is confirmed, a parent whose link is not, and a member who is
 * neither rider nor parent. Health data about young riders is the first
 * thing in the family that needs separation inside a workspace, and the
 * database does it, not the forms.
 */

const ORG = "org_riders";
const COACH = { orgId: ORG, userId: "user_riders_coach" };
const R1 = { orgId: ORG, userId: "user_riders_r1" };
const R2 = { orgId: ORG, userId: "user_riders_r2" };
const PARENT = { orgId: ORG, userId: "user_riders_parent" };
const PENDING = { orgId: ORG, userId: "user_riders_pending" };
const OTHER = { orgId: ORG, userId: "user_riders_other" };

const DAY = "2026-11-02";
const THIS_YEAR = new Date().getFullYear();

let admin: Pool;
let app: Client;

async function seed(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, { org_id: ORG, ...values });
  await admin.query(q.text, q.values);
}

const count = (ctx: typeof COACH, table: string, where = "true") =>
  asApp(app, ctx, (c) => c.query(`select count(*)::int as n from "${table}" where ${where}`)).then(
    (r) => r.rows[0].n as number,
  );

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner", "Riders");
  for (const p of [R1, R2, PARENT, PENDING, OTHER])
    await seedPerson(admin, ORG, p.userId, "member");

  await seed("riders", { id: "r1", user_id: R1.userId, name: "Rytter 1", birth_year: 2010 });
  await seed("riders", { id: "r2", user_id: R2.userId, name: "Rytter 2", birth_year: 2009 });
  await seed("riders", { id: "r_adult", name: "Voksen", birth_year: THIS_YEAR - 18 });
  await seed("guardians", {
    id: "g1",
    rider_id: "r1",
    user_id: PARENT.userId,
    name: "Forælder",
    confirmed_at: new Date(),
  });
  await seed("guardians", {
    id: "g_pending",
    rider_id: "r1",
    user_id: PENDING.userId,
    name: "Venter",
  });
  await seed("guardians", {
    id: "g_adult",
    rider_id: "r_adult",
    user_id: PARENT.userId,
    name: "Forælder",
    confirmed_at: new Date(),
  });
  for (const r of ["r1", "r2", "r_adult"]) {
    await seed("planned_sessions", {
      id: `ses_${r}`,
      rider_id: r,
      on_date: DAY,
      sport: "bike",
      title: "Pas",
    });
    await seed("checkins", { rider_id: r, on_date: DAY, energy: 3 });
    await seed("rider_measurements", {
      rider_id: r,
      measured_on: DAY,
      kind: "height_cm",
      value: 175,
    });
    await seed("rider_goals", {
      rider_id: r,
      title: "Mål",
      kind: "manual",
      target: 10,
      starts_on: DAY,
      ends_on: DAY,
    });
    await seed("activities", {
      id: `act_${r}`,
      rider_id: r,
      started_at: `${DAY}T08:00:00Z`,
      on_date: DAY,
      sport: "bike",
      moving_seconds: 3600,
      source: "manual",
    });
    await seed("comments", {
      id: `com_${r}`,
      rider_id: r,
      author_id: COACH.userId,
      on_date: DAY,
      body: "Hej",
    });
    await seed("calendar_events", {
      rider_id: r,
      kind: "exam",
      title: "Eksamen",
      starts_on: DAY,
      ends_on: DAY,
    });
  }
  await seed("training_blocks", { id: "blk", name: "Blok", weeks: 1 });
  await seed("device_links", {
    rider_id: "r1",
    provider: "wahoo",
    external_user_id: "w_r1",
    access_token_sealed: "sealed",
  });
  await seed("calendar_events", { kind: "race", title: "Holdløb", starts_on: DAY, ends_on: DAY });
  await seed("workout_templates", { name: "Styrke", sport: "strength", structure: {} });
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe("the coach", () => {
  it("sees every rider and all their data", async () => {
    expect(await count(COACH, "riders")).toBe(3);
    expect(await count(COACH, "checkins")).toBe(3);
    expect(await count(COACH, "activities")).toBe(3);
    expect(await count(COACH, "device_links")).toBe(1);
  });

  it("cannot connect a device in a rider's name", async () => {
    const q = insertSql("device_links", {
      org_id: ORG,
      rider_id: "r2",
      provider: "garmin",
      external_user_id: "g_r2",
      access_token_sealed: "x",
    });
    expect(await expectSqlError(asApp(app, COACH, (c) => c.query(q.text, q.values)))).toBe("42501");
  });

  it("reads the audit trail, which nobody else does", async () => {
    await admin.query(
      `insert into audit_log (org_id, actor_user_id, actor_type, action, entity_type, entity_id)
       values ($1, $2, 'user', 'test.seed', 'test', 'x')`,
      [ORG, COACH.userId],
    );
    expect(await count(COACH, "audit_log")).toBeGreaterThan(0);
    for (const who of [R1, PARENT, OTHER]) expect(await count(who, "audit_log")).toBe(0);
  });
});

describe("a rider", () => {
  it("sees their own row and data, never a teammate's", async () => {
    expect(await count(R1, "riders", "id = 'r1'")).toBe(1);
    expect(await count(R1, "checkins", "rider_id = 'r1'")).toBe(1);
    expect(await count(R1, "riders", "id <> 'r1'")).toBe(0);
    for (const table of [
      "checkins",
      "activities",
      "planned_sessions",
      "comments",
      "rider_measurements",
      "rider_goals",
    ]) {
      expect(await count(R1, table, "rider_id <> 'r1'")).toBe(0);
    }
    expect(await count(R1, "device_links")).toBe(1);
    expect(await count(R2, "device_links")).toBe(0);
  });

  it("sees the team's calendar and library", async () => {
    expect(await count(R2, "calendar_events", "rider_id is null")).toBe(1);
    expect(await count(R2, "calendar_events", "rider_id = 'r1'")).toBe(0);
    expect(await count(R2, "workout_templates")).toBe(1);
    expect(await count(R2, "training_blocks")).toBe(1);
  });

  it("writes their own data and nobody else's", async () => {
    const own = insertSql("checkins", {
      org_id: ORG,
      rider_id: "r1",
      on_date: "2026-11-03",
      energy: 5,
    });
    expect((await asApp(app, R1, (c) => c.query(own.text, own.values))).rowCount).toBe(1);
    const theirs = insertSql("checkins", { org_id: ORG, rider_id: "r2", on_date: "2026-11-03" });
    expect(await expectSqlError(asApp(app, R1, (c) => c.query(theirs.text, theirs.values)))).toBe(
      "42501",
    );
    const upd = await asApp(app, R1, (c) =>
      c.query(`update activities set rpe = 9 where rider_id = 'r2'`),
    );
    expect(upd.rowCount).toBe(0);
  });

  it("cannot add a rider, change the template library or the team's calendar", async () => {
    const rider = insertSql("riders", { org_id: ORG, name: "x", birth_year: 2010 });
    expect(await expectSqlError(asApp(app, R1, (c) => c.query(rider.text, rider.values)))).toBe(
      "42501",
    );
    const tpl = insertSql("workout_templates", {
      org_id: ORG,
      name: "x",
      sport: "bike",
      structure: {},
    });
    expect(await expectSqlError(asApp(app, R1, (c) => c.query(tpl.text, tpl.values)))).toBe(
      "42501",
    );
    const race = insertSql("calendar_events", {
      org_id: ORG,
      kind: "race",
      title: "x",
      starts_on: DAY,
      ends_on: DAY,
    });
    expect(await expectSqlError(asApp(app, R1, (c) => c.query(race.text, race.values)))).toBe(
      "42501",
    );
  });

  it("changes what they share, but cannot hand their row to someone else", async () => {
    const ok = await asApp(app, R1, (c) =>
      c.query(`update riders set share_wellbeing = true where id = 'r1'`),
    );
    expect(ok.rowCount).toBe(1);
    const code = await expectSqlError(
      asApp(app, R1, (c) => c.query(`update riders set user_id = $1 where id = 'r1'`, [R2.userId])),
    );
    expect(code).toBe("42501");
  });

  it("comments under their own name only, and edits only their own words", async () => {
    const forged = insertSql("comments", {
      org_id: ORG,
      rider_id: "r1",
      author_id: COACH.userId,
      on_date: DAY,
      body: "x",
    });
    expect(await expectSqlError(asApp(app, R1, (c) => c.query(forged.text, forged.values)))).toBe(
      "42501",
    );
    const edit = await asApp(app, R1, (c) =>
      c.query(`update comments set body = 'y' where id = 'com_r1'`),
    );
    expect(edit.rowCount).toBe(0);
    const del = await asApp(app, COACH, (c) => c.query(`delete from comments where id = 'com_r1'`));
    expect(del.rowCount).toBe(1);
  });
});

describe("a parent", () => {
  it("sees their child's training and nothing of another rider", async () => {
    expect(await count(PARENT, "riders", "id = 'r1'")).toBe(1);
    expect(await count(PARENT, "planned_sessions", "rider_id = 'r1'")).toBe(1);
    expect(await count(PARENT, "activities", "rider_id = 'r1'")).toBe(1);
    expect(await count(PARENT, "rider_goals", "rider_id = 'r1'")).toBe(1);
    expect(await count(PARENT, "comments", "rider_id = 'r1'")).toBe(1);
    expect(await count(PARENT, "calendar_events", "rider_id = 'r1'")).toBe(1);
    for (const table of ["riders", "planned_sessions", "checkins", "activities"]) {
      expect(await count(PARENT, table, table === "riders" ? "id = 'r2'" : "rider_id = 'r2'")).toBe(
        0,
      );
    }
  });

  it("sees check-ins and height only if the rider shares them", async () => {
    expect(await count(PARENT, "checkins")).toBe(0);
    expect(await count(PARENT, "rider_measurements")).toBe(0);
    const shared = await asApp(app, R1, async (c) => {
      await c.query(`update riders set share_wellbeing = true where id = 'r1'`);
      await c.query("select set_config('app.user_id', $1, true)", [PARENT.userId]);
      return c.query(`select count(*)::int as n from checkins`);
    });
    expect(shared.rows[0].n).toBe(1);
  });

  it("loses the training too when the rider stops sharing it", async () => {
    const hidden = await asApp(app, R1, async (c) => {
      await c.query(`update riders set share_training = false where id = 'r1'`);
      await c.query("select set_config('app.user_id', $1, true)", [PARENT.userId]);
      return c.query(`select count(*)::int as n from planned_sessions`);
    });
    expect(hidden.rows[0].n).toBe(0);
  });

  it("reads and never writes", async () => {
    const ses = insertSql("planned_sessions", {
      org_id: ORG,
      rider_id: "r1",
      on_date: DAY,
      sport: "bike",
      title: "x",
    });
    expect(await expectSqlError(asApp(app, PARENT, (c) => c.query(ses.text, ses.values)))).toBe(
      "42501",
    );
    const com = insertSql("comments", {
      org_id: ORG,
      rider_id: "r1",
      author_id: PARENT.userId,
      on_date: DAY,
      body: "x",
    });
    expect(await expectSqlError(asApp(app, PARENT, (c) => c.query(com.text, com.values)))).toBe(
      "42501",
    );
    const upd = await asApp(app, PARENT, (c) => c.query(`update planned_sessions set title = 'x'`));
    expect(upd.rowCount).toBe(0);
    const share = await asApp(app, PARENT, (c) =>
      c.query(`update riders set share_wellbeing = true`),
    );
    expect(share.rowCount).toBe(0);
  });

  it("sees nothing, not even the name, until the rider confirms", async () => {
    expect(await count(PENDING, "riders")).toBe(0);
    expect(await count(PENDING, "planned_sessions")).toBe(0);
    expect(await count(PENDING, "guardians")).toBe(1); // their own pending link
  });

  it("loses access in the year the rider turns 18, until the adult rider confirms again", async () => {
    expect(await count(PARENT, "riders", "id = 'r_adult'")).toBe(0);
    await admin.query(`update guardians set confirmed_as_adult = true where id = 'g_adult'`);
    expect(await count(PARENT, "riders", "id = 'r_adult'")).toBe(1);
    await admin.query(`update guardians set confirmed_as_adult = false where id = 'g_adult'`);
  });

  it("cannot see the rider's device connection", async () => {
    expect(await count(PARENT, "device_links")).toBe(0);
  });
});

describe("confirming a guardian is the rider's alone", () => {
  it("refuses the coach", async () => {
    const code = await expectSqlError(
      asApp(app, COACH, (c) =>
        c.query(`update guardians set confirmed_at = now() where id = 'g_pending'`),
      ),
    );
    expect(code).toBe("42501");
  });

  it("refuses a coach who adds a guardian already confirmed", async () => {
    const q = insertSql("guardians", {
      org_id: ORG,
      rider_id: "r2",
      name: "x",
      confirmed_at: new Date(),
    });
    expect(await expectSqlError(asApp(app, COACH, (c) => c.query(q.text, q.values)))).toBe("42501");
  });

  it("refuses the waiting parent", async () => {
    const r = await asApp(app, PENDING, (c) =>
      c.query(`update guardians set confirmed_at = now() where id = 'g_pending'`),
    );
    expect(r.rowCount).toBe(0);
  });

  it("lets the rider", async () => {
    const r = await asApp(app, R1, (c) =>
      c.query(`update guardians set confirmed_at = now() where id = 'g_pending'`),
    );
    expect(r.rowCount).toBe(1);
  });

  it("never moves a link to another rider", async () => {
    const code = await expectSqlError(
      asApp(app, COACH, (c) => c.query(`update guardians set rider_id = 'r2' where id = 'g1'`)),
    );
    expect(code).toBe("42501");
  });
});

describe("a member who is neither rider nor parent", () => {
  it("sees the team's calendar and library and no rider", async () => {
    expect(await count(OTHER, "riders")).toBe(0);
    for (const table of ["checkins", "activities", "planned_sessions", "comments", "guardians"]) {
      expect(await count(OTHER, table)).toBe(0);
    }
    expect(await count(OTHER, "calendar_events")).toBe(1);
    expect(await count(OTHER, "workout_templates")).toBe(1);
  });
});

describe("claiming an invitation", () => {
  beforeAll(async () => {
    await admin.query(
      `insert into users (id, name, email) values ('user_riders_new', 'Ny', 'ny@example.com') on conflict do nothing`,
    );
    await admin.query(
      `insert into invitations (id, organization_id, email, role, status, expires_at, inviter_id)
       values ('inv_new', $1, 'ny@example.com', 'member', 'accepted', now() + interval '1 day', $2)
       on conflict do nothing`,
      [ORG, COACH.userId],
    );
    await seed("riders", {
      id: "r_new",
      name: "Ny rytter",
      birth_year: 2010,
      invitation_id: "inv_new",
    });
  });

  it("does nothing for someone who is not the invited person", async () => {
    const r = await asApp(app, OTHER, (c) =>
      c.query(`select claim_invitation_links('inv_new') as n`),
    );
    expect(r.rows[0].n).toBe(0);
  });

  it("links the invited person to the rider the coach prepared", async () => {
    await admin.query(
      `insert into memberships (id, organization_id, user_id, role) values ('mem_new', $1, 'user_riders_new', 'member') on conflict do nothing`,
      [ORG],
    );
    const NEW = { orgId: ORG, userId: "user_riders_new" };
    const r = await asApp(app, NEW, async (c) => {
      const claimed = await c.query(`select claim_invitation_links('inv_new') as n`);
      const mine = await c.query(`select id from riders`);
      return { n: claimed.rows[0].n, ids: mine.rows.map((x) => x.id) };
    });
    expect(r).toEqual({ n: 1, ids: ["r_new"] });
  });
});
