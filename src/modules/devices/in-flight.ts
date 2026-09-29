/**
 * How many request bodies are being read for one person at this moment,
 * with a ceiling. A ride is held in memory while it is read, and a door
 * that reads a person's bodies without a ceiling lets one person, with
 * many requests at once, hold as much as they like: the day's budgets
 * count requests, not what is being read right now. A request over the
 * ceiling is answered "busy" before its body is read.
 *
 * In memory, like the rate limits (src/core/rate-limit.ts): one process
 * is the whole installation.
 */
export function inFlight(max: number) {
  const now = new Map<string, number>();
  return {
    /** Takes a place for the person, or says there is none. */
    enter(key: string): boolean {
      const taken = now.get(key) ?? 0;
      if (taken >= max) return false;
      now.set(key, taken + 1);
      return true;
    },
    /** Gives the place back; always, in a `finally`. */
    leave(key: string): void {
      const left = (now.get(key) ?? 1) - 1;
      if (left <= 0) now.delete(key);
      else now.set(key, left);
    },
    /** How many are being read for the person right now. */
    count(key: string): number {
      return now.get(key) ?? 0;
    },
  };
}

/**
 * The signed-in doors that take files — the upload and a Strava
 * archive's — share one ceiling per person: two bodies at once. The
 * browser sends one request at a time, so two leaves room for a second
 * tab and nothing more.
 */
export const SIGNED_IN_READS = 2;
export const signedInReads = inFlight(SIGNED_IN_READS);
/** How long a busy door asks the browser to wait. */
export const BUSY_SECONDS = 5;
