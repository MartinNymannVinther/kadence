import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { field, payload } from "@/core/jobs/payload";
import { enqueue } from "@/core/jobs/queue";
import { GiveUp, handle, jobKind, later, registry } from "@/core/jobs/registry";
import { ensureSchedule } from "@/core/jobs/schedule";
import { jobsOverview } from "@/core/jobs/status";
import { claim, heartbeat, markDone } from "@/core/jobs/store";
import { backoffMs, runDue, startWorker } from "@/core/jobs/worker";
import { adminPool } from "../helpers/db";
import { clearJobs } from "../helpers/jobs";

/**
 * The worker (docs/adr/0085), against the database: two workers never
 * take the same job, a failed job is tried again after a growing wait and
 * gives up after its last try, a lease that runs out — a deploy in the
 * middle of a job — is taken again and the job is not lost, and the
 * recurring rows follow each other. The kinds here are the test's own.
 */

const admin: Pool = adminPool();
const MINUTE = 60_000;

const echo = jobKind("test.echo", payload({ n: field.count() }));
const flaky = jobKind("test.flaky", payload({ n: field.count() }), { maxAttempts: 3 });
const slow = jobKind("test.slow", payload({}), { timeoutMs: 50 });
const tick = jobKind("test.tick", payload({}), { every: 60 * MINUTE });
const teamWork = jobKind("test.team", payload({ riderId: field.id() }), { team: true });
const KINDS = ["test.echo", "test.flaky", "test.slow", "test.tick", "test.team"];

let failNext = true;
const seen: number[] = [];
const handlers = registry([
  handle(echo, async ({ n }) => {
    seen.push(n);
    return { n };
  }),
  handle(flaky, async ({ n }) => {
    if (n === 1) throw Object.assign(new Error("provider down"), { code: "status" });
    if (n === 2) throw new GiveUp("not_worth_it");
    if (n === 3) return later(30_000);
    if (failNext) {
      failNext = false;
      throw new Error("once");
    }
    return "ok";
  }),
  handle(slow, () => new Promise((resolve) => setTimeout(resolve, 500))),
  handle(tick, async () => "ticked"),
  handle(teamWork, async ({ riderId }, { orgId }) => `${orgId}:${riderId}`),
]);

const run = (worker = "w1", limit = 10) => runDue(handlers, { worker, limit, kinds: KINDS });

async function row(id: string) {
  const { rows } = await admin.query(
    `select attempts, max_attempts, last_error, done_at, locked_by, locked_until,
       extract(epoch from run_at - now())::int as due_in
     from jobs where id = $1`,
    [id],
  );
  return rows[0];
}

/** Makes a job due now, as if its wait were over. */
const dueNow = (id: string) => admin.query("update jobs set run_at = now() where id = $1", [id]);

