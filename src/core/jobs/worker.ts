import { hostname } from "node:os";
import { randomBytes } from "node:crypto";
import { errorName, log } from "@/core/log";
import { onEnqueue } from "./queue";
import { GiveUp, isLater, type Handler } from "./registry";
import { claim, heartbeat, markDone, markFailed, putBack, release, type JobRow } from "./store";

/**
 * The worker (docs/adr/0085): takes a few due jobs, runs them one after
 * the other, writes down how each went, and looks again.
 *
 * - A job is leased for five minutes when it is taken (drizzle/0047), and
 *   the lease is renewed every minute while this worker holds it, so a
 *   long run is not taken from under it. A worker that dies holding jobs
 *   — a deploy, a crash — loses its lease, and the next look takes them
 *   again, counted as a try.
 * - A run longer than its kind allows is a failure ("timeout"); its signal
 *   is aborted, for a handler that listens.
 * - A failure is tried again after 1, 5, 15, 60 and 240 minutes. After the
 *   kind's last try the job stays undone with its error, is logged, and is
 *   what /api/health and the Installation page count as failed;
 *   scripts/retry-jobs.ts gives it new tries.
 * - What the error was is written as its name and code, never its
 *   message: a database error's message carries its parameters.
 *
 * One worker runs in one process: the worker container (scripts/worker.ts,
 * WORKER=on) or, without one, the app itself (src/instrumentation-node.ts),
 * as the reminder timer did. Two of them are safe — SKIP LOCKED gives them
 * different jobs — only not faster, because each runs one job at a time.
 */

export const BACKOFF_MINUTES = [1, 5, 15, 60, 240] as const;
const HEARTBEAT_MS = 60_000;

/** How long to wait after the `tries`th failed run. */
export function backoffMs(tries: number): number {
  const index = Math.min(Math.max(tries, 1), BACKOFF_MINUTES.length) - 1;
  return BACKOFF_MINUTES[index]! * 60_000;
}

/** A name for this worker that no other process has: host, process and a few random bytes. */
export function workerName(): string {
  return `${hostname().slice(0, 40)}:${process.pid}:${randomBytes(3).toString("hex")}`;
}

export type JobRun = {
  id: string;
  kind: string;
  outcome: "done" | "later" | "retry" | "failed" | "lost";
  /** What the handler answered, for the tests. */
  result?: unknown;
  error?: string;
};

class Timeout extends Error {
  constructor() {
    super("job timed out");
    this.name = "Timeout";
  }
}

/** The error as a short word: the kind's own code, or the error's name and code. */
export function describeError(error: unknown): string {
  if (error instanceof GiveUp) return error.code;
  if (error instanceof Timeout) return "timeout";
  const code = (error as { code?: unknown } | null)?.code;
  const name = errorName(error);
  return typeof code === "string" && /^[\w.-]{1,40}$/.test(code) ? `${name}:${code}` : name;
}

