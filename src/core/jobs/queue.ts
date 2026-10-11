import type { z } from "zod";
import { appPool } from "@/core/db/client";
import { isJobKey } from "./payload";
import type { JobKind } from "./registry";

/**
 * Putting work in the queue (docs/adr/0085): one row in `jobs`
 * (drizzle/0047), written before anybody is told the work will be done.
 * From then on it is the worker's (worker.ts), and a deploy, a crash or a
 * second instance cannot lose it.
 *
 * The payload passes its kind's schema here, so a payload that would
 * carry anything but ids, days, counts and short words never reaches the
 * table (payload.ts). A dedupe key makes the same work wait once: while a
 * job of the kind, for the team, with the key is not done, asking again
 * adds nothing and answers null. The key is kept in the payload as `key`,
 * where the unique index looks for it, and is an id like the rest.
 *
 * One statement on the application role's pool, outside any team's
 * context: the table is the installation's, like the counters.
 */

export type EnqueueOptions = {
  /** When it is due, by this process's clock; now unless said. */
  runAt?: Date;
  /**
   * How long from now it is due, by the database's clock. Preferred to
   * `runAt` for "in ten seconds": the database and the app need not agree
   * to the millisecond on what time it is.
   */
  delayMs?: number;
  /** The team whose work it is: required for a kind that is a team's, refused for one that is not. */
  orgId?: string | null;
  /** The same kind, team and key wait once. */
  dedupeKey?: string;
};

type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * Called when a job due now is put in the queue, so a worker in this
 * process starts at once instead of at its next look (worker.ts). A
 * worker in another container looks every few seconds on its own.
 */
export function onEnqueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The job's id, or null when the same work was already waiting. */
export async function enqueue<S extends z.ZodType>(
  kind: JobKind<S>,
  payload: z.input<S>,
  options: EnqueueOptions = {},
): Promise<string | null> {
  const parsed = kind.payload.parse(payload) as Record<string, unknown>;
  const orgId = options.orgId ?? null;
  if (kind.team !== (orgId !== null))
    throw new Error(`jobs: ${kind.kind} ${kind.team ? "needs" : "takes no"} team`);
  if (options.dedupeKey !== undefined && !isJobKey(options.dedupeKey))
    throw new Error(`jobs: ${kind.kind} was given a key that is not an id`);
  const stored = options.dedupeKey === undefined ? parsed : { ...parsed, key: options.dedupeKey };
  const runAt = options.runAt ?? null;
  const delayMs = Math.max(0, options.delayMs ?? 0);

  const { rows } = await appPool.query<{ id: string }>(
    `insert into jobs (kind, payload, org_id, run_at, max_attempts)
     values ($1, $2, $3,
       coalesce($4, now() + $6::double precision * interval '1 millisecond'), $5)
     on conflict (kind, (coalesce(org_id, '')), ((payload ->> 'key')))
       where done_at is null and attempts < max_attempts
       do nothing
     returning id`,
    [kind.kind, JSON.stringify(stored), orgId, runAt, kind.maxAttempts, delayMs],
  );
  const id = rows[0]?.id ?? null;
  const dueNow = runAt ? runAt.getTime() <= Date.now() : delayMs === 0;
  if (id && dueNow) for (const listener of listeners) listener();
  return id;
}
