import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { forget, takePlace } from "@/core/counters";
import { env } from "@/core/env";
import { enqueue } from "@/core/jobs/queue";
import { ensureSchedule, SCHEDULE } from "@/core/jobs/schedule";
import { sweepJob } from "@/core/jobs/sweep";
import { createDemoWorkspace } from "@/modules/demo/service";
import { demoCleanupJob } from "@/modules/demo/job";
import { jobHandlers } from "@/modules/jobs/handlers";
import { remindersJob } from "@/modules/push/jobs";
import { teamsRefreshJob, teamsSnapshot } from "@/modules/teams/refresh";
import { fakeFetch } from "../devices/fake-fetch";
import { adminPool } from "../helpers/db";
import { clearJobs, drainJobs } from "../helpers/jobs";

/**
 * The work that used to run on a timer, after a response or on a visit,
 * through the queue now (docs/adr/0085): the reminder run every ten
 * minutes, the teams page once a day and when a page finds it stale, the
 * demos past their time every hour, and the installation's sweep. Each is
 * the same function it was, called from a handler; the rides from Wahoo,
 * Garmin and Polar are tests/devices/webhooks.test.ts and polar.test.ts,
 * and the races from Cykling Danmark tests/jobs/dcu.test.ts and
 * tests/team/race-visits.test.ts.
 */

let admin: Pool;
let dir: string;
const before = { TEAMS_DIR: env.TEAMS_DIR, TEAMS_DCU: env.TEAMS_DCU };

beforeAll(async () => {
  admin = adminPool();
  dir = await mkdtemp(join(tmpdir(), "kadence-teams-"));
  Object.assign(env, { TEAMS_DIR: dir, TEAMS_DCU: "off" });
  // A demo opens only on an installation somebody owns (backlog P1-09).
  await admin.query(
    `insert into users (id, name, email, email_verified, platform_role)
     values ('user_jobs_moved_owner', 'Ejer', 'jobs-moved-owner@example.org', false, 'owner')
     on conflict (id) do update set platform_role = 'owner'`,
  );
});

beforeEach(async () => {
  await clearJobs();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  Object.assign(env, before);
  await rm(dir, { recursive: true, force: true });
  await admin.query("delete from users where id = 'user_jobs_moved_owner'");
  await admin.end();
});

describe("the schedule", () => {
  it("has one row for each recurring kind, due a minute after the worker starts", async () => {
    const added = await ensureSchedule(jobHandlers());
    expect(added.sort()).toEqual([
      "dcu.races",
      "demo.cleanup",
      "installation.sweep",
      "push.reminders",
      "teams.refresh",
    ]);
    const { rows } = await admin.query(
      `select kind, extract(epoch from run_at - now())::int as due_in from jobs order by kind`,
    );
    expect(rows.every((r) => r.due_in >= 55 && r.due_in <= 60)).toBe(true);
  });
});

describe("the reminder run", () => {
  it("ticks every ten minutes, and does nothing without the push keys", async () => {
    await enqueue(remindersJob, {}, { dedupeKey: "recurring" });
    expect(await drainJobs(["push.reminders"])).toMatchObject([
      { kind: "push.reminders", outcome: "done", result: null },
    ]);
    const { rows } = await admin.query(
      `select extract(epoch from run_at - now())::int as due_in from jobs
       where kind = 'push.reminders' and done_at is null`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].due_in * 1000).toBeGreaterThanOrEqual(SCHEDULE.reminders - 5_000);
  });
});

describe("the teams page", () => {
  it("is read by the job, and the snapshot is written for the page", async () => {
    const calls = fakeFetch({});
    await enqueue(teamsRefreshJob, {}, { dedupeKey: "recurring" });
    expect(await drainJobs(["teams.refresh"])).toMatchObject([{ outcome: "done" }]);
    expect(calls.length).toBeGreaterThan(0);
    const written = JSON.parse(await readFile(join(dir, "snapshot.json"), "utf8"));
    expect(written.uci.fetchedAt).toEqual(expect.any(String));
    expect(written.uci.error).toEqual(expect.any(String));
  });

  it("puts one refresh in the queue when a page finds the snapshot stale", async () => {
    const snapshot = JSON.parse(await readFile(join(dir, "snapshot.json"), "utf8"));
    snapshot.uci = { ...snapshot.uci, fetchedAt: "2026-01-01T00:00:00.000Z", error: null };
    await writeFile(join(dir, "snapshot.json"), JSON.stringify(snapshot));
    const calls = fakeFetch({});
    for (let i = 0; i < 3; i++) expect((await teamsSnapshot()).wait).toBeNull();
    expect(calls).toHaveLength(0);
    const { rows } = await admin.query(
      `select payload ->> 'key' as key from jobs where kind = 'teams.refresh' and done_at is null`,
    );
    expect(rows).toEqual([{ key: "stale" }]);
  });

  it("waits a minute while another refresh is reading", async () => {
    expect(await takePlace("teams-refresh", 1, 60_000)).toBe(true);
    try {
      fakeFetch({});
      await enqueue(teamsRefreshJob, {}, { dedupeKey: "stale" });
      expect(await drainJobs(["teams.refresh"])).toMatchObject([{ outcome: "later" }]);
    } finally {
      await forget("teams-refresh");
    }
  });
});

describe("the demos", () => {
  it("past their time are deleted every hour, visitors or not", async () => {
    expect(await createDemoWorkspace("da")).not.toBeNull();
    const { rows } = await admin.query(
      `select organization_id from demo_workspaces order by created_at desc limit 1`,
    );
    const demo = rows[0].organization_id as string;
    await admin.query(
      `update demo_workspaces set expires_at = now() - interval '1 minute' where organization_id = $1`,
      [demo],
    );
    await enqueue(demoCleanupJob, {}, { dedupeKey: "recurring" });
    const [run] = await drainJobs(["demo.cleanup"]);
    expect(run).toMatchObject({ outcome: "done" });
    expect((run!.result as { removed: number }).removed).toBeGreaterThanOrEqual(1);
    const left = await admin.query(`select count(*)::int as n from organizations where id = $1`, [
      demo,
    ]);
    expect(left.rows[0].n).toBe(0);
  });
});

describe("the installation's sweep", () => {
  it("takes the counters whose time has passed, and the jobs done a day ago", async () => {
    await admin.query(
      `insert into app_rate_limits (key, count, reset_at) values ('jobs-moved-old', 1, now() - interval '1 minute')`,
    );
    const old = await enqueue(sweepJob, {});
    await admin.query(`update jobs set done_at = now() - interval '2 days' where id = $1`, [old]);
    await enqueue(sweepJob, {}, { dedupeKey: "recurring" });
    const [run] = await drainJobs(["installation.sweep"]);
    expect(run).toMatchObject({ outcome: "done", result: { jobs: 1 } });
    const counters = await admin.query(
      `select 1 from app_rate_limits where key = 'jobs-moved-old'`,
    );
    expect(counters.rowCount).toBe(0);
  });
});
