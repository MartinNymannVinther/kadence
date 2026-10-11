import { givePlace, placesTaken, takePlace } from "@/core/counters";

/**
 * How many request bodies are being read for one person at this moment,
 * with a ceiling. A ride is held in memory while it is read, and a door
 * that reads a person's bodies without a ceiling lets one person, with
 * many requests at once, hold as much as they like: the day's budgets
 * count requests, not what is being read right now. A request over the
 * ceiling is answered "busy" before its body is read.
 *
 * Counted in the database with the rate limits (src/core/counters.ts,
 * docs/adr/0083), so two requests that land on two instances still share
 * the person's places. A place is a lease: an instance that dies while it
 * holds one gives it back after `LEASE_MS`, longer than any read and
 * import takes (a body is read within a minute, src/modules/devices/
 * ingest-request.ts). When the database cannot be asked, the door is busy.
 */

/** How long a place is held at most, from the last time one was taken. */
export const LEASE_MS = 5 * 60 * 1000;

export function inFlight(name: string, max: number) {
  const keyOf = (key: string) => `in-flight:${name}:${key}`;
  return {
    /** Takes a place for the person, or says there is none. */
    async enter(key: string): Promise<boolean> {
      try {
        return await takePlace(keyOf(key), max, LEASE_MS);
      } catch (error) {
        console.error("in-flight: the counters did not answer", nameOf(error));
        return false;
      }
    },
    /** Gives the place back; always, in a `finally`. */
    async leave(key: string): Promise<void> {
      try {
        await givePlace(keyOf(key));
      } catch (error) {
        // The lease gives it back by the clock.
        console.error("in-flight: a place was not given back", nameOf(error));
      }
    },
    /** How many are being read for the person right now. */
    count(key: string): Promise<number> {
      return placesTaken(keyOf(key));
    },
  };
}

/** A name, never a message: a database error's message carries its parameters. */
function nameOf(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}

/**
 * The signed-in doors that take files — the upload and a Strava
 * archive's — share one ceiling per person: two bodies at once. The
 * browser sends one request at a time, so two leaves room for a second
 * tab and nothing more.
 */
export const SIGNED_IN_READS = 2;
export const signedInReads = inFlight("signed-in", SIGNED_IN_READS);
/** How long a busy door asks the browser to wait. */
export const BUSY_SECONDS = 5;
