import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  forget,
  givePlace,
  placesTaken,
  recall,
  remember,
  resetCounters,
  sweepCounters,
  takePlace,
} from "@/core/counters";
import { inFlight } from "@/modules/devices/in-flight";
import { adminPool } from "../helpers/db";

/**
 * The counters under the rate limits (src/core/counters.ts, docs/adr/0083):
 * places held while something is read, moments to remember, and the sweep
 * that keeps both tables small. Against the database, because that is
 * where every instance meets.
 */

const admin = adminPool();
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(async () => {
  await resetCounters();
  await admin.query("delete from rate_limits where key like 'counters-test:%'");
});
afterAll(() => admin.end());

describe("places", () => {
  it("are taken up to the ceiling, and given back", async () => {
    expect(await takePlace("place", 2, 60_000)).toBe(true);
    expect(await takePlace("place", 2, 60_000)).toBe(true);
    expect(await takePlace("place", 2, 60_000)).toBe(false);
    expect(await placesTaken("place")).toBe(2);
    await givePlace("place");
    expect(await placesTaken("place")).toBe(1);
    expect(await takePlace("place", 2, 60_000)).toBe(true);
  });

  it("are all handed out once when many ask at the same moment", async () => {
    const answers = await Promise.all(
      Array.from({ length: 10 }, () => takePlace("rush", 3, 60_000)),
    );
    expect(answers.filter(Boolean)).toHaveLength(3);
    expect(await placesTaken("rush")).toBe(3);
  });

  it("come back by the clock when whoever held them never gave them back", async () => {
    expect(await takePlace("lost", 1, 50)).toBe(true);
    expect(await takePlace("lost", 1, 50)).toBe(false);
    await pause(80);
    expect(await placesTaken("lost")).toBe(0);
    expect(await takePlace("lost", 1, 50)).toBe(true);
  });

  it("never go below none", async () => {
    await givePlace("none");
    await takePlace("none", 1, 60_000);
    await givePlace("none");
    await givePlace("none");
    expect(await placesTaken("none")).toBe(0);
    expect(await takePlace("none", 1, 60_000)).toBe(true);
  });

  it("are kept per door and per person by in-flight", async () => {
    const upload = inFlight("door-a", 1);
    const other = inFlight("door-b", 1);
    expect(await upload.enter("ida")).toBe(true);
    expect(await upload.enter("ida")).toBe(false);
    expect(await upload.enter("mikkel")).toBe(true);
    expect(await other.enter("ida")).toBe(true);
    await upload.leave("ida");
    expect(await upload.count("ida")).toBe(0);
    expect(await upload.enter("ida")).toBe(true);
  });
});

describe("moments", () => {
  it("are remembered until the time given, by the caller's clock", async () => {
    const until = new Date("2026-10-06T16:00:00Z");
    await remember("moment", until);
    expect(await recall("moment")).toEqual(until);
    const later = new Date("2026-10-06T17:00:00Z");
    await remember("moment", later);
    expect(await recall("moment")).toEqual(later);
    await forget("moment");
    expect(await recall("moment")).toBeNull();
  });
});

describe("the sweep", () => {
  it("deletes what has run out, here and in Better Auth's table, and keeps the rest", async () => {
    await takePlace("held", 1, 60_000);
    await takePlace("spent", 1, 1);
    await remember("past", new Date(Date.now() - 1000));
    await remember("future", new Date(Date.now() + 60_000));
    const now = Date.now();
    await admin.query(
      `insert into rate_limits (id, key, count, last_request) values
       ('counters-test-old', 'counters-test:old', 3, $1),
       ('counters-test-new', 'counters-test:new', 3, $2)`,
      [now - 11 * 60_000, now],
    );
    await pause(10);

    const swept = await sweepCounters();
    expect(swept.counters).toBeGreaterThanOrEqual(2);
    expect(swept.auth).toBeGreaterThanOrEqual(1);

    const { rows: ours } = await admin.query("select key from app_rate_limits order by key");
    expect(ours.map((r) => r.key)).toEqual(["future", "held"]);
    const { rows: theirs } = await admin.query(
      "select key from rate_limits where key like 'counters-test:%'",
    );
    expect(theirs.map((r) => r.key)).toEqual(["counters-test:new"]);
  });
});

describe("the table", () => {
  it("is unlogged, and only the application role may use it", async () => {
    const { rows } = await admin.query(
      `select relpersistence,
         has_table_privilege('kadence_app', 'app_rate_limits', 'select, insert, update, delete') as app,
         has_table_privilege('kadence_auth', 'app_rate_limits', 'select') as auth
       from pg_class where relname = 'app_rate_limits'`,
    );
    expect(rows).toEqual([{ relpersistence: "u", app: true, auth: false }]);
  });
});
