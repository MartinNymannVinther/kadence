import { appPool } from "@/core/db/client";

/**
 * The statements the worker writes a job's fate with (docs/adr/0085),
 * each on the application role's pool, outside any team's context, like
 * the counters. Every one but the claim names the worker that holds the
 * job: a worker whose lease ran out, and whose job another worker has
 * taken since, changes nothing by finishing late.
 */

export type JobRow = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  org_id: string | null;
  attempts: number;
  max_attempts: number;
};

/** A lease is five minutes (drizzle/0047); a heartbeat renews it well before. */
export const LEASE_MS = 5 * 60_000;

/** Takes up to `limit` due jobs, leased to `worker` (claim_jobs, drizzle/0047). */
export async function claim(worker: string, limit: number, kinds?: string[]): Promise<JobRow[]> {
  const { rows } = await appPool.query<JobRow>(
    `select id, kind, payload, org_id, attempts, max_attempts from claim_jobs($1, $2, $3)`,
    [worker, limit, kinds ?? null],
  );
  return rows;
}

/** Renews the lease on the jobs `worker` still holds. */
export async function heartbeat(worker: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await appPool.query(
    `update jobs set locked_until = now() + interval '5 minutes'
     where locked_by = $1 and id = any($2::uuid[]) and done_at is null`,
    [worker, ids],
  );
}

/** Gives back jobs `worker` took and did not start, as if never taken. */
export async function release(worker: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await appPool.query(
    `update jobs set locked_by = null, locked_until = null
     where locked_by = $1 and id = any($2::uuid[]) and done_at is null`,
    [worker, ids],
  );
}

/**
 * The job is done. A recurring job's row is followed by the next one,
 * due `every` from now, in the same transaction: the schedule has no gap
 * a crash could fall into.
 */
export async function markDone(worker: string, row: JobRow, every?: number): Promise<boolean> {
  const client = await appPool.connect();
  try {
    await client.query("begin");
    const done = await client.query(
      `update jobs set done_at = now(), locked_by = null, locked_until = null, last_error = null
       where id = $1 and locked_by = $2 and done_at is null`,
      [row.id, worker],
    );
    const ok = (done.rowCount ?? 0) > 0;
    if (ok && every !== undefined) await scheduleNext(client, row.id, every);
    await client.query("commit");
    return ok;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Not yet, and not a failure: due again in `ms`, no try counted. */
export async function putBack(worker: string, id: string, ms: number): Promise<void> {
  await appPool.query(
    `update jobs set run_at = now() + $3::double precision * interval '1 millisecond',
       locked_by = null, locked_until = null
     where id = $1 and locked_by = $2 and done_at is null`,
    [id, worker, ms],
  );
}

/**
 * The run failed: one more try counted, and the job due again in `waitMs`
 * — or, at its last try (or `giveUp`), left undone with its error, which
 * is what a failed job is. A recurring job that gives up is followed by
 * the next one all the same.
 */
export async function markFailed(
  worker: string,
  row: JobRow,
  error: string,
  waitMs: number,
  options: { giveUp?: boolean; every?: number } = {},
): Promise<"retry" | "failed" | "lost"> {
  const client = await appPool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query<{ attempts: number; max_attempts: number }>(
      `update jobs set
         attempts = case when $4 then max_attempts else least(attempts + 1, max_attempts) end,
         last_error = $3,
         run_at = now() + $5::double precision * interval '1 millisecond',
         locked_by = null, locked_until = null
       where id = $1 and locked_by = $2 and done_at is null
       returning attempts, max_attempts`,
      [row.id, worker, error.slice(0, 200), options.giveUp ?? false, waitMs],
    );
    const after = rows[0];
    const outcome = !after ? "lost" : after.attempts >= after.max_attempts ? "failed" : "retry";
    if (outcome === "failed" && options.every !== undefined)
      await scheduleNext(client, row.id, options.every);
    await client.query("commit");
    return outcome;
  } catch (failure) {
    await client.query("rollback").catch(() => undefined);
    throw failure;
  } finally {
    client.release();
  }
}

async function scheduleNext(
  client: { query: (text: string, values: unknown[]) => Promise<unknown> },
  id: string,
  every: number,
): Promise<void> {
  await client.query(
    `insert into jobs (kind, payload, org_id, run_at, max_attempts)
     select kind, payload, org_id, now() + $2::double precision * interval '1 millisecond', max_attempts
     from jobs where id = $1
     on conflict (kind, (coalesce(org_id, '')), ((payload ->> 'key')))
       where done_at is null and attempts < max_attempts
       do nothing`,
    [id, every],
  );
}
