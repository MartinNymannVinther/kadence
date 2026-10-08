import { env } from "@/core/env";
import { fetchDcu } from "./dcu/fetch";
import { readSnapshot, writeSnapshot } from "./snapshot";
import { SourceError } from "./http";
import type { SourceRead, TeamsSnapshot } from "./types";
import { fetchUci } from "./uci/fetch";

/**
 * When the sources are read again (ADR 0072). Kadence has no scheduled
 * job (ADR 0039), so the page itself asks: a snapshot older than a day
 * is refreshed, one refresh at a time across the process, and a page
 * that finds a stale snapshot shows it and refreshes behind the answer
 * (`after()`, in the page) rather than keeping the reader waiting. Only
 * a missing snapshot is waited for. Nothing a visitor does can start a
 * second refresh inside the day, so an open page cannot be used to
 * hammer the UCI or DCU.
 *
 * A source that fails keeps its last good answer and the word for why
 * (`error`), both shown on the page as "sidst hentet" and "kunne ikke
 * hentes". The DCU is read only when `TEAMS_DCU` is on.
 */

export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
/** A source that failed is tried again sooner than a day, but not on every visit. */
export const RETRY_AFTER_MS = 60 * 60 * 1000;

let running: Promise<TeamsSnapshot> | null = null;

/** Whether `read` wants reading again at `now`. Pure. */
export function wantsRefresh(read: SourceRead<unknown>, now: number): boolean {
  if (!read.fetchedAt) return true;
  const age = now - Date.parse(read.fetchedAt);
  return age > (read.error ? RETRY_AFTER_MS : STALE_AFTER_MS);
}

function describe(error: unknown): string {
  if (error instanceof SourceError)
    return error.status ? `${error.code} ${error.status}` : error.code;
  return error instanceof Error ? error.message.slice(0, 80) : "unknown";
}

async function readSource<T>(
  previous: SourceRead<T>,
  fetchIt: () => Promise<T>,
  now: Date,
): Promise<SourceRead<T>> {
  try {
    return { fetchedAt: now.toISOString(), data: await fetchIt(), error: null };
  } catch (error) {
    const why = describe(error);
    console.warn(`teams: source failed: ${why}`);
    // The last good answer stays; only the time and the word change.
    return { fetchedAt: now.toISOString(), data: previous.data, error: why };
  }
}

/** Reads what wants reading and writes the snapshot; one at a time. */
export function refreshTeams(
  fetchFn: typeof fetch = fetch,
  now = new Date(),
): Promise<TeamsSnapshot> {
  if (running) return running;
  running = (async () => {
    const previous = await readSnapshot();
    const today = now.toISOString().slice(0, 10);
    const uci = wantsRefresh(previous.uci, now.getTime())
      ? await readSource(previous.uci, () => fetchUci(fetchFn, today), now)
      : previous.uci;
    const dcu =
      env.TEAMS_DCU === "on" && wantsRefresh(previous.dcu, now.getTime())
        ? await readSource(previous.dcu, () => fetchDcu(fetchFn, today), now)
        : previous.dcu;
    const next: TeamsSnapshot = { version: 1, uci, dcu };
    if (uci !== previous.uci || dcu !== previous.dcu) await writeSnapshot(next);
    return next;
  })().finally(() => {
    running = null;
  });
  return running;
}

/**
 * The snapshot for a page: the one on disk, with a refresh started when
 * it is stale. `wait` is true only when there is nothing on disk at all.
 */
export async function teamsSnapshot(
  now = new Date(),
): Promise<{ snapshot: TeamsSnapshot; refresh: Promise<TeamsSnapshot> | null; wait: boolean }> {
  const snapshot = await readSnapshot();
  const dcuOn = env.TEAMS_DCU === "on";
  const stale =
    wantsRefresh(snapshot.uci, now.getTime()) ||
    (dcuOn && wantsRefresh(snapshot.dcu, now.getTime()));
  if (!stale) return { snapshot, refresh: null, wait: false };
  const nothing = !snapshot.uci.fetchedAt && !(dcuOn && snapshot.dcu.fetchedAt);
  return { snapshot, refresh: refreshTeams(fetch, now), wait: nothing };
}
