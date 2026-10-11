import { log } from "@/core/log";
import { rateLimit } from "@/core/rate-limit";
import { inFlight } from "@/modules/devices/in-flight";
import { DeviceHttpError, loggable } from "@/modules/devices/http";
import { DcuPageError, parseDcuProfile, type DcuProfile } from "./dcu-profile";
import { fetchDcuProfile } from "./fetch-dcu";

/**
 * Reading a rider's page at Cykling Danmark, shared by the coach's import
 * (refresh.ts) and the rider's own (own.ts), and the manners both keep
 * (ADR 0039): one reading per rider at a time, never more than six pages a
 * minute for the whole installation, and a page that does not read
 * cleanly turned into a short word, never into an import of nothing.
 * Both counts are kept in the database (src/core/counters.ts, ADR 0083),
 * so they hold across instances and restarts.
 */

/** How old a rider's races may be before opening Kadence reads them again. */
export const STALE_MS = 3 * 60 * 60 * 1000;
const PER_MINUTE = 6;
/** A rider's page is read by one request at a time, on whichever instance. */
const reading = inFlight("dcu-read", 1);

export type Read = { profile: DcuProfile } | { error: string };

/** Why the read failed, as the short word stored on the rider and shown to the coach. */
function errorWord(error: unknown): string {
  if (error instanceof DcuPageError) return error.code;
  if (error instanceof DeviceHttpError) {
    if (error.code === "status" && error.status === 404) return "unknown";
    return error.code;
  }
  return "generic";
}

/** The first of January of last year: the season before and this one. */
export function sinceFor(today: string): string {
  return `${Number(today.slice(0, 4)) - 1}-01-01`;
}

/** Whether a reading from `at` is older than `gap`. */
export function staleSince(at: Date | null | undefined, gap = STALE_MS): boolean {
  return !at || Date.now() - at.getTime() >= gap;
}

/**
 * Runs `work` for the rider unless a reading of theirs is already under
 * way or the installation has read its six pages this minute: then it is
 * "busy", and the next visit tries again.
 */
export async function exclusive<T>(riderId: string, work: () => Promise<T>): Promise<T | "busy"> {
  if (!(await reading.enter(riderId))) return "busy";
  try {
    if (!(await rateLimit("dcu-results", PER_MINUTE, 60_000)).allowed) return "busy";
    return await work();
  } finally {
    await reading.leave(riderId);
  }
}

/**
 * The page of `uciId`, if it is a member's profile and the member was born
 * in `birthYear`: a UCI ID typed wrong, or someone else's, is another
 * person, and their races are not this rider's.
 */
export async function readProfile(uciId: string, birthYear: number): Promise<Read> {
  try {
    const profile = parseDcuProfile(await fetchDcuProfile(uciId), uciId);
    // Rows on the page and not one that reads: the page has changed, and
    // an import of nothing would say the rider rode nothing.
    if (profile.results.length === 0 && profile.skipped > 0) throw new DcuPageError("not_profile");
    if (profile.person.birthYear === null) throw new DcuPageError("not_profile");
    if (profile.person.birthYear !== birthYear) return { error: "wrong_person" };
    return { profile };
  } catch (error) {
    await log.warn("dcu results: read failed", { error: loggable(error) });
    return { error: errorWord(error) };
  }
}
