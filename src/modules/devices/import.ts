import { createHash } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { Refused } from "@/core/action";
import { activities, activityFiles, plannedSessions, riders } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { baseName } from "@/modules/files";
import { FitError } from "@/modules/fit";
import { matchActivity } from "@/modules/load";
import { requireWriteFor } from "@/modules/team/access";
import { activityFromFit } from "./from-fit";

/**
 * A ride comes in: from the rider's upload, or from Wahoo, Garmin or Polar. The
 * file is decoded, summarised and stored beside the activity (so a better
 * decoder can read it again), the same file twice is refused, and the ride
 * lands on the planned session it fulfilled — same rider, same day, same
 * sport, closest in duration — so the calendar shows plan and done
 * together without anyone ticking anything off.
 */

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type ImportResult = {
  activityId: string;
  sessionId: string | null;
  /** The matched session's title, so the upload can say where the ride landed. */
  sessionTitle: string | null;
  crcOk: boolean;
};

export type ImportSource = {
  source: "fit" | "wahoo" | "garmin" | "polar";
  externalId?: string | null;
  /**
   * The file came without a name of its own (src/modules/devices/ingest.ts):
   * the title stays empty, and the pages name the sport in the reader's
   * language instead of a word Kadence made up.
   */
  unnamed?: boolean;
  /** The upload key the file came in with, kept on the ride (ADR 0029). */
  uploadKeyId?: string | null;
};

export async function importFitIn(
  tx: AppTransaction,
  ctx: OrgContext,
  riderId: string,
  fileName: string,
  bytes: Uint8Array,
  origin: ImportSource = { source: "fit" },
): Promise<ImportResult> {
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new Refused("invalid", "too_large");
  await requireWriteFor(tx, ctx, riderId);
  const [rider] = await tx
    .select({ ftp: riders.ftpWatts, thresholdHr: riders.thresholdHr })
    .from(riders)
    .where(eq(riders.id, riderId));
  if (!rider) throw new Refused("notFound");

  // The file Kadence already has is recognised before it is decoded: a
  // helper that sends a whole folder again costs a hash and a lookup per
  // file, not a decode.
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const [seen] = await tx
    .select({ id: activityFiles.id })
    .from(activityFiles)
    .where(and(eq(activityFiles.riderId, riderId), eq(activityFiles.sha256, sha256)));
  if (seen) throw new Refused("conflict", "duplicate");

  let values;
  try {
    values = activityFromFit(bytes, rider);
  } catch (error) {
    if (error instanceof FitError) throw new Refused("invalid", error.code);
    throw error;
  }

  // The same ride twice — a byte added to dodge the hash, or the upload of
  // a ride Wahoo already sent — is the same start by the same rider.
  const [sameStart] = await tx
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.riderId, riderId),
        eq(activities.startedAt, values.startedAt),
        inArray(activities.source, ["fit", "wahoo", "garmin", "polar"]),
      ),
    );
  if (sameStart) throw new Refused("conflict", "duplicate");

  const { crcOk, format: _format, title, ...row } = values;
  const [activity] = await tx
    .insert(activities)
    .values({
      orgId: ctx.orgId,
      riderId,
      ...row,
      title: (title || (origin.unnamed ? "" : baseName(fileName))).slice(0, 120),
      source: origin.source,
      externalId: origin.externalId ?? null,
      uploadKeyId: origin.uploadKeyId ?? null,
      createdBy: ctx.userId,
    })
    .onConflictDoNothing()
    .returning({ id: activities.id });
  if (!activity) throw new Refused("conflict", "duplicate");
  await tx.insert(activityFiles).values({
    orgId: ctx.orgId,
    riderId,
    activityId: activity.id,
    fileName: fileName.slice(0, 200),
    sha256,
    bytes: Buffer.from(bytes),
  });

  const open = await tx
    .select({
      id: plannedSessions.id,
      title: plannedSessions.title,
      sport: plannedSessions.sport,
      onDate: plannedSessions.onDate,
      minutes: plannedSessions.plannedMinutes,
      activityId: plannedSessions.activityId,
    })
    .from(plannedSessions)
    .where(
      and(
        eq(plannedSessions.riderId, riderId),
        eq(plannedSessions.onDate, values.onDate),
        isNull(plannedSessions.activityId),
      ),
    );
  const sessionId = matchActivity(
    { sport: values.sport, onDate: values.onDate, minutes: values.movingSeconds / 60 },
    open.map((s) => ({ ...s, sport: s.sport as "bike" | "strength" | "other" })),
  );
  if (sessionId)
    await tx
      .update(plannedSessions)
      .set({ activityId: activity.id })
      .where(eq(plannedSessions.id, sessionId));
  const sessionTitle = open.find((s) => s.id === sessionId)?.title ?? null;
  return { activityId: activity.id, sessionId, sessionTitle, crcOk };
}

export async function importFit(
  ctx: OrgContext,
  riderId: string,
  fileName: string,
  bytes: Uint8Array,
  origin?: ImportSource,
): Promise<ImportResult> {
  return withOrgContext(ctx, (tx) => importFitIn(tx, ctx, riderId, fileName, bytes, origin));
}

/** At most this many hashes are asked about at once. */
export const MAX_KNOWN_HASHES = 500;

/**
 * Which of these files Kadence already holds for the rider, by sha256:
 * what lets a folder from a device, or a helper sending everything again,
 * leave out the rides that are there. Answered only to someone who may
 * write for the rider, the same people who could find out by uploading.
 */
export async function knownFileHashes(
  ctx: OrgContext,
  riderId: string,
  hashes: string[],
): Promise<string[]> {
  const asked = [...new Set(hashes)].filter((h) => /^[0-9a-f]{64}$/.test(h));
  if (asked.length > MAX_KNOWN_HASHES) throw new Refused("invalid");
  return withOrgContext(ctx, async (tx) => {
    await requireWriteFor(tx, ctx, riderId);
    if (asked.length === 0) return [];
    const rows = await tx
      .select({ sha256: activityFiles.sha256 })
      .from(activityFiles)
      .where(and(eq(activityFiles.riderId, riderId), inArray(activityFiles.sha256, asked)));
    return rows.map((r) => r.sha256);
  });
}

/** The original file, for the rider's own download. */
export async function getActivityFile(ctx: OrgContext, activityId: string) {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx
      .select({ fileName: activityFiles.fileName, bytes: activityFiles.bytes })
      .from(activityFiles)
      .where(eq(activityFiles.activityId, activityId));
    return row ?? null;
  });
}

/** The stored file's name, for the page to say what format the ride came in. */
export async function getActivityFileName(ctx: OrgContext, activityId: string) {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx
      .select({ fileName: activityFiles.fileName })
      .from(activityFiles)
      .where(eq(activityFiles.activityId, activityId));
    return row?.fileName ?? null;
  });
}

/** Deleting an activity (and its file): the rider's or a coach's. The session it fulfilled opens again. */
export async function deleteActivity(ctx: OrgContext, activityId: string): Promise<void> {
  await withOrgContext(ctx, async (tx) => {
    const [row] = await tx.select().from(activities).where(eq(activities.id, activityId));
    if (!row) throw new Refused("notFound");
    await requireWriteFor(tx, ctx, row.riderId);
    await tx.delete(activities).where(eq(activities.id, activityId));
  });
}
