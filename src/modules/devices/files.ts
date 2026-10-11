import { and, eq, inArray } from "drizzle-orm";
import { Refused } from "@/core/action";
import { activities, activityFiles } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { loadFile } from "@/modules/storage/keep";
import { requireWriteFor } from "@/modules/team/access";

/**
 * The files a rider's rides came in as, after the import: which are
 * already here, the original for a download, its name for the page, and
 * deleting a ride with its file. Every read is the row under RLS first;
 * the bytes follow from wherever the installation keeps them
 * (src/modules/storage/keep.ts, docs/adr/0087). Deleting a ride deletes
 * its row; the object it named is a tombstone the job clears.
 */

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

/** The original file for the download, from wherever it is kept; null when it is gone. */
export async function getActivityFile(ctx: OrgContext, activityId: string) {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx
      .select({
        fileName: activityFiles.fileName,
        bytes: activityFiles.bytes,
        storageKey: activityFiles.storageKey,
      })
      .from(activityFiles)
      .where(eq(activityFiles.activityId, activityId));
    if (!row) return null;
    const bytes = await loadFile(row);
    return bytes ? { fileName: row.fileName, bytes } : null;
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
