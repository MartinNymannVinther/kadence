import { givePlace, takePlace } from "@/core/counters";
import { env } from "@/core/env";
import { payload } from "@/core/jobs/payload";
import { enqueue } from "@/core/jobs/queue";
import { handle, jobKind, later } from "@/core/jobs/registry";
import { SCHEDULE } from "@/core/jobs/schedule";
import { errorName, log } from "@/core/log";
import { fetchDcu } from "./dcu/fetch";
import { refreshPhotos } from "./photos";
import { readSnapshot, teamsDir, writeSnapshot } from "./snapshot";
import { SourceError } from "./http";
import type { SourceRead, TeamsSnapshot } from "./types";
import { fetchUci } from "./uci/fetch";

/**
 * When the sources are read again (ADR 0072, docs/adr/0085). A job,
 * `teams.refresh`, reads them once a day, and a page that finds the
 * snapshot older than a day shows it as it is and puts a refresh in the
 * queue (one waiting at a time, by its key) rather than keeping the
 * reader waiting. Only a missing snapshot is waited for, read in the
 * request. One refresh runs at a time across every instance and the
 * worker: a place held in the counters (src/core/counters.ts), given
 * back by the clock if a process dies holding it. A refresh reads only
 * the sources that want reading, so one run twice reads nothing twice,
 * and nothing a visitor does can start a second refresh inside the day,
 * so an open page cannot be used to hammer the UCI or DCU.
 *
 * A source that fails keeps its last good answer and the word for why
 * (`error`), both shown on the page as "sidst hentet" and "kunne ikke
 * hentes". The DCU is read only when `TEAMS_DCU` is on.
 *
 * The disk may refuse: a volume the app's user cannot write to, a full
 * disk. Then the snapshot lives in the process that read it alone
 * (`latest`), the page is served from it when that is the app, and the
 * log says why — the page never answers 500 for a cache it could not
 * keep. The worker container shares the volume (docker-compose.yml).
 */

export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
/** A source that failed is tried again sooner than a day, but not on every visit. */
export const RETRY_AFTER_MS = 60 * 60 * 1000;

/** One refresh at a time, on every instance; given back after ten minutes whatever happens. */
const PLACE = "teams-refresh";
const PLACE_MS = 10 * 60_000;
/** What this process last read, for when the disk would not keep it. */
let latest: TeamsSnapshot | null = null;

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
    await log.warn("teams: source failed", { why });
    // The last good answer stays; only the time and the word change.
    return { fetchedAt: now.toISOString(), data: previous.data, error: why };
  }
}

/**
 * Reads what wants reading and writes the snapshot; one at a time across
 * the installation. Null when another refresh holds the place.
 */
export async function refreshTeams(
  fetchFn: typeof fetch = fetch,
  now = new Date(),
): Promise<TeamsSnapshot | null> {
  if (!(await takePlace(PLACE, 1, PLACE_MS))) return null;
  try {
    const onDisk = await readSnapshot();
    const previous = onDisk.uci.fetchedAt || onDisk.dcu.fetchedAt ? onDisk : (latest ?? onDisk);
    const today = now.toISOString().slice(0, 10);
    const uci = wantsRefresh(previous.uci, now.getTime())
      ? await readSource(previous.uci, () => fetchUci(fetchFn, today), now)
      : previous.uci;
    const dcu =
      env.TEAMS_DCU === "on" && wantsRefresh(previous.dcu, now.getTime())
        ? await readSource(previous.dcu, () => fetchDcu(fetchFn, today), now)
        : previous.dcu;
    // Photos ride along with the UCI's day: asked for only when something else is.
    const photos =
      uci !== previous.uci || dcu !== previous.dcu || !previous.photos
        ? await refreshPhotos(fetchFn, previous.photos ?? {}, now)
        : previous.photos;
    const next: TeamsSnapshot = { version: 1, uci, dcu, photos };
    latest = next;
    if (uci !== previous.uci || dcu !== previous.dcu || photos !== previous.photos) {
      try {
        await writeSnapshot(next);
      } catch (error) {
        await log.warn("teams: snapshot not written", { dir: teamsDir(), why: describe(error) });
      }
    }
    return next;
  } finally {
    await givePlace(PLACE);
  }
}

/** The daily refresh, and a stale page's ask for one now. */
export const teamsRefreshJob = jobKind("teams.refresh", payload({}), {
  every: SCHEDULE.teamsPage,
  // Three sources and the riders' photos, each with its own deadline.
  timeoutMs: 4 * 60_000,
});

export const teamsRefreshHandler = handle(teamsRefreshJob, async () => {
  if (env.GUIDE_TEAMS === "off") return null;
  const next = await refreshTeams();
  // Another refresh is reading: this one looks again in a minute, and
  // then finds nothing that wants reading.
  return next ? { uci: next.uci.fetchedAt, dcu: next.dcu.fetchedAt } : later(60_000);
});

/**
 * The snapshot for a page: the one on disk. When it is stale a refresh
 * is put in the queue; `wait` is a refresh to wait for, only when there
 * is nothing on disk at all.
 */
export async function teamsSnapshot(
  now = new Date(),
): Promise<{ snapshot: TeamsSnapshot; wait: Promise<TeamsSnapshot | null> | null }> {
  const onDisk = await readSnapshot();
  // The disk's copy when it has one; else what this process last read.
  const snapshot = onDisk.uci.fetchedAt || onDisk.dcu.fetchedAt ? onDisk : (latest ?? onDisk);
  const dcuOn = env.TEAMS_DCU === "on";
  const stale =
    wantsRefresh(snapshot.uci, now.getTime()) ||
    (dcuOn && wantsRefresh(snapshot.dcu, now.getTime()));
  if (!stale) return { snapshot, wait: null };
  const nothing = !snapshot.uci.fetchedAt && !(dcuOn && snapshot.dcu.fetchedAt);
  if (nothing) return { snapshot, wait: refreshTeams(fetch, now) };
  try {
    await enqueue(teamsRefreshJob, {}, { dedupeKey: "stale" });
  } catch (error) {
    // The page shows what there is; the daily job reads it in any case.
    await log.warn("teams: refresh not queued", { error: errorName(error) });
  }
  return { snapshot, wait: null };
}
