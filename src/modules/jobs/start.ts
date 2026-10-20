import { ensureSchedule } from "@/core/jobs/schedule";
import { startWorker, type RunningWorker } from "@/core/jobs/worker";
import { errorName, log } from "@/core/log";
import { jobHandlers } from "./handlers";

/**
 * Starting the worker (docs/adr/0085), the same in both places it runs:
 *
 * - the worker container (scripts/worker.ts, `WORKER=on`), where the
 *   loop keeps the process alive and the app only puts work in the queue;
 * - the app itself when no worker container runs (`WORKER` unset), from
 *   the instrumentation hook, as the reminder timer was. Its timers never
 *   hold the process open, and the first look waits a minute so a server
 *   that is starting is not also working. Self-hosting with one container
 *   works as it did (dogma two).
 *
 * The recurring rows are put in place first. A database that does not
 * answer yet is said in the log, the loop starts anyway, and it tries the
 * schedule again before a look, at most every half minute, until it has
 * been written once.
 */

const state = globalThis as unknown as { kadenceJobs?: RunningWorker };

export type StartOptions = { keepAlive: boolean; firstDelayMs?: number };

/** Puts the recurring rows in place; true once done. Never throws. */
async function scheduleOnce(handlers: ReturnType<typeof jobHandlers>): Promise<boolean> {
  try {
    const added = await ensureSchedule(handlers);
    if (added.length > 0) await log.info("jobs: schedule added", { kinds: added });
    return true;
  } catch (error) {
    await log.warn("jobs: schedule not written yet", { error: errorName(error) });
    return false;
  }
}

export async function startJobs(options: StartOptions): Promise<RunningWorker> {
  const handlers = jobHandlers();
  let scheduled = await scheduleOnce(handlers);
  let tried = Date.now();
  const worker = startWorker(handlers, {
    keepAlive: options.keepAlive,
    firstDelayMs: options.firstDelayMs,
    beforeLook: async () => {
      // At most every half minute, so a database that is away is said once a look, not twice.
      if (scheduled || Date.now() - tried < 30_000) return;
      tried = Date.now();
      scheduled = await scheduleOnce(handlers);
    },
  });
  await log.info("jobs: worker started", { worker: worker.name, kinds: [...handlers.keys()] });
  return worker;
}

/** The app's own worker, once per process however often it is asked. */
export async function startJobsInApp(): Promise<boolean> {
  if (state.kadenceJobs) return false;
  state.kadenceJobs = await startJobs({ keepAlive: false, firstDelayMs: 60_000 });
  return true;
}
