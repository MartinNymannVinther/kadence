import { appPool } from "@/core/db/client";
import type { Handler } from "@/core/jobs/registry";
import { runDue, type JobRun } from "@/core/jobs/worker";
import { jobHandlers } from "@/modules/jobs/handlers";

/**
 * Runs the jobs that are due now, the way the worker does (docs/adr/0085),
 * until none is left, and hands back how each went: the tests' stand-in
 * for the worker container. `kinds` keeps it to some kinds, so a test
 * runs only the work it put in the queue. A job put back for later or
 * waiting for its next try is not due, so this always ends.
 */
export async function drainJobs(
  kinds?: string[],
  handlers: Map<string, Handler> = jobHandlers(),
  worker = "test-worker",
): Promise<JobRun[]> {
  const runs: JobRun[] = [];
  for (let round = 0; round < 50; round++) {
    const batch = await runDue(handlers, { worker, limit: 10, kinds });
    if (batch.length === 0) break;
    runs.push(...batch);
  }
  return runs;
}

/** What the handlers answered, in order: for a test that asserts on outcomes. */
export async function drainResults(kinds?: string[]): Promise<unknown[]> {
  return (await drainJobs(kinds)).map((run) => run.result);
}

/** Every job, gone: for a test that counts them. */
export async function clearJobs(): Promise<void> {
  await appPool.query("delete from jobs");
}
