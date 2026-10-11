import { sweepCounters } from "@/core/counters";
import { appPool } from "@/core/db/client";
import { payload } from "./payload";
import { handle, jobKind } from "./registry";
import { SCHEDULE } from "./schedule";

/**
 * The installation's tidying, every fifteen minutes (docs/adr/0083, 0085):
 * the counters whose time has passed and Better Auth's spent rate-limit
 * rows (src/core/counters.ts, which also sweeps now and then as it
 * counts), and the jobs nobody needs any more — done a day ago, or given
 * up a month ago and never tried again. A day, because a ride's job
 * carries the address the provider gave for its file, which has no
 * business outliving the import; a month, because a job that gave up
 * waits for a person (scripts/retry-jobs.ts). Deleting what is already
 * gone deletes nothing, so a second run is harmless.
 */

const DONE_KEPT = "1 day";
const FAILED_KEPT = "30 days";

/** Deletes the old jobs; how many. */
export async function pruneJobs(): Promise<number> {
  const { rowCount } = await appPool.query(
    `delete from jobs
     where done_at < now() - $1::interval
        or (done_at is null and attempts >= max_attempts and run_at < now() - $2::interval)`,
    [DONE_KEPT, FAILED_KEPT],
  );
  return rowCount ?? 0;
}

export const sweepJob = jobKind("installation.sweep", payload({}), { every: SCHEDULE.sweep });

export const sweepHandler = handle(sweepJob, async () => {
  const counters = await sweepCounters();
  return { ...counters, jobs: await pruneJobs() };
});
