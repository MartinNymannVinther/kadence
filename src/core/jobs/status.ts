import { appPool } from "@/core/db/client";

/**
 * How the queue stands (docs/adr/0085), for `/api/health` and the
 * owner's Installation page. Counts and times only; no kind, no payload.
 *
 * - pending: due and not yet run (a recurring job waiting for its hour is
 *   not pending);
 * - failed: given up after its last try, waiting for a person
 *   (scripts/retry-jobs.ts);
 * - oldestPendingSeconds: how long the oldest pending job has been due.
 *   A worker that keeps up keeps this to seconds;
 * - lastStartedAt: when a worker last took a job, which a recurring job
 *   makes at least every fifteen minutes while a worker runs.
 */

export type JobsHealth = { pending: number; failed: number; oldestPendingSeconds: number };
export type JobsOverview = JobsHealth & { lastStartedAt: Date | null };

export async function jobsOverview(): Promise<JobsOverview> {
  const { rows } = await appPool.query<{
    pending: number;
    failed: number;
    oldest: number | null;
    last: Date | null;
  }>(
    `select
       count(*) filter (where done_at is null and attempts < max_attempts and run_at <= now())::int
         as pending,
       count(*) filter (where done_at is null and attempts >= max_attempts)::int as failed,
       floor(extract(epoch from now() - min(run_at) filter (
         where done_at is null and attempts < max_attempts and run_at <= now())))::int as oldest,
       max(started_at) as last
     from jobs`,
  );
  const row = rows[0];
  return {
    pending: row?.pending ?? 0,
    failed: row?.failed ?? 0,
    oldestPendingSeconds: Math.max(0, row?.oldest ?? 0),
    lastStartedAt: row?.last ?? null,
  };
}

export async function jobsHealth(): Promise<JobsHealth> {
  const { pending, failed, oldestPendingSeconds } = await jobsOverview();
  return { pending, failed, oldestPendingSeconds };
}
