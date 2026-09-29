"use client";

import {
  csvPath,
  readActivitiesCsv,
  stravaPrefix,
  stravaRides,
  type CsvIndex,
  type StravaRide,
} from "@/modules/files/strava-archive";
import type { ArchiveSource } from "./read-archive";

/**
 * A Strava archive into Kadence, in one move (ADR 0030). What the archive
 * holds is shown before anything is sent; then every ride is hashed here,
 * the server is asked which it has, and only the rest is sent, newest
 * first, three at a time, each with the name the rider gave it on Strava.
 * A run that stops — the day's budget, a closed lid — starts where it
 * left off the next time, because the rides that came in are known.
 */

export type ArchivePlan = {
  rides: StravaRide[];
  bike: number;
  other: number;
  /** Whether the archive's list could be read, so the rides have their names. */
  named: boolean;
};

export type ArchiveOutcome = "done" | "limit" | "signedOut" | "failed" | "cancelled";

export type ArchiveProgress = {
  phase: "checking" | "sending" | "finished";
  done: number;
  total: number;
  imported: number;
  known: number;
  skipped: number;
  unreadable: number;
  /** Rides not sent when the run stopped early. */
  left: number;
  retryAfterSeconds: number;
  outcome?: ArchiveOutcome;
};

/** The list can be long for a rider of many years; it is read whole, and no further. */
const MAX_CSV_BYTES = 64 * 1024 * 1024;
/** The server's cap on one question (src/modules/devices/import.ts). */
const ASK = 500;
/** The route's files a request (src/modules/devices/archive.ts). */
const BATCH = 3;

export async function planArchive(source: ArchiveSource): Promise<ArchivePlan | null> {
  const prefix = stravaPrefix(source.paths);
  if (prefix === null) return null;
  let csv: CsvIndex = new Map();
  const listPath = source.paths.find((p) => p.toLowerCase() === csvPath(prefix).toLowerCase());
  try {
    if (listPath)
      csv = readActivitiesCsv(new TextDecoder().decode(await source.read(listPath, MAX_CSV_BYTES)));
  } catch {
    // The names are a hint; the rides come in without them.
  }
  const rides = stravaRides(source.paths, prefix, csv);
  return {
    rides,
    bike: rides.filter((r) => r.kind !== "other").length,
    other: rides.filter((r) => r.kind === "other").length,
    named: csv.size > 0,
  };
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Which of these hashes Kadence has; nothing when it cannot be asked — the server knows them anyway. */
async function askKnown(riderId: string, hashes: string[]): Promise<Set<string>> {
  const known = new Set<string>();
  try {
    for (let i = 0; i < hashes.length; i += ASK) {
      const response = await fetch("/api/activities/known", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId, hashes: hashes.slice(i, i + ASK) }),
      });
      if (!response.ok) return known;
      for (const hash of ((await response.json()) as { known?: string[] }).known ?? [])
        known.add(hash);
    }
  } catch {
    // Offline for a moment: every ride goes, and the server passes over what it has.
  }
  return known;
}

type Answer = { results?: Array<{ ok: boolean; error?: string }>; retryAfterSeconds?: number };

async function post(form: FormData): Promise<Response> {
  try {
    return await fetch("/api/activities/archive", { method: "POST", body: form });
  } catch {
    // A dropped connection is tried once more before the run gives up.
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    return fetch("/api/activities/archive", { method: "POST", body: form });
  }
}

export async function importArchive(
  riderId: string,
  source: ArchiveSource,
  plan: ArchivePlan,
  options: { onlyBike: boolean; signal: AbortSignal; onProgress: (p: ArchiveProgress) => void },
): Promise<ArchiveProgress> {
  const wanted = options.onlyBike ? plan.rides.filter((r) => r.kind !== "other") : plan.rides;
  const p: ArchiveProgress = {
    phase: "checking",
    done: 0,
    total: wanted.length,
    imported: 0,
    known: 0,
    skipped: plan.rides.length - wanted.length,
    unreadable: 0,
    left: 0,
    retryAfterSeconds: 0,
  };
  const report = () => options.onProgress({ ...p });
  const stop = (outcome: ArchiveOutcome, left: number) => {
    Object.assign(p, { phase: "finished", outcome, left });
    report();
    return { ...p };
  };
  report();

  // Hashed here, so the rides Kadence has are neither read twice nor sent.
  const hashed: Array<{ ride: StravaRide; hash: string | null }> = [];
  const seen = new Set<string>();
  const canHash = Boolean(globalThis.crypto?.subtle);
  for (const [i, ride] of wanted.entries()) {
    if (options.signal.aborted) return stop("cancelled", wanted.length - i);
    try {
      const hash = canHash ? await sha256(await source.read(ride.path)) : null;
      if (hash && seen.has(hash)) p.known += 1;
      else {
        if (hash) seen.add(hash);
        hashed.push({ ride, hash });
      }
    } catch {
      p.unreadable += 1;
    }
    p.done = i + 1;
    if (p.done % 10 === 0 || p.done === wanted.length) report();
  }
  const known = await askKnown(
    riderId,
    hashed.flatMap((h) => (h.hash ? [h.hash] : [])),
  );
  const fresh = hashed.filter((h) => !h.hash || !known.has(h.hash)).map((h) => h.ride);
  p.known += hashed.length - fresh.length;
  Object.assign(p, { phase: "sending", done: 0, total: fresh.length });
  report();

  for (let i = 0; i < fresh.length; i += BATCH) {
    if (options.signal.aborted) return stop("cancelled", fresh.length - i);
    const form = new FormData();
    form.set("riderId", riderId);
    form.set("only", options.onlyBike ? "bike" : "all");
    let sent = 0;
    for (const ride of fresh.slice(i, i + BATCH)) {
      try {
        const bytes = await source.read(ride.path);
        form.append("file", new File([bytes as Uint8Array<ArrayBuffer>], ride.fileName));
        form.append("title", ride.title);
        sent += 1;
      } catch {
        p.unreadable += 1;
      }
    }
    if (sent > 0) {
      let response: Response;
      try {
        response = await post(form);
      } catch {
        return stop("failed", fresh.length - i);
      }
      if (response.status === 401) return stop("signedOut", fresh.length - i);
      const answer = (await response.json().catch(() => ({}))) as Answer;
      if (response.status === 429) {
        p.retryAfterSeconds = answer.retryAfterSeconds ?? 0;
        return stop("limit", fresh.length - i);
      }
      if (!response.ok || !answer.results) return stop("failed", fresh.length - i);
      let limited = 0;
      for (const result of answer.results) {
        if (result.ok) p.imported += 1;
        else if (result.error === "duplicate" || result.error === "conflict") p.known += 1;
        else if (result.error === "not_bike") p.skipped += 1;
        else if (result.error === "rateLimited") limited += 1;
        else p.unreadable += 1;
      }
      if (limited > 0) {
        p.retryAfterSeconds = answer.retryAfterSeconds ?? 0;
        return stop("limit", fresh.length - Math.min(fresh.length, i + BATCH) + limited);
      }
    }
    p.done = Math.min(fresh.length, i + BATCH);
    report();
  }
  return stop("done", 0);
}