async function runWithTimeout(handler: Handler, row: JobRow, payload: unknown): Promise<unknown> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Timeout());
    }, handler.kind.timeoutMs);
  });
  try {
    return await Promise.race([
      handler.run(payload, {
        id: row.id,
        orgId: row.org_id,
        attempt: row.attempts + 1,
        signal: controller.signal,
      }),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Runs one job this worker holds, and writes down how it went. */
export async function runJob(
  handlers: Map<string, Handler>,
  worker: string,
  row: JobRow,
): Promise<JobRun> {
  const handler = handlers.get(row.kind);
  const recurring = row.payload.key === "recurring" ? handler?.kind.every : undefined;
  const base = { id: row.id, kind: row.kind };
  try {
    if (!handler) throw new GiveUp("unknown_kind");
    const { key: _key, ...fields } = row.payload;
    const parsed = handler.kind.payload.safeParse(fields);
    if (!parsed.success) throw new GiveUp("invalid_payload");
    const result = await runWithTimeout(handler, row, parsed.data);
    if (isLater(result)) {
      await putBack(worker, row.id, result.later);
      return { ...base, outcome: "later", result };
    }
    const kept = await markDone(worker, row, recurring);
    return { ...base, outcome: kept ? "done" : "lost", result };
  } catch (error) {
    const word = describeError(error);
    const outcome = await markFailed(worker, row, word, backoffMs(row.attempts + 1), {
      giveUp: error instanceof GiveUp,
      every: recurring,
    });
    const fields = { kind: row.kind, job: row.id, attempt: row.attempts + 1, error: word };
    if (outcome === "failed") await log.error("jobs: gave up", fields);
    else await log.warn("jobs: failed, will try again", fields);
    return { ...base, outcome, error: word };
  }
}

/**
 * Takes up to `limit` due jobs and runs them, one at a time. Jobs taken
 * and not started when `stopping()` turns true are given back.
 */
export async function runDue(
  handlers: Map<string, Handler>,
  options: { worker: string; limit?: number; kinds?: string[]; stopping?: () => boolean },
): Promise<JobRun[]> {
  const { worker } = options;
  const rows = await claim(worker, options.limit ?? 5, options.kinds);
  if (rows.length === 0) return [];
  const held = new Set(rows.map((row) => row.id));
  const beat = setInterval(() => {
    heartbeat(worker, [...held]).catch((error) =>
      log.warn("jobs: heartbeat failed", { error: errorName(error) }),
    );
  }, HEARTBEAT_MS);
  beat.unref?.();
  const runs: JobRun[] = [];
  try {
    for (const row of rows) {
      if (options.stopping?.()) break;
      runs.push(await runJob(handlers, worker, row));
      held.delete(row.id);
    }
  } finally {
    clearInterval(beat);
    if (held.size > 0) await release(worker, [...held]).catch(() => undefined);
  }
  return runs;
}

export type WorkerOptions = {
  name?: string;
  /** How long to wait between looks when nothing was due. */
  pollMs?: number;
  /** How many jobs to take at a time. */
  batch?: number;
  /** How long to wait before the first look. */
  firstDelayMs?: number;
  /** Whether the worker's timers keep the process alive: yes in the worker container, no in the app. */
  keepAlive?: boolean;
  /** Runs before each look; a throw counts as a failed look. */
  beforeLook?: () => Promise<void>;
};

export type RunningWorker = { name: string; stop: (graceMs?: number) => Promise<void> };

/** Starts the loop. `stop` stops taking jobs and waits up to `graceMs` for the one running. */
export function startWorker(
  handlers: Map<string, Handler>,
  options: WorkerOptions = {},
): RunningWorker {
  const name = options.name ?? workerName();
  const pollMs = options.pollMs ?? 5_000;
  // After a look that failed (the database away), wait longer before the next.
  const failedPollMs = Math.max(pollMs, 30_000);
  let stopped = false;
  let wake: (() => void) | null = null;
  let current: Promise<unknown> | null = null;

  const pause = (ms: number) =>
    new Promise<void>((resolve) => {
      const timer = setTimeout(done, ms);
      if (!options.keepAlive) timer.unref?.();
      function done() {
        clearTimeout(timer);
        wake = null;
        resolve();
      }
      wake = done;
    });
  const unsubscribe = onEnqueue(() => wake?.());

  const loop = async () => {
    if (options.firstDelayMs) await pause(options.firstDelayMs);
    while (!stopped) {
      let ran = 0;
      let failed = false;
      try {
        await options.beforeLook?.();
        const run = runDue(handlers, {
          worker: name,
          limit: options.batch,
          stopping: () => stopped,
        });
        current = run;
        ran = (await run).length;
      } catch (error) {
        failed = true;
        await log.error("jobs: could not take jobs", { error: errorName(error) });
      } finally {
        current = null;
      }
      if (!stopped && ran === 0) await pause(failed ? failedPollMs : pollMs);
    }
  };
  const looping = loop();

  return {
    name,
    async stop(graceMs = 8_000) {
      stopped = true;
      unsubscribe();
      wake?.();
      const running = current ?? looping;
      await Promise.race([
        running.catch(() => undefined),
        new Promise((r) => setTimeout(r, graceMs)),
      ]);
    },
  };
}
