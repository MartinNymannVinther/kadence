/**
 * The line the readings from Cykling Danmark wait in (ADR 0039). Opening
 * Kadence puts a whole team's riders in it at once; it reads them one at a
 * time, ten seconds apart — six a minute, the installation's ceiling — in
 * this process, after the page has long been answered. A rider already in
 * the line is not put in twice, and a job that turns out to have nothing
 * to read (fresh, off) lets the next one go at once.
 *
 * In memory, like the rate limiter (src/core/rate-limit.ts): Kadence is one
 * process, and a line lost in a restart is filled again by the next visit.
 * Imports nothing, so it is tested on its own.
 */

const GAP_MS = 10_000;
/** A job answers whether it fetched a page, so only real readings are spaced. */
type Job = { key: string; run: () => Promise<boolean> };

const line: Job[] = [];
const waiting = new Set<string>();
let draining: Promise<void> | null = null;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function drain() {
  while (line.length > 0) {
    const job = line.shift()!;
    let fetched = false;
    try {
      fetched = await job.run();
    } catch (error) {
      // A name, never a message: a database error's message carries its parameters.
      console.warn(
        "dcu results: queued read failed",
        error instanceof Error ? error.name : "unknown",
      );
    } finally {
      waiting.delete(job.key);
    }
    if (fetched && line.length > 0) await pause(GAP_MS);
  }
}

function start() {
  draining = drain().finally(() => {
    draining = null;
    // A job that arrived as the last one finished still gets its turn.
    if (line.length > 0) start();
  });
}

export function enqueue(key: string, run: () => Promise<boolean>): void {
  if (waiting.has(key)) return;
  waiting.add(key);
  line.push({ key, run });
  if (!draining) start();
}

/** When the line is empty: for tests, and for nothing else. */
export async function whenIdle(): Promise<void> {
  while (draining) await draining;
}
