import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { env } from "@/core/env";
import { refreshRaces, refreshStaleRaces } from "@/modules/results/refresh";
import { listRaceResults, raceStatus, setUciId } from "@/modules/results/service";
import { fakeFetch } from "../devices/fake-fetch";
import { adminPool } from "../helpers/db";
import { insertSql, seedPerson } from "../helpers/rows";
import { PAGE, profilePage, UCI } from "../results/profile-fixture";

/**
 * A rider's races from Cykling Danmark (ADR 0039), through the services
 * as a coach and as a rider, against a stand-in for the portal: the UCI
 * ID is the coach's, the page is read only when the installation says so,
 * the races land in the calendar once however often they are read, a
 * race the coach planned gets its result rather than a twin, and a
 * failure is noted on the rider instead of reaching anyone.
 */

const ORG = "org_raceimport";
const COACH = { orgId: ORG, userId: "user_raceimport_coach" };
const RIDER = { orgId: ORG, userId: "user_raceimport_rider" };
const PORTAL = `GET https://dcumedlem.sportstiming.dk/profile/${UCI}`;
const TODAY = "2026-10-01";
const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });

let admin: Pool;
const setting = env.DCU_RESULTS;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, COACH.userId, "owner");
  await seedPerson(admin, ORG, RIDER.userId, "member");
  for (const [id, uid] of [
    ["ri_benja", RIDER.userId],
    ["ri_other", null],
  ] as const) {
    const q = insertSql("riders", { org_id: ORG, id, user_id: uid, name: id, birth_year: 2011 });
    await admin.query(q.text, q.values);
  }
  // The coach planned Greve themselves, as a team race.
  const q = insertSql("calendar_events", {
    org_id: ORG,
    id: "ev_greve",
    kind: "race",
    title: "Greve",
    starts_on: "2026-09-06",
    ends_on: "2026-09-06",
    priority: "B",
  });
  await admin.query(q.text, q.values);
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.assign(env, { DCU_RESULTS: setting });
});

afterAll(async () => {
  await admin.end();
});

const due = () => admin.query(`update riders set races_checked_at = null where org_id = $1`, [ORG]);
const events = () =>
  admin
    .query(
      `select title, starts_on::text as on, source from calendar_events
       where org_id = $1 and rider_id = 'ri_benja' order by starts_on`,
      [ORG],
    )
    .then((r) => r.rows);

