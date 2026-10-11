import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { takePlace } from "@/core/counters";
import { env } from "@/core/env";
import { enqueue } from "@/core/jobs/queue";
import { dcuRacesJob } from "@/modules/results/jobs";
import { dcuReadRider } from "@/modules/results/queue";
import { fakeFetch } from "../devices/fake-fetch";
import { adminPool, appClient, authClient } from "../helpers/db";
import { drainJobs } from "../helpers/jobs";
import { insertSql, seedPerson } from "../helpers/rows";
import { PAGE, UCI } from "../results/profile-fixture";

/**
 * Races from Cykling Danmark through the queue (ADR 0039, docs/adr/0085):
 * every hour the teams with riders who have a UCI ID are found by
 * dcu_teams_due() — the team and one coach, nothing else — and their
 * stale riders are read as that coach. A reading that finds the rider
 * being read elsewhere is put back, and one asked for by somebody who is
 * no longer a coach is done without reading.
 */

const ORG = "org_jobs_dcu";
const OWNER = { orgId: ORG, userId: "user_jobs_dcu_owner" };
const ADMIN = { orgId: ORG, userId: "user_jobs_dcu_admin" };
const MEMBER = { orgId: ORG, userId: "user_jobs_dcu_member" };
const NO_UCI = "org_jobs_dcu_none";
const PORTAL = `GET https://dcumedlem.sportstiming.dk/profile/${UCI}`;
const html = (body: string) =>
  new Response(body, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });

let admin: Pool;
const setting = env.DCU_RESULTS;

beforeAll(async () => {
  admin = adminPool();
  await seedPerson(admin, ORG, ADMIN.userId, "admin");
  await seedPerson(admin, ORG, OWNER.userId, "owner");
  await seedPerson(admin, ORG, MEMBER.userId, "member");
  await seedPerson(admin, NO_UCI, "user_jobs_dcu_none", "owner");
  for (const [org, id, uci] of [
    [ORG, "jd_rider", UCI],
    [NO_UCI, "jd_plain", null],
  ] as const) {
    const q = insertSql("riders", { org_id: org, id, name: id, birth_year: 2011, uci_id: uci });
    await admin.query(q.text, q.values);
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.assign(env, { DCU_RESULTS: setting });
});

afterAll(async () => {
  await admin.end();
});

describe("dcu_teams_due()", () => {
  it("names a team with a UCI ID and its owner, and nothing for one without", async () => {
    const app = await appClient();
    try {
      const { rows } = await app.query(
        `select org_id, user_id from dcu_teams_due() where org_id like 'org_jobs_dcu%'`,
      );
      expect(rows).toEqual([{ org_id: ORG, user_id: OWNER.userId }]);
    } finally {
      await app.end();
    }
  });

  it("is not the auth role's to call", async () => {
    const auth = await authClient();
    try {
      await expect(auth.query("select * from dcu_teams_due()")).rejects.toThrow(
        /permission denied/,
      );
    } finally {
      await auth.end();
    }
  });
});

describe("the hourly reading", () => {
  it("reads a stale rider as the team's coach, with nobody signed in", async () => {
    Object.assign(env, { DCU_RESULTS: UCI });
    const calls = fakeFetch({ [PORTAL]: () => html(PAGE) });
    await enqueue(dcuRacesJob, {});
    const runs = await drainJobs(["dcu.races", "dcu.read_rider"]);
    expect(runs.find((r) => r.kind === "dcu.races")).toMatchObject({ outcome: "done" });
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const { rows } = await admin.query(
      `select r.races_checked_at is not null as read,
         (select count(*)::int from calendar_events e
          where e.rider_id = r.id and e.created_by = $2) as races
       from riders r where r.id = 'jd_rider' and r.org_id = $1`,
      [ORG, OWNER.userId],
    );
    expect(rows[0].read).toBe(true);
    expect(rows[0].races).toBeGreaterThan(0);
  });

  it("does nothing while the installation reads no races", async () => {
    Object.assign(env, { DCU_RESULTS: "off" });
    const calls = fakeFetch({});
    await enqueue(dcuRacesJob, {});
    expect(await drainJobs(["dcu.races", "dcu.read_rider"])).toMatchObject([
      { kind: "dcu.races", outcome: "done", result: { teams: 0 } },
    ]);
    expect(calls).toHaveLength(0);
  });
});

describe("a reading in the queue", () => {
  it("is put back for ten seconds while the rider is being read elsewhere", async () => {
    Object.assign(env, { DCU_RESULTS: "on" });
    await admin.query("update riders set races_checked_at = null where id = 'jd_rider'");
    expect(await takePlace("in-flight:dcu-read:jd_rider", 1, 60_000)).toBe(true);
    const calls = fakeFetch({ [PORTAL]: () => html(PAGE) });
    const id = await enqueue(
      dcuReadRider,
      { as: "coach", userId: OWNER.userId, riderId: "jd_rider" },
      { orgId: ORG, dedupeKey: "coach:jd_rider" },
    );
    expect(await drainJobs(["dcu.read_rider"])).toMatchObject([{ id, outcome: "later" }]);
    expect(calls).toHaveLength(0);
    const { rows } = await admin.query(
      `select attempts, extract(epoch from run_at - now())::int as due_in from jobs where id = $1`,
      [id],
    );
    expect(rows[0].attempts).toBe(0);
    expect(rows[0].due_in).toBeGreaterThanOrEqual(9);
  });

  it("is done without reading when the one who asked is no longer a coach", async () => {
    Object.assign(env, { DCU_RESULTS: "on" });
    const calls = fakeFetch({ [PORTAL]: () => html(PAGE) });
    await enqueue(
      dcuReadRider,
      { as: "coach", userId: MEMBER.userId, riderId: "jd_rider" },
      { orgId: ORG, dedupeKey: "coach:member" },
    );
    expect(await drainJobs(["dcu.read_rider"])).toMatchObject([
      { outcome: "done", result: { state: "refused" } },
    ]);
    expect(calls).toHaveLength(0);
  });
});
