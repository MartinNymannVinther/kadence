import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { env } from "@/core/env";
import { refreshOwnRaces, refreshOwnRacesLater } from "@/modules/results/own";
import {
  refreshRaces,
  refreshStaleRaces,
  refreshStaleRacesOnVisit,
} from "@/modules/results/refresh";
import { setUciId } from "@/modules/results/service";
import { fakeFetch } from "../devices/fake-fetch";
import { adminPool } from "../helpers/db";
import { drainJobs } from "../helpers/jobs";
import { insertSql, seedPerson } from "../helpers/rows";
import { PAGE, profilePage, UCI } from "../results/profile-fixture";

/**
 * Opening Kadence reads races from Cykling Danmark (ADR 0039): a rider's
 * visit puts their own races in their calendar, written as the rider and
 * without a single place; a coach's visit reads the whole team and hangs
 * the places on those same races, never on twins. And the rider may set
 * their own UCI ID, which the portal must know, born in the rider's year.
 */

const ORG = "org_racevisits";
const COACH = { orgId: ORG, userId: "user_racevisits_coach" };
const RIDER = { orgId: ORG, userId: "user_racevisits_rider" };
const PARENT = { orgId: ORG, userId: "user_racevisits_parent" };
const PORTAL = `GET https://dcumedlem.sportstiming.dk/profile/${UCI}`;
const TODAY = "2026-10-01";
const html = (body: string) =>
  new Response(body, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });

let admin: Pool;
const setting = env.DCU_RESULTS;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await seedPerson(admin, ORG, RIDER.userId, "member");
  await seedPerson(admin, ORG, PARENT.userId, "member");
  const q = insertSql("riders", {
    org_id: ORG,
    id: "rv_rider",
    user_id: RIDER.userId,
    name: "Rytter",
    birth_year: 2011,
  });
  await admin.query(q.text, q.values);
  await setUciId(COACH, { riderId: "rv_rider", uciId: UCI });
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.assign(env, { DCU_RESULTS: setting });
});

afterAll(async () => {
  await admin.end();
});

const races = () =>
  admin
    .query(
      `select e.starts_on::text as on, e.created_by, count(r.id)::int as results
       from calendar_events e left join race_results r on r.event_id = e.id
       where e.org_id = $1 and e.rider_id = 'rv_rider'
       group by e.id order by e.starts_on`,
      [ORG],
    )
    .then((r) => r.rows);

describe("opening Kadence", () => {
  it("does nothing for a parent", async () => {
    Object.assign(env, { DCU_RESULTS: "on" });
    const calls = fakeFetch({ [PORTAL]: () => html(PAGE) });
    expect(await refreshOwnRaces(PARENT, { today: TODAY })).toEqual({ state: "off" });
    expect(calls).toHaveLength(0);
  });

  it("puts a rider's own races in their calendar, as the rider, without a place", async () => {
    Object.assign(env, { DCU_RESULTS: "on" });
    fakeFetch({ [PORTAL]: () => html(PAGE) });
    expect(await refreshOwnRaces(RIDER, { today: TODAY })).toEqual({
      state: "read",
      newRaces: 6,
      results: 0,
    });
    const rows = await races();
    expect(rows).toHaveLength(6);
    expect(rows.every((r) => r.created_by === RIDER.userId && r.results === 0)).toBe(true);
  });

  it("does not read the rider's page again within three hours", async () => {
    Object.assign(env, { DCU_RESULTS: "on" });
    const calls = fakeFetch({ [PORTAL]: () => html(PAGE) });
    await refreshOwnRacesLater(RIDER);
    await drainJobs(["dcu.read_rider"]);
    expect(calls).toHaveLength(0);
  });

  it("reads the whole team for a coach, and hangs the places on the rider's races", async () => {
    Object.assign(env, { DCU_RESULTS: "on" });
    const calls = fakeFetch({ [PORTAL]: () => html(PAGE) });
    await refreshStaleRaces(COACH);
    await drainJobs(["dcu.read_rider"]);
    expect(calls).toHaveLength(1);
    const rows = await races();
    expect(rows).toHaveLength(6);
    expect(rows.reduce((n, r) => n + r.results, 0)).toBe(7);
  });

  it("then waits three hours before the coach's visit reads again", async () => {
    Object.assign(env, { DCU_RESULTS: "on" });
    const calls = fakeFetch({ [PORTAL]: () => html(PAGE) });
    await refreshStaleRaces(COACH);
    await drainJobs(["dcu.read_rider"]);
    expect(await refreshRaces(COACH, "rv_rider")).toEqual({ state: "fresh" });
    expect(calls).toHaveLength(0);
  });

  it("refuses a UCI ID the portal does not know, or one born in another year", async () => {
    Object.assign(env, { DCU_RESULTS: "on" });
    const other = "10099999999";
    const route = `GET https://dcumedlem.sportstiming.dk/profile/${other}`;
    fakeFetch({ [route]: () => html(profilePage("", other, 2008)) });
    await expect(setUciId(RIDER, { riderId: "rv_rider", uciId: other })).rejects.toMatchObject({
      code: "invalid",
      detail: "uciBirthYear",
    });
    fakeFetch({ [route]: () => new Response("Not Found", { status: 404 }) });
    await expect(setUciId(COACH, { riderId: "rv_rider", uciId: other })).rejects.toMatchObject({
      code: "invalid",
      detail: "uciUnknown",
    });
    expect(await races()).toHaveLength(6);
  });

  it("takes everything read along when the rider removes their own UCI ID", async () => {
    expect(await setUciId(RIDER, { riderId: "rv_rider", uciId: "" })).toMatchObject({
      uciId: null,
    });
    expect(await races()).toEqual([]);
    const left = await admin.query(`select 1 from race_results where org_id = $1`, [ORG]);
    expect(left.rowCount).toBe(0);
  });
});

describe("a coach's visit from the layout", () => {
  it("reads the team at most once an hour, however many pages are opened", async () => {
    Object.assign(env, { DCU_RESULTS: "on" });
    await admin.query(
      `update riders set uci_id = $1, races_checked_at = null where id = 'rv_rider'`,
      [UCI],
    );
    const calls = fakeFetch({ [PORTAL]: () => html(PAGE) });
    await refreshStaleRacesOnVisit(COACH);
    await drainJobs(["dcu.read_rider"]);
    expect(calls).toHaveLength(1);

    // Stale again, and the coach opens another page: the hour is not over.
    await admin.query(`update riders set races_checked_at = null where id = 'rv_rider'`);
    await refreshStaleRacesOnVisit(COACH);
    await drainJobs(["dcu.read_rider"]);
    expect(calls).toHaveLength(1);
    const { rows } = await admin.query(
      `select count from app_rate_limits where key = $1 and reset_at > now() + interval '59 minutes'`,
      [`dcu-visit:${ORG}`],
    );
    expect(rows).toEqual([{ count: 2 }]);
  });

  it("counts nothing while the installation does not read races", async () => {
    Object.assign(env, { DCU_RESULTS: "off" });
    await refreshStaleRacesOnVisit({ orgId: "org_racevisits_off", userId: COACH.userId });
    const { rows } = await admin.query(`select 1 from app_rate_limits where key = $1`, [
      "dcu-visit:org_racevisits_off",
    ]);
    expect(rows).toEqual([]);
  });
});
