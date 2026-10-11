import { createHash } from "node:crypto";
import { Refused } from "@/core/action";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { log } from "@/core/log";
import { peekRateLimit, rateLimit } from "@/core/rate-limit";
import { cleanTitle } from "@/modules/files/strava-archive";
import { requireWriteFor } from "@/modules/team/access";
import { loggable } from "./http";
import { importFit, knownFileHashes } from "./import";
import { storedName } from "./ingest-request";

/**
 * A rider's Strava archive, kept a few files at a time (ADR 0030). The
 * browser reads the archive and sends the rides Kadence does not have,
 * newest first, each with the name the rider gave it on Strava; this
 * keeps them through the ordinary import. The hour's sixty (ADR 0019,
 * 0029) would make a season's history an afternoon's work, so this door
 * has a budget of its own, counted per day for the person and the rider:
 * 500 rides kept and 1,000 files read. A ride whose file is already here
 * is answered by its hash before anything is counted, so a run that goes
 * on the next day, or a page that could not ask first, spends nothing on
 * it. A ride the archive has no name for is named by its sport on the
 * page, never by Strava's number.
 */

export const ARCHIVE_FILES_PER_REQUEST = 3;
export const ARCHIVE_KEPT_PER_DAY = 500;
export const ARCHIVE_READ_PER_DAY = 1_000;
export const ARCHIVE_REQUESTS_PER_DAY = 1_000;
/**
 * A minute's requests: a history comes a request every two seconds
 * (src/components/activities/archive-requests.ts), and no faster, so the
 * day's thousand cannot all arrive at once.
 */
export const ARCHIVE_REQUESTS_PER_MINUTE = 30;
export const DAY = 24 * 60 * 60 * 1000;
export const MINUTE = 60 * 1000;

export const archiveRequestsKey = (userId: string) => `archive:${userId}`;
export const archiveMinuteKey = (userId: string) => `archive-minute:${userId}`;

/** Per person and rider: nobody can use up another person's day by naming their rider. */
export const archiveKeptKey = (userId: string, riderId: string) =>
  `archive-kept:${userId}:${riderId}`;
export const archiveReadKey = (userId: string, riderId: string) =>
  `archive-read:${userId}:${riderId}`;

export type ArchiveFile = {
  name: string;
  title: string;
  /** Null for a file over the upload's cap, which is answered without being read. */
  bytes: Uint8Array | null;
  /** What the archive's list says the activity was, where it says (ADR 0030). */
  kind?: "bike" | "other";
};

export type ArchiveResult = { name: string; ok: boolean; activityId?: string; error?: string };

export type ArchiveAnswer = {
  results: ArchiveResult[];
  /** When the day's budget ran out: how long until there is room again. */
  retryAfterSeconds: number;
};

/** The caller writes for this rider, or is told no: asked before a door reads a body. */
export async function requireArchiveWriter(ctx: OrgContext, riderId: string): Promise<void> {
  await withOrgContext(ctx, (tx) => requireWriteFor(tx, ctx, riderId));
}

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export async function keepArchiveFiles(
  ctx: OrgContext,
  riderId: string,
  files: ArchiveFile[],
  onlyBike: boolean,
): Promise<ArchiveAnswer> {
  const sent = files.slice(0, ARCHIVE_FILES_PER_REQUEST);
  const hashes = sent.map((file) => (file.bytes ? sha256(file.bytes) : ""));
  // Before anything is counted: the caller writes for this rider, or is
  // told no (the lookup asks); and the files Kadence has are known by
  // their hash, so they cost nothing of the day.
  const known = new Set(await knownFileHashes(ctx, riderId, hashes.filter(Boolean)));

  const keptKey = archiveKeptKey(ctx.userId, riderId);
  const readKey = archiveReadKey(ctx.userId, riderId);
  const results: ArchiveResult[] = [];
  let retryAfterSeconds = 0;
  const wait = (seconds: number) => (retryAfterSeconds = Math.max(retryAfterSeconds, seconds));

  for (const [i, file] of sent.entries()) {
    const { name } = storedName(file.name, file.bytes ?? new Uint8Array());
    if (!file.bytes) {
      results.push({ name, ok: false, error: "too_large" });
      continue;
    }
    if (known.has(hashes[i]!)) {
      results.push({ name, ok: false, error: "duplicate" });
      continue;
    }
    const room = peekRateLimit(keptKey, ARCHIVE_KEPT_PER_DAY);
    if (!room.allowed) {
      wait(room.retryAfterSeconds);
      results.push({ name, ok: false, error: "rateLimited" });
      continue;
    }
    const read = rateLimit(readKey, ARCHIVE_READ_PER_DAY, DAY);
    if (!read.allowed) {
      wait(read.retryAfterSeconds);
      results.push({ name, ok: false, error: "rateLimited" });
      continue;
    }
    const title = cleanTitle(file.title);
    try {
      const imported = await importFit(ctx, riderId, name, file.bytes, {
        source: "fit",
        title,
        unnamed: !title,
        onlySport: onlyBike ? "bike" : undefined,
        sportHint: file.kind,
      });
      rateLimit(keptKey, ARCHIVE_KEPT_PER_DAY, DAY);
      results.push({ name, ok: true, activityId: imported.activityId });
    } catch (error) {
      if (!(error instanceof Refused)) {
        await log.error("archive: import failed", { error: loggable(error) });
        results.push({ name, ok: false, error: "generic" });
      } else results.push({ name, ok: false, error: error.detail ?? error.code });
    }
  }
  return { results, retryAfterSeconds };
}
