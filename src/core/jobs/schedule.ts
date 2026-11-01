import { enqueue } from "./queue";
import type { Handler } from "./registry";

/**
 * The work that comes round again (docs/adr/0085), and how often. Each
 * recurring kind has one row waiting, with the key "recurring"; when it
 * has run, the worker writes the next one, due `every` later, in the same
 * transaction (store.ts), whether the run went well or gave up. So the
 * schedule is rows, not a timer, and survives a deploy like any job.
 *
 * `ensureSchedule` puts the row there when it is missing — the first time
 * a worker starts, after a row was deleted by hand, or after the worker
 * was stopped longer than a run — and does nothing when it is there, so
 * every start may call it.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const SCHEDULE = {
  /** The reminder run (ADR 0060): every ten minutes, as the timer did. */
  reminders: 10 * MINUTE,
  /** Races from Cykling Danmark for every team with riders who have a UCI ID (ADR 0039). */
  dcuRaces: HOUR,
  /** The teams page's sources (ADR 0072): a snapshot is stale after a day. */
  teamsPage: 24 * HOUR,
  /** Demos past their 24 hours (ADR 0005, 0084). */
  demoCleanup: HOUR,
  /** Accounts door 2 made and nobody confirmed in thirty days (ADR 0088). */
  signupSweep: 24 * HOUR,
  /** Trials and payments that ran out, and the mails about them (ADR 0090). */
  billingExpire: 24 * HOUR,
  /** The counters' expired rows, Better Auth's, and old jobs. */
  sweep: 15 * MINUTE,
  /** Objects whose row is gone (docs/adr/0087): deleted from the store a little after the row. */
  fileTombstones: 15 * MINUTE,
  /** Garmin links renewed before their refresh token runs out (docs/adr/0113). */
  deviceRefresh: 24 * HOUR,
  /** Riders' bike sessions for the next seven days kept on their Garmin (docs/adr/0114). */
  deviceWorkouts: 15 * MINUTE,
} as const;

export const RECURRING_KEY = "recurring";

/** A row for every recurring kind among `handlers` that has none; their names. */
export async function ensureSchedule(
  handlers: Map<string, Handler>,
  firstRunInMs = MINUTE,
): Promise<string[]> {
  const added: string[] = [];
  for (const { kind } of handlers.values()) {
    if (kind.every === undefined) continue;
    if (await enqueue(kind, {}, { dedupeKey: RECURRING_KEY, delayMs: firstRunInMs }))
      added.push(kind.kind);
  }
  return added;
}
