import { createHash } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { Refused } from "@/core/action";
import { activities, activityFiles, plannedSessions, riders } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { objectKey } from "@/core/files/storage";
import { baseName } from "@/modules/files";
import { FitError } from "@/modules/fit";
import { matchActivity } from "@/modules/load";
import { discardPlaced, keepPlaced, placeFile } from "@/modules/storage/keep";
import { assertWritableIn } from "@/modules/billing/plan";
import { assertFileRoom } from "@/modules/storage/quota";
import { requireWriteFor } from "@/modules/team/access";
import { activityFromFit } from "./from-fit";

export {
  deleteActivity,
  getActivityFile,
  getActivityFileName,
  knownFileHashes,
  MAX_KNOWN_HASHES,
} from "./files";

/**
 * A ride comes in: from the rider's upload, or from Wahoo, Garmin or Polar. The
 * file is decoded, summarised and stored beside the activity (so a better
 * decoder can read it again), the same file twice is refused, and the ride
 * lands on the planned session it fulfilled — same rider, same day, same
 * sport, closest in duration — so the calendar shows plan and done
 * together without anyone ticking anything off.
 *
 * The file goes where the installation keeps files (docs/adr/0087): in
 * the row, or as an object the row names. A file that would take the
 * workspace past its quota is refused before it is decoded, and so is
 * every file for a workspace that may only be read (docs/adr/0090).
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
  /**
   * What the rider called the ride where it came from, a Strava archive's
   * `activities.csv` (ADR 0030): it wins over a name inside the file and
   * over the file's own name, because it is the name the rider last gave.
   */
  title?: string;
  /** Only a ride on the bike is kept; anything else is refused as `not_bike` before a row is written. */
  onlySport?: "bike";
  /**
   * What the list the file came with says it was (a Strava archive's
   * type, ADR 0030): the sport where the file can only guess, a GPX.
   */
  sportHint?: "bike" | "other";
  /**
   * The planned session the ride was ridden for, in Rulle (ADR 0033): the
   * ride lands on it when it is this rider's, still open and on the ride's
   * day; otherwise the usual match decides, as for any file.
   */
  sessionId?: string;
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
  await assertWritableIn(tx, ctx.orgId);
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
  await assertFileRoom(tx, bytes.byteLength);

  let values;
  try {
    values = activityFromFit(bytes, rider, origin.sportHint);
  } catch (error) {
    if (error instanceof FitError) throw new Refused("invalid", error.code);
    throw error;
  }
  if (origin.onlySport && values.sport !== origin.onlySport)
    throw new Refused("invalid", "not_bike");

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
      title: (origin.title || title || (origin.unnamed ? "" : baseName(fileName))).slice(0, 120),
      source: origin.source,
      externalId: origin.externalId ?? null,
      uploadKeyId: origin.uploadKeyId ?? null,
      createdBy: ctx.userId,
    })
    .onConflictDoNothing()
    .returning({ id: activities.id });
  if (!activity) throw new Refused("conflict", "duplicate");
  // The object first, then the row that names it, in this transaction; a
  // row that cannot be written takes the object with it (src/modules/storage/keep.ts).
  const placed = await placeFile(objectKey(ctx.orgId, riderId, sha256), bytes);
  try {
    await tx.insert(activityFiles).values({
      orgId: ctx.orgId,
      riderId,
      activityId: activity.id,
      fileName: fileName.slice(0, 200),
      sha256,
      bytes: placed.bytes ? Buffer.from(placed.bytes) : null,
      storageKey: placed.storageKey,
      sizeBytes: placed.size,
    });
    await keepPlaced(tx, placed);
  } catch (error) {
    await discardPlaced(placed);
    throw error;
  }

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
  const sessionId =
    open.find((s) => s.id === origin.sessionId && s.sport === values.sport)?.id ??
    matchActivity(
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
