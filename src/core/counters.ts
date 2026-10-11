import { appPool, authPool } from "@/core/db/client";

/**
 * Counters every instance of Kadence shares, in the unlogged table
 * `app_rate_limits` (drizzle/0043, docs/adr/0083): the rate limits
 * (src/core/rate-limit.ts), the places held while a body is read
 * (src/modules/devices/in-flight.ts), and a few moments to remember for a
 * while, such as when a rider's races were last read.
 *
 * They were Maps in one process. A restart forgot them, and a second
 * instance kept counts of its own, so a limit of thirty an hour was thirty
 * an hour per instance. Each operation here is one statement on the
 * application role's pool, outside any team's context: the table is the
 * installation's, like Better Auth's own `rate_limits`, and its one policy
 * lets the application role at every row of it and nothing else.
 *
 * Time is the database's (`now()`), so instances whose clocks differ still
 * agree on when a window ends. A moment to remember carries the caller's
 * own time instead, because the code that asks has its own `now`.
 *
 * Every minute or so, a count also sweeps: the rows whose time has passed
 * go, here and in Better Auth's table, which nothing else ever cleans.
 */

const SWEEP_EVERY_MS = 60_000;
/**
 * Better Auth's longest window is a minute (src/core/auth/auth.ts); a row
 * of its own untouched for ten is spent, and its next request starts over
 * whether the row is there or not.
 */
const AUTH_ROWS_KEPT_MS = 10 * 60_000;
/** A count stops here rather than run past the column: a flood is refused all the same. */
const CEILING = 1_000_000_000;

export type Count = { count: number; retryAfterSeconds: number };

type CountRow = { count: number; retry: number };

let lastSweep = 0;

/** Sweeps when a minute has passed since this process last did. Never fails the caller. */
async function sweepNowAndThen(): Promise<void> {
  const now = Date.now();
  if (now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;
  try {
    await sweepCounters();
  } catch (error) {
    // A name, never a message: a database error's message carries its parameters.
    console.warn("counters: sweep failed", error instanceof Error ? error.name : "unknown");
  }
}

/** Deletes every row whose time has passed, ours and Better Auth's. */
export async function sweepCounters(): Promise<{ counters: number; auth: number }> {
  const [counters, auth] = await Promise.all([
    appPool.query("delete from app_rate_limits where reset_at <= now()"),
    authPool.query("delete from rate_limits where last_request < $1", [
      Date.now() - AUTH_ROWS_KEPT_MS,
    ]),
  ]);
  return { counters: counters.rowCount ?? 0, auth: auth.rowCount ?? 0 };
}

/**
 * Counts one for `key` in a window of `windowMs`, starting a new window
 * when the last one has ended, and answers the count and how long until
 * the window ends. One statement, so two instances counting the same key
 * at the same moment both count.
 */
export async function countOne(key: string, windowMs: number): Promise<Count> {
  await sweepNowAndThen();
  const { rows } = await appPool.query<CountRow>(
    `insert into app_rate_limits as r (key, count, reset_at)
     values ($1, 1, now() + $2::double precision * interval '1 millisecond')
     on conflict (key) do update set
       count = case when r.reset_at <= now() then 1 else least(r.count + 1, $3) end,
       reset_at = case when r.reset_at <= now()
         then now() + $2::double precision * interval '1 millisecond'
         else r.reset_at end
     returning count, ceil(extract(epoch from (reset_at - now())))::int as retry`,
    [key, windowMs, CEILING],
  );
  const row = rows[0]!;
  return { count: row.count, retryAfterSeconds: Math.max(1, row.retry) };
}

/** The count in `key`'s window now, without counting: null when no window is open. */
export async function currentCount(key: string): Promise<Count | null> {
  const { rows } = await appPool.query<CountRow>(
    `select count, ceil(extract(epoch from (reset_at - now())))::int as retry
     from app_rate_limits where key = $1 and reset_at > now()`,
    [key],
  );
  const row = rows[0];
  return row ? { count: row.count, retryAfterSeconds: Math.max(1, row.retry) } : null;
}

/**
 * Takes one of `max` places under `key`, or answers false when they are
 * all taken. A place is held for at most `leaseMs` after the last one was
 * taken: a process that dies holding one gives it back by the clock.
 */
export async function takePlace(key: string, max: number, leaseMs: number): Promise<boolean> {
  await sweepNowAndThen();
  const { rows } = await appPool.query(
    `insert into app_rate_limits as r (key, count, reset_at)
     values ($1, 1, now() + $2::double precision * interval '1 millisecond')
     on conflict (key) do update set
       count = case when r.reset_at <= now() then 1 else r.count + 1 end,
       reset_at = now() + $2::double precision * interval '1 millisecond'
     where r.reset_at <= now() or r.count < $3
     returning count`,
    [key, leaseMs, max],
  );
  return rows.length > 0;
}

/** Gives a place under `key` back. */
export async function givePlace(key: string): Promise<void> {
  await appPool.query("update app_rate_limits set count = count - 1 where key = $1 and count > 0", [
    key,
  ]);
}

/** How many places under `key` are held now. */
export async function placesTaken(key: string): Promise<number> {
  return (await currentCount(key))?.count ?? 0;
}

/** Remembers `key` until `until`, by the caller's clock. */
export async function remember(key: string, until: Date): Promise<void> {
  await appPool.query(
    `insert into app_rate_limits (key, count, reset_at) values ($1, 0, $2)
     on conflict (key) do update set count = 0, reset_at = excluded.reset_at`,
    [key, until],
  );
}

/**
 * Until when `key` is remembered, or null. Read as it was written, by the
 * caller's clock: the caller decides whether it has passed. The sweep
 * removes it once the database's clock has.
 */
export async function recall(key: string): Promise<Date | null> {
  const { rows } = await appPool.query<{ reset_at: Date }>(
    "select reset_at from app_rate_limits where key = $1",
    [key],
  );
  return rows[0]?.reset_at ?? null;
}

/** Forgets `key`, whatever it held. */
export async function forget(key: string): Promise<void> {
  await appPool.query("delete from app_rate_limits where key = $1", [key]);
}

/** Only for tests: forget every counter, and sweep at the next count. */
export async function resetCounters(): Promise<void> {
  await appPool.query("delete from app_rate_limits");
  lastSweep = 0;
}
