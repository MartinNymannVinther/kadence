"use client";

/**
 * What Kadence turned away of a rider's Strava archive, remembered in
 * this browser (ADR 0030), so a run that goes on the next day does not
 * send it again. The server remembers what it keeps — the next run asks
 * by hash and leaves those out — but not what it refuses: a ride it has
 * from the device under another file (recognised by its start), an
 * activity that is not a ride when only rides were asked for, a file its
 * decoder cannot read. Each of those costs a read of the day's budget
 * every time it is sent, and since the newest go first, the same ones
 * would go first every day.
 *
 * Only the file's hash and the reason are kept, per rider, for thirty
 * days: long enough for a history to come in over a few days, short
 * enough that a ride deleted since, or a decoder that has learnt more,
 * gets its chance again.
 */

export type Refusal = "duplicate" | "not_bike" | "unreadable";
export type RefusalMemory = Pick<Storage, "getItem" | "setItem">;

const PREFIX = "kadence:archive-refused:";
const KEEP_DAYS = 30;
const MAX_REMEMBERED = 5_000;
const DAY = 24 * 60 * 60 * 1000;
const HASH = /^[0-9a-f]{64}$/;
const CODE: Record<Refusal, string> = { duplicate: "d", not_bike: "n", unreadable: "u" };
const REFUSAL: Record<string, Refusal> = { d: "duplicate", n: "not_bike", u: "unreadable" };

type Stored = Record<string, [code: string, day: number]>;

/** The browser's own storage, where there is one and the browser lets the page use it. */
export function browserMemory(): RefusalMemory | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** What the server's answer to a file says about sending it again; nothing for a failure that may pass. */
export function refusalOf(error: string | undefined): Refusal | null {
  // Nothing about the file itself: it is tried again another day.
  if (!error || ["generic", "rateLimited", "busy", "quota"].includes(error)) return null;
  if (error === "duplicate" || error === "conflict") return "duplicate";
  if (error === "not_bike") return "not_bike";
  return "unreadable";
}

const today = (now: number) => Math.floor(now / DAY);

function fresh(stored: Stored, now: number): Array<[string, [string, number]]> {
  return Object.entries(stored).filter(
    ([hash, entry]) =>
      HASH.test(hash) &&
      Array.isArray(entry) &&
      typeof entry[0] === "string" &&
      REFUSAL[entry[0]] !== undefined &&
      typeof entry[1] === "number" &&
      today(now) - entry[1] <= KEEP_DAYS,
  );
}

function load(memory: RefusalMemory, riderId: string): Stored {
  try {
    const data: unknown = JSON.parse(memory.getItem(PREFIX + riderId) ?? "{}");
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Stored) : {};
  } catch {
    return {};
  }
}

export function recallRefusals(
  memory: RefusalMemory | null,
  riderId: string,
  now = Date.now(),
): Map<string, Refusal> {
  if (!memory) return new Map();
  return new Map(fresh(load(memory, riderId), now).map(([hash, [code]]) => [hash, REFUSAL[code]!]));
}

export function rememberRefusals(
  memory: RefusalMemory | null,
  riderId: string,
  learned: ReadonlyMap<string, Refusal>,
  now = Date.now(),
): void {
  if (!memory || learned.size === 0) return;
  const stored = load(memory, riderId);
  for (const [hash, refusal] of learned) stored[hash] = [CODE[refusal], today(now)];
  const kept = fresh(stored, now)
    .sort((a, b) => b[1][1] - a[1][1])
    .slice(0, MAX_REMEMBERED);
  try {
    memory.setItem(PREFIX + riderId, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    // A full or refused storage: the next run sends them again, and the server says the same.
  }
}