beforeEach(async () => {
  await clearJobs();
  seen.length = 0;
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterAll(async () => {
  await clearJobs();
  await admin.end();
});

describe("two workers", () => {
  it("take different jobs, and between them all of them", async () => {
    for (let n = 0; n < 10; n++) await enqueue(echo, { n });
    const [a, b] = await Promise.all([claim("a", 5, KINDS), claim("b", 5, KINDS)]);
    const ids = [...a, ...b].map((job) => job.id);
    expect(a).toHaveLength(5);
    expect(b).toHaveLength(5);
    expect(new Set(ids).size).toBe(10);
    // Both hold their leases; nothing is left for a third.
    expect(await claim("c", 5, KINDS)).toEqual([]);
  });

  it("run every job once when they run at the same time", async () => {
    for (let n = 0; n < 12; n++) await enqueue(echo, { n });
    const runs = (await Promise.all([run("a", 3), run("b", 3), run("a2", 3), run("b2", 3)])).flat();
    expect(runs.every((r) => r.outcome === "done")).toBe(true);
    // Whatever one look left is taken by the next; nothing ran twice.
    await run();
    expect([...seen].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});

describe("a failed job", () => {
  it("is tried again after 1, 5 and 15 minutes, then gives up and stays undone", async () => {
    const id = (await enqueue(flaky, { n: 1 }))!;
    const waits: number[] = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      const [result] = await run();
      expect(result).toMatchObject({ id, outcome: attempt < 3 ? "retry" : "failed" });
      const after = await row(id);
      expect(after.attempts).toBe(attempt);
      expect(after.last_error).toBe("Error:status");
      expect(after.done_at).toBeNull();
      expect(after.locked_by).toBeNull();
      waits.push(after.due_in);
      await dueNow(id);
    }
    expect(waits.slice(0, 2)).toEqual([60, 300]);
    // Given up: no worker takes it again, and it is counted as failed.
    expect(await run()).toEqual([]);
    expect(await jobsOverview()).toMatchObject({ failed: 1, pending: 0 });
  });

  it("waits longer each time, up to four hours", () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => backoffMs(n) / MINUTE)).toEqual([1, 5, 15, 60, 240, 240]);
  });

  it("gives up at once when the handler says trying again will not mend it", async () => {
    const id = (await enqueue(flaky, { n: 2 }))!;
    expect(await run()).toMatchObject([{ id, outcome: "failed", error: "not_worth_it" }]);
    expect(await row(id)).toMatchObject({ attempts: 3, last_error: "not_worth_it" });
  });

  it("that is not ready is put back without counting a try", async () => {
    const id = (await enqueue(flaky, { n: 3 }))!;
    expect(await run()).toMatchObject([{ id, outcome: "later" }]);
    const after = await row(id);
    expect(after).toMatchObject({ attempts: 0, done_at: null, locked_by: null });
    expect(after.due_in).toBeGreaterThanOrEqual(29);
  });

  it("succeeds on its next try", async () => {
    failNext = true;
    const id = (await enqueue(flaky, { n: 4 }))!;
    expect(await run()).toMatchObject([{ outcome: "retry", error: "Error" }]);
    await dueNow(id);
    expect(await run()).toMatchObject([{ outcome: "done", result: "ok" }]);
    expect((await row(id)).done_at).not.toBeNull();
  });

  it("is a failure when it takes longer than its kind allows", async () => {
    const id = (await enqueue(slow, {}))!;
    expect(await run()).toMatchObject([{ id, outcome: "retry", error: "timeout" }]);
  });
});

describe("a deploy in the middle of a job", () => {
  it("loses nothing: the lease runs out and another worker takes the job again", async () => {
    const id = (await enqueue(echo, { n: 7 }))!;
    const [taken] = await claim("dying", 1, KINDS);
    expect(taken?.id).toBe(id);
    // While the lease holds, nobody else takes it.
    expect(await claim("other", 1, KINDS)).toEqual([]);

    // The dying worker never finishes; its lease runs out.
    await admin.query("update jobs set locked_until = now() - interval '1 second' where id = $1", [
      id,
    ]);
    expect(await run("w2")).toMatchObject([{ id, outcome: "done" }]);
    expect(await row(id)).toMatchObject({ attempts: 1, last_error: null });
    expect(seen).toEqual([7]);

    // The dying worker finishing late changes nothing.
    expect(await markDone("dying", taken!)).toBe(false);
  });

  it("keeps a long job's lease while its worker holds it, and only its worker", async () => {
    const id = (await enqueue(echo, { n: 1 }))!;
    await claim("long", 1, KINDS);
    await admin.query("update jobs set locked_until = now() + interval '5 seconds' where id = $1", [
      id,
    ]);
    await heartbeat("someone-else", [id]);
    const sql = "select extract(epoch from locked_until - now())::int as s from jobs where id = $1";
    const lease = () => admin.query(sql, [id]).then((r) => r.rows[0].s as number);
    expect(await lease()).toBeLessThanOrEqual(5);
    await heartbeat("long", [id]);
    expect(await lease()).toBeGreaterThanOrEqual(295);
  });

  it("gives back the jobs it took and had not started", async () => {
    for (let n = 0; n < 3; n++) await enqueue(echo, { n });
    let started = 0;
    const runs = await runDue(handlers, {
      worker: "stopping",
      limit: 3,
      kinds: KINDS,
      stopping: () => started++ >= 1,
    });
    expect(runs).toHaveLength(1);
    const { rows } = await admin.query(
      "select count(*)::int as n from jobs where done_at is null and locked_by is null",
    );
    expect(rows[0].n).toBe(2);
    expect(await run()).toHaveLength(2);
  });

  it("stops a running worker and leaves the queue for the next one", async () => {
    const worker = startWorker(handlers, { pollMs: 20, name: "looping" });
    await enqueue(echo, { n: 42 });
    await vi.waitFor(() => expect(seen).toContain(42), { timeout: 5_000 });
    await worker.stop(1_000);
    await enqueue(echo, { n: 43 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(seen).not.toContain(43);
  });
});

describe("the queue", () => {
  it("takes a team's job with its team, and refuses one without", async () => {
    await expect(enqueue(teamWork, { riderId: "r1" })).rejects.toThrow(/needs team/);
    await expect(enqueue(echo, { n: 1 }, { orgId: "org_x" })).rejects.toThrow(/takes no team/);
  });

  it("refuses a payload with anything but its own fields", async () => {
    // @ts-expect-error a field the kind does not have
    await expect(enqueue(echo, { n: 1, name: "Ida" })).rejects.toThrow();
    await expect(enqueue(echo, { n: 1 }, { dedupeKey: "Ida Holm" })).rejects.toThrow(/not an id/);
  });

  it("lets the same work wait once, and again once it is done or has given up", async () => {
    const first = await enqueue(echo, { n: 1 }, { dedupeKey: "rider:1" });
    expect(first).not.toBeNull();
    expect(await enqueue(echo, { n: 2 }, { dedupeKey: "rider:1" })).toBeNull();
    expect(await enqueue(echo, { n: 3 }, { dedupeKey: "rider:2" })).not.toBeNull();
    expect(await enqueue(echo, { n: 4 })).not.toBeNull();
    expect(await enqueue(echo, { n: 5 })).not.toBeNull();
    await run();
    expect(seen.sort()).toEqual([1, 3, 4, 5]);
    expect(await enqueue(echo, { n: 6 }, { dedupeKey: "rider:1" })).not.toBeNull();

    const gaveUp = (await enqueue(flaky, { n: 2 }, { dedupeKey: "k" }))!;
    expect(await enqueue(flaky, { n: 2 }, { dedupeKey: "k" })).toBeNull();
    await run();
    expect((await row(gaveUp)).done_at).toBeNull();
    expect(await enqueue(flaky, { n: 2 }, { dedupeKey: "k" })).not.toBeNull();
  });

  it("keeps the same key apart for different teams", async () => {
    await admin.query(
      `insert into organizations (id, name, slug) values
         ('org_jobs_a', 'A', 'jobs-a'), ('org_jobs_b', 'B', 'jobs-b') on conflict do nothing`,
    );
    const a = await enqueue(teamWork, { riderId: "r1" }, { orgId: "org_jobs_a", dedupeKey: "r1" });
    const b = await enqueue(teamWork, { riderId: "r1" }, { orgId: "org_jobs_b", dedupeKey: "r1" });
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect((await run()).map((r) => r.result).sort()).toEqual(["org_jobs_a:r1", "org_jobs_b:r1"]);
    // A deleted team takes its jobs with it.
    await enqueue(teamWork, { riderId: "r2" }, { orgId: "org_jobs_a" });
    await admin.query("delete from organizations where id in ('org_jobs_a', 'org_jobs_b')");
    const { rows } = await admin.query(
      "select count(*)::int as n from jobs where org_id is not null",
    );
    expect(rows[0].n).toBe(0);
  });

  it("counts what is due, what gave up and how long the oldest has waited", async () => {
    const waiting = (await enqueue(echo, { n: 1 }))!;
    await admin.query("update jobs set run_at = now() - interval '90 seconds' where id = $1", [
      waiting,
    ]);
    await enqueue(echo, { n: 2 }, { delayMs: 60 * MINUTE });
    const overview = await jobsOverview();
    expect(overview).toMatchObject({ pending: 1, failed: 0 });
    expect(overview.oldestPendingSeconds).toBeGreaterThanOrEqual(89);
    expect(overview.lastStartedAt).toBeNull();
    await run();
    expect((await jobsOverview()).lastStartedAt).toBeInstanceOf(Date);
  });
});

describe("a recurring job", () => {
  it("has one row waiting, and the next one is written when it has run", async () => {
    expect(await ensureSchedule(handlers, 0)).toEqual(["test.tick"]);
    expect(await ensureSchedule(handlers, 0)).toEqual([]);
    expect(await run()).toMatchObject([{ kind: "test.tick", outcome: "done", result: "ticked" }]);
    const { rows } = await admin.query(
      `select payload ->> 'key' as key, extract(epoch from run_at - now())::int as due_in
       from jobs where kind = 'test.tick' and done_at is null`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe("recurring");
    expect(rows[0].due_in).toBeGreaterThanOrEqual(3590);
    expect(await ensureSchedule(handlers, 0)).toEqual([]);
  });
});
