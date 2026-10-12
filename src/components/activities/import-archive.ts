"use client";

import {
  csvPath,
  readActivitiesCsv,
  stravaPrefix,
  stravaRides,
  type CsvIndex,
  type StravaRide,
} from "@/modules/files/strava-archive";
import { hashHex } from "@/modules/files/sha256";
import {
  browserMemory,
  recallRefusals,
  refusalOf,
  rememberRefusals,
  type Refusal,
  type RefusalMemory,
} from "./archive-memory";
import { askKnown, PACE_MS, pacer, sendBatch } from "./archive-requests";
import type { ArchiveSource } from "./read-archive";

/**
 * A Strava archive into Kadence, in one move (ADR 0030). What the archive
 * holds is shown before anything is sent; then every ride is hashed here,
 * the server is asked which it has, and only the rest is sent, newest
 * first, three at a time, a request every two seconds, each with the name
 * the rider gave it on Strava and the list's word for what it was. A run
 * that stops — the day's budget, a closed lid — starts where it left off
 * the next time: the rides that came in are known to the server, and the
 * ones it turned away are remembered here (./archive-memory.ts).
 */

export type ArchivePlan = {
  rides: StravaRide[];
  bike: number;
  other: number;
  /** Whether the archive's list could be read, so the rides have their names. */
  named: boolean;
};

export type ArchiveOutcome =
  "done" | "limit" | "quota" | "planExpired" | "signedOut" | "failed" | "cancelled";

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

/** What was sent in one request: the rides, with the hash each is known by. */
type Hashed = { ride: StravaRide; hash: string };

export type ImportOptions = {
  onlyBike: boolean;
  /** Stop: nothing more is started, and a request on its way is answered and counted. */
  signal: AbortSignal;
  /** The page is going: a request on its way ends too. Stop's own signal when not given. */
  cutoff?: AbortSignal;
  onProgress: (p: ArchiveProgress) => void;
  /** Where refusals are remembered between runs: the browser's storage unless told otherwise. */
  memory?: RefusalMemory | null;
  /** Time between requests (the route's minute); tests set it to 0. */
  paceMs?: number;
};

export async function importArchive(
  riderId: string,
  source: ArchiveSource,
  plan: ArchivePlan,
  options: ImportOptions,
): Promise<ArchiveProgress> {
  const { onlyBike, signal } = options;
  const cutoff = options.cutoff ?? signal;
  const stopped = () => signal.aborted || cutoff.aborted;
  const wanted = onlyBike ? plan.rides.filter((r) => r.kind !== "other") : plan.rides;
  const memory = options.memory === undefined ? browserMemory() : options.memory;
  const refused = recallRefusals(memory, riderId);
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

  // Hashed here, so the rides Kadence has, or has turned away before, are
  // neither read twice nor sent. Where the page has no crypto.subtle (a
  // Kadence reached over http), the hash is computed without it.
  const hashed: Hashed[] = [];
  const seen = new Set<string>();
  for (const [i, ride] of wanted.entries()) {
    // Nothing has been sent yet: every ride still to come is left.
    if (stopped()) return stop("cancelled", hashed.length + wanted.length - i);
    try {
      const hash = await hashHex(await source.read(ride.path));
      const before = refused.get(hash);
      if (seen.has(hash) || before === "duplicate") p.known += 1;
      else if (before === "unreadable") p.unreadable += 1;
      else if (before === "not_bike" && onlyBike) p.skipped += 1;
      else {
        seen.add(hash);
        hashed.push({ ride, hash });
      }
    } catch {
      p.unreadable += 1;
    }
    p.done = i + 1;
    if (p.done % 10 === 0 || p.done === wanted.length) report();
  }
  if (stopped()) return stop("cancelled", hashed.length);
  const known = await askKnown(
    riderId,
    hashed.map((h) => h.hash),
    cutoff,
  );
  const fresh = hashed.filter((h) => !known.has(h.hash));
  p.known += hashed.length - fresh.length;
  Object.assign(p, { phase: "sending", done: 0, total: fresh.length });
  report();

  const url = `/api/activities/archive?${new URLSearchParams({ riderId, only: onlyBike ? "bike" : "all" })}`;
  const paced = pacer(options.paceMs ?? PACE_MS);
  for (let i = 0; i < fresh.length; i += BATCH) {
    if (stopped()) return stop("cancelled", fresh.length - i);
    const form = new FormData();
    const batch: Hashed[] = [];
    for (const item of fresh.slice(i, i + BATCH)) {
      try {
        const bytes = await source.read(item.ride.path);
        form.append("file", new File([bytes as Uint8Array<ArrayBuffer>], item.ride.fileName));
        form.append("title", item.ride.title);
        form.append("kind", item.ride.kind);
        batch.push(item);
      } catch {
        p.unreadable += 1;
      }
    }
    if (batch.length > 0) {
      const sent = await sendBatch(url, form, { stop: signal, cutoff, paced });
      if (sent.kind === "cancelled") return stop("cancelled", fresh.length - i);
      if (sent.kind === "signedOut") return stop("signedOut", fresh.length - i);
      if (sent.kind === "failed") return stop("failed", fresh.length - i);
      if (sent.kind === "limit") {
        p.retryAfterSeconds = sent.retryAfterSeconds;
        return stop("limit", fresh.length - i);
      }
      let limited = 0;
      let full = 0;
      let closed = 0;
      const learned = new Map<string, Refusal>();
      for (const [j, result] of sent.results.entries()) {
        const refusal = result.ok ? null : refusalOf(result.error);
        if (refusal && batch[j]) learned.set(batch[j].hash, refusal);
        if (result.ok) p.imported += 1;
        else if (result.error === "rateLimited") limited += 1;
        else if (result.error === "quota") full += 1;
        else if (result.error === "planExpired") closed += 1;
        else if (refusal === "duplicate") p.known += 1;
        else if (refusal === "not_bike") p.skipped += 1;
        else p.unreadable += 1;
      }
      rememberRefusals(memory, riderId, learned);
      // The workspace's room for files is used up (docs/adr/0087): the rest
      // of the archive waits for someone to make room, not for the clock.
      if (full > 0) return stop("quota", fresh.length - Math.min(fresh.length, i + BATCH) + full);
      // The workspace may only be read (docs/adr/0090): nothing more comes in.
      if (closed > 0)
        return stop("planExpired", fresh.length - Math.min(fresh.length, i + BATCH) + closed);
      if (limited > 0) {
        p.retryAfterSeconds = sent.retryAfterSeconds;
        return stop("limit", fresh.length - Math.min(fresh.length, i + BATCH) + limited);
      }
    }
    p.done = Math.min(fresh.length, i + BATCH);
    report();
  }
  return stop("done", 0);
}
