"use client";

/**
 * The browser's two questions to Kadence during a Strava archive's run
 * (ADR 0030): which of these rides it has, and here are a few more. Two
 * ways to end them: a press on Stop (`stop`) starts nothing more and ends
 * every wait, but lets a request on its way be answered, so what came in
 * is counted; the page that held the run going away (`cutoff`) ends the
 * request on its way too, rather than leaving it to go on unseen.
 */

/** The server's cap on one question (src/modules/devices/import.ts). */
const ASK = 500;
/** The route takes thirty requests a minute (src/modules/devices/archive.ts): one every two seconds. */
export const PACE_MS = 2_000;
/** A busy door is waited for this many times running before the run gives up. */
const BUSY_TRIES = 5;
const MAX_BUSY_WAIT_MS = 60_000;
/** A dropped connection is tried once more, after this. */
const RETRY_MS = 2_000;

/** A wait that a press on Stop ends at once. */
export function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0 || signal.aborted) return resolve();
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener("abort", done, { once: true });
  });
}

/** Keeps a run's requests apart: each starts at least `paceMs` after the one before. */
export function pacer(paceMs: number): (signal: AbortSignal) => Promise<void> {
  let next = 0;
  return async (signal) => {
    await pause(next - Date.now(), signal);
    next = Date.now() + paceMs;
  };
}

/** Which of these hashes Kadence has; nothing when it cannot be asked — the server knows them anyway. */
export async function askKnown(
  riderId: string,
  hashes: string[],
  cutoff: AbortSignal,
): Promise<Set<string>> {
  const known = new Set<string>();
  try {
    for (let i = 0; i < hashes.length; i += ASK) {
      const response = await fetch("/api/activities/known", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId, hashes: hashes.slice(i, i + ASK) }),
        signal: cutoff,
      });
      if (!response.ok) return known;
      for (const hash of ((await response.json()) as { known?: string[] }).known ?? [])
        known.add(hash);
    }
  } catch {
    // Offline for a moment, or stopped: every ride goes, and the server passes over what it has.
  }
  return known;
}

export type FileAnswer = { ok: boolean; error?: string };

export type Sent =
  | { kind: "answered"; results: FileAnswer[]; retryAfterSeconds: number }
  | { kind: "limit"; retryAfterSeconds: number }
  | { kind: "signedOut" }
  | { kind: "failed" }
  | { kind: "cancelled" };

type Answer = { results?: FileAnswer[]; retryAfterSeconds?: number; error?: string };

/**
 * One request of rides. A dropped connection is tried once more; a busy
 * door (another tab's run, or the minute's requests used) is waited for
 * as long as it asks, a few times; the day's limit, a lost session and
 * anything else end the run.
 */
export async function sendBatch(
  url: string,
  form: FormData,
  run: {
    stop: AbortSignal;
    cutoff: AbortSignal;
    paced: (signal: AbortSignal) => Promise<void>;
  },
): Promise<Sent> {
  const { stop, cutoff, paced } = run;
  const ended = () => stop.aborted || cutoff.aborted;
  let busy = 0;
  let dropped = false;
  for (;;) {
    await paced(stop);
    if (ended()) return { kind: "cancelled" };
    let response: Response;
    try {
      response = await fetch(url, { method: "POST", body: form, signal: cutoff });
    } catch {
      if (ended()) return { kind: "cancelled" };
      if (dropped) return { kind: "failed" };
      dropped = true;
      await pause(RETRY_MS, stop);
      continue;
    }
    if (response.status === 401) return { kind: "signedOut" };
    const answer = (await response.json().catch(() => ({}))) as Answer;
    if (cutoff.aborted && !answer.results) return { kind: "cancelled" };
    if (response.status === 429 && answer.error === "busy") {
      busy += 1;
      if (busy > BUSY_TRIES) return { kind: "failed" };
      const seconds = Math.max(1, answer.retryAfterSeconds ?? 5);
      await pause(Math.min(MAX_BUSY_WAIT_MS, seconds * 1000), stop);
      continue;
    }
    if (response.status === 429)
      return { kind: "limit", retryAfterSeconds: answer.retryAfterSeconds ?? 0 };
    if (!response.ok || !answer.results) return { kind: "failed" };
    return {
      kind: "answered",
      results: answer.results,
      retryAfterSeconds: answer.retryAfterSeconds ?? 0,
    };
  }
}
