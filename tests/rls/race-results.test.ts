import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client, Pool } from "pg";
import { adminPool, appClient, asApp, expectSqlError } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";

/**
 * Who inside one team sees a rider's results from Cykling Danmark
 * (ADR 0039, drizzle/0016 and 0018), proven as the application role with
 * raw SQL.
 * The race in the calendar follows the calendar's rules (rider-isolation);
 * the place on it is the coach's to read and write. The rider reads
 * their own, which is what puts it in their export. A parent — even one
 * the rider shares their training with — and a teammate see none.
 */

const ORG = "org_races";
const COACH = { orgId: ORG, userId: "user_races_coach" };
const R1 = { orgId: ORG, userId: "user_races_r1" };
const R2 = { orgId: ORG, userId: "user_races_r2" };
const PARENT = { orgId: ORG, userId: "user_races_parent" };

const DAY = "2026-09-06";
const URL = "https://www.sportstiming.dk/event/17614/results?round=101512";
const result = (riderId: string, eventId: string, ref: string) =>
  insertSql("race_results", {
    org_id: ORG,
    rider_id: riderId,
    event_id: eventId,
    source_ref: ref,
    race: "Greve CC 2026",
    discipline: "Landevej",
    race_class: "U17",
    raced_on: DAY,
    place: 3,
    result_url: URL,
  });

let admin: Pool;
let app: Client;

async function seed(table: string, values: Record<string, unknown>) {
  const q = insertSql(table, { org_id: ORG, ...values });
  await admin.query(q.text, q.values);
}

const count = (ctx: typeof COACH, where = "true") =>
  asApp(app, ctx, (c) =>
    c.query(`select count(*)::int as n from race_results where ${where}`),
  ).then((r) => r.rows[0].n as number);

beforeAll(async () => {
  admin = adminPool();
  app = await appClient();
  await seedPerson(admin, ORG, COACH.userId, "owner", "Races");
  for (const p of [R1, R2, PARENT]) await seedPerson(admin, ORG, p.userId, "member");
  await seed("riders", {
    id: "rr1",
    user_id: R1.userId,
    name: "Rytter 1",
    birth_year: 2011,
    uci_id: "10012345678",
  });
  await seed("riders", { id: "rr2", user_id: R2.userId, name: "Rytter 2", birth_year: 2010 });
  await seed("guardians", {
    rider_id: "rr1",
    user_id: PARENT.userId,
    name: "Forælder",
    confirmed_at: new Date(),
  });
  const race = (id: string, riderId: string | null, extra: Record<string, unknown> = {}) =>
    seed("calendar_events", {
      id,
      rider_id: riderId,
      kind: "race",
      title: "Greve CC 2026",
      starts_on: DAY,
      ends_on: DAY,
      ...extra,
    });
  await race("ev_r1", "rr1", { source: "dcu" });
  await race("ev_r2", "rr2");
  await race("ev_team", null);
  await race("ev_r1_coach", "rr1");
  await seed("calendar_events", {
    id: "ev_exam",
    rider_id: "rr1",
    kind: "exam",
    title: "Eksamen",
    starts_on: DAY,
    ends_on: DAY,
  });
  for (const q of [result("rr1", "ev_r1", "1:1"), result("rr2", "ev_r2", "1:1")])
    await admin.query(q.text, q.values);
});

afterAll(async () => {
  await app.end();
  await admin.end();
});

describe("a result from Cykling Danmark", () => {
  it("is read by the coach, for every rider", async () => {
    expect(await count(COACH)).toBe(2);
  });

  it("is read by the rider it is about, and by no teammate", async () => {
    expect(await count(R1)).toBe(1);
    expect(await count(R1, "rider_id = 'rr2'")).toBe(0);
    expect(await count(R2, "rider_id = 'rr1'")).toBe(0);
  });

  it("is read by no parent, though the parent sees the race in the calendar", async () => {
    expect(await count(PARENT)).toBe(0);
    const races = await asApp(app, PARENT, (c) =>
      c.query(`select id from calendar_events where id = 'ev_r1'`),
    );
    expect(races.rowCount).toBe(1);
  });

  it("is written by the coach, on the rider's own race or the team's", async () => {
    for (const [event, ref] of [
      ["ev_team", "2:1"],
      ["ev_r1_coach", "2:2"],
    ] as const) {
      const q = result("rr1", event, ref);
      expect((await asApp(app, COACH, (c) => c.query(q.text, q.values))).rowCount).toBe(1);
    }
  });

  it("never hangs on another rider's race, or on what is not a race", async () => {
    for (const [event, ref] of [
      ["ev_r2", "3:1"],
      ["ev_exam", "3:2"],
    ] as const) {
      const q = result("rr1", event, ref);
      expect(await expectSqlError(asApp(app, COACH, (c) => c.query(q.text, q.values)))).toBe(
        "42501",
      );
    }
  });

  it("is not the rider's to write, change or remove", async () => {
    const q = result("rr1", "ev_r1", "4:1");
    expect(await expectSqlError(asApp(app, R1, (c) => c.query(q.text, q.values)))).toBe("42501");
    const changed = await asApp(app, R1, (c) =>
      c.query(`update race_results set place = 1 where rider_id = 'rr1'`),
    );
    expect(changed.rowCount).toBe(0);
    const removed = await asApp(app, R1, (c) =>
      c.query(`delete from race_results where rider_id = 'rr1'`),
    );
    expect(removed.rowCount).toBe(0);
  });
});

describe("the UCI ID", () => {
  it("is the coach's or the rider's own to set, never a teammate's", async () => {
    const own = await asApp(app, R1, (c) =>
      c.query(`update riders set uci_id = '10099999999' where id = 'rr1'`),
    );
    expect(own.rowCount).toBe(1);
    const theirs = await asApp(app, R2, (c) =>
      c.query(`update riders set uci_id = '10099999999' where id = 'rr1'`),
    );
    expect(theirs.rowCount).toBe(0);
  });

  it("leaves the notes of when the races were read to Kadence", async () => {
    for (const change of ["races_error = 'x'", "races_checked_at = now()"]) {
      const code = await expectSqlError(
        asApp(app, R1, (c) => c.query(`update riders set ${change} where id = 'rr1'`)),
      );
      expect(code).toBe("42501");
    }
  });

  it("takes its results along when the rider changes it, though the rider may not delete one", async () => {
    const after = await asApp(app, R1, async (c) => {
      await c.query(`update riders set uci_id = '10099999999' where id = 'rr1'`);
      const results = await c.query(`select 1 from race_results where rider_id = 'rr1'`);
      const races = await c.query(
        `select id from calendar_events where rider_id = 'rr1' and source = 'dcu'`,
      );
      return { results: results.rowCount, races: races.rowCount };
    });
    expect(after).toEqual({ results: 0, races: 0 });
  });

  it("takes its results and Kadence's races along when removed, and leaves the coach's race", async () => {
    // One transaction: asApp rolls back when it is done.
    const after = await asApp(app, COACH, async (c) => {
      const removed = await c.query(`update riders set uci_id = null where id = 'rr1'`);
      const results = await c.query(`select rider_id from race_results order by rider_id`);
      const races = await c.query(
        `select id from calendar_events where rider_id = 'rr1' order by id`,
      );
      return { removed: removed.rowCount, results: results.rows, races: races.rows };
    });
    expect(after.removed).toBe(1);
    expect(after.results).toEqual([{ rider_id: "rr2" }]);
    expect(after.races.map((r) => r.id)).toEqual(["ev_exam", "ev_r1_coach"]);
  });
});
