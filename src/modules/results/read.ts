import { rateLimit } from "@/core/rate-limit";
import { DeviceHttpError, loggable } from "@/modules/devices/http";
import { DcuPageError, parseDcuProfile, type DcuProfile } from "./dcu-profile";
import { fetchDcuProfile } from "./fetch-dcu";

/**
 * Reading a rider's page at Cykling Danmark, shared by the coach's import
 * (refresh.ts) and the rider's own (own.ts), and the manners both keep
 * (ADR 0039): one reading per rider at a time, never more than six pages a
 * minute for the whole installation, and a page that does not read
 * cleanly turned into a short word, never into an import of nothing.
 */

/** How old a rider's races may be before opening Kadence reads them again. */
export const STALE_MS = 3 * 60 * 60 * 1000;
const PER_MINUTE = 6;
const inFlight = new Set<string>();

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
  if (inFlight.has(riderId)) return "busy";
  if (!rateLimit("dcu-results", PER_MINUTE, 60_000).allowed) return "busy";
  inFlight.add(riderId);
  try {
    return await work();
  } finally {
    inFlight.delete(riderId);
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
    console.warn("dcu results: read failed", loggable(error));
    return { error: errorWord(error) };
  }
}