describe("the UCI ID", () => {
  it("is set by a coach, as the licence prints it", async () => {
    expect(await setUciId(COACH, { riderId: "ri_benja", uciId: "100 123 456 78" })).toEqual({
      uciId: UCI,
    });
  });

  it("is refused when it is not one, or is another rider's on the team", async () => {
    await expect(setUciId(COACH, { riderId: "ri_other", uciId: "123" })).rejects.toMatchObject({
      code: "invalid",
    });
    await expect(setUciId(COACH, { riderId: "ri_other", uciId: UCI })).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("is not the rider's to set", async () => {
    await expect(setUciId(RIDER, { riderId: "ri_benja", uciId: UCI })).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});

describe("reading the races", () => {
  it("reads nothing while the installation does not read races", async () => {
    Object.assign(env, { DCU_RESULTS: "off" });
    const calls = fakeFetch({ [PORTAL]: () => html(PAGE) });
    expect(await refreshRaces(COACH, "ri_benja", { today: TODAY })).toEqual({ state: "off" });
    Object.assign(env, { DCU_RESULTS: "10099999999" });
    expect(await refreshRaces(COACH, "ri_benja", { today: TODAY })).toEqual({ state: "off" });
    expect(calls).toHaveLength(0);
  });

  it("puts the races in the calendar, and the results on them for the coach", async () => {
    Object.assign(env, { DCU_RESULTS: UCI });
    const calls = fakeFetch({ [PORTAL]: () => html(PAGE) });
    const outcome = await refreshRaces(COACH, "ri_benja", { today: TODAY });
    expect(outcome).toEqual({ state: "read", newRaces: 5, results: 7 });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.headers.get("user-agent")).toMatch(/^Kadence\//);

    const titles = (await events()).map((e) => `${e.on} ${e.title} ${e.source}`);
    expect(titles).toEqual([
      "2025-06-15 Future Racing 2025 dcu",
      "2026-06-21 Amager CR - Vitamin Well Grand Prix 2026 dcu",
      "2026-07-30 CAMPIONE HOLSTEBRO TOURS 2026 dcu",
      "2026-08-30 B&U DM Linjeløb - Vejle CK 2026 dcu",
      "2026-09-13 Demin Cup Finalen 2026 - Holbæk CS dcu",
    ]);
    const greve = await listRaceResults(COACH, {
      from: "2026-09-06",
      to: "2026-09-06",
      riderIds: ["ri_benja"],
    });
    expect(greve).toMatchObject([{ eventId: "ev_greve", place: 3, raceClass: "U17" }]);
  });

  it("does not read again within ten minutes, even when asked", async () => {
    Object.assign(env, { DCU_RESULTS: "on" });
    const calls = fakeFetch({ [PORTAL]: () => html(PAGE) });
    expect(await refreshRaces(COACH, "ri_benja", { force: true, today: TODAY })).toEqual({
      state: "fresh",
    });
    await refreshStaleRaces(COACH, ["ri_benja", "ri_other"]);
    expect(calls).toHaveLength(0);
  });

  it("reads the same page twice into the same calendar, with a corrected place", async () => {
    Object.assign(env, { DCU_RESULTS: "on" });
    await due();
    fakeFetch({ [PORTAL]: () => html(PAGE.replace(">11</a>", ">10</a>")) });
    expect(await refreshRaces(COACH, "ri_benja", { today: TODAY })).toMatchObject({
      state: "read",
      newRaces: 0,
    });
    expect(await events()).toHaveLength(5);
    const demin = await listRaceResults(COACH, {
      from: "2026-09-13",
      to: "2026-09-13",
      riderIds: ["ri_benja"],
    });
    expect(demin.map((r) => r.place)).toEqual([10]);
  });

  it("notes a page that is not the rider's, and changes nothing", async () => {
    Object.assign(env, { DCU_RESULTS: "on" });
    await due();
    fakeFetch({ [PORTAL]: () => html(profilePage("", "10099999999")) });
    expect(await refreshRaces(COACH, "ri_benja", { today: TODAY })).toEqual({
      state: "failed",
      error: "wrong_rider",
    });
    const status = await raceStatus(COACH, "ri_benja");
    expect(status.error).toBe("wrong_rider");
    expect(status.latest).toHaveLength(5);
    expect(await events()).toHaveLength(5);
  });

  it("notes a UCI ID the portal does not know", async () => {
    Object.assign(env, { DCU_RESULTS: "on" });
    await due();
    fakeFetch({ [PORTAL]: () => new Response("Not Found", { status: 404 }) });
    expect(await refreshRaces(COACH, "ri_benja", { today: TODAY })).toEqual({
      state: "failed",
      error: "unknown",
    });
  });

  it("is a coach's to ask for, and a coach's to read", async () => {
    await expect(refreshRaces(RIDER, "ri_benja")).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      listRaceResults(RIDER, { from: TODAY, to: TODAY, riderIds: ["ri_benja"] }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("drops what was read when the UCI ID is removed, and keeps the coach's race", async () => {
    await setUciId(COACH, { riderId: "ri_benja", uciId: "" });
    expect(await events()).toEqual([]);
    const greve = await admin.query(`select id from calendar_events where id = 'ev_greve'`);
    expect(greve.rowCount).toBe(1);
    const left = await admin.query(`select 1 from race_results where org_id = $1`, [ORG]);
    expect(left.rowCount).toBe(0);
  });
});
