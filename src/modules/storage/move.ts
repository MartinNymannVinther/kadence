import { and, eq, isNotNull, notLike, sql } from "drizzle-orm";
import { activityFiles } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { FILE_CONTENT_TYPE, fileStorage, objectKey } from "@/core/files/storage";
import { field, payload } from "@/core/jobs/payload";
import { enqueue } from "@/core/jobs/queue";
import { handle, jobKind, later } from "@/core/jobs/registry";
import { errorName, log } from "@/core/log";
import { reserveKey } from "./keep";

/**
 * When a rider's history moves to another workspace (docs/adr/0081,
 * `move_rider_history`), the rows of their files move with it in the
 * database, but an object's key still names the workspace and rider row
 * they left. This job (docs/adr/0087) copies each object to its new key
 * and points the row at it; the trigger on activity_files writes the old
 * key to `file_tombstones`, and `files.tombstones` deletes it. Until a
 * row is updated, reads use the old key, which still holds the file, so
 * nothing is unreadable in between.
 *
 * It runs as the rider in the new workspace, under the ordinary
 * policies: they read and write their own rows and nobody else's. Fifty
 * files a run; a run that leaves rows asks to run again in a second. A
 * row already pointed at a key under the new workspace is not in the
 * list, so a second run finds less to do and the last finds nothing.
 * Enqueued only when files are objects; in `db` mode there is nothing to
 * move.
 */

export const MOVE_BATCH = 50;

export const filesMoveJob = jobKind(
  "files.move",
  payload({
    /** The rider row the history now belongs to, in the job's workspace. */
    riderId: field.id(),
    /** The rider's own account, which the move ran as; the job runs as them too. */
    userId: field.id(),
  }),
  { team: true, timeoutMs: 10 * 60_000 },
);

/** Puts the job in the queue after a history moved; null when files are in the database. */
export async function enqueueFileMove(ctx: OrgContext, riderId: string): Promise<string | null> {
  if (fileStorage().mode !== "s3") return null;
  return enqueue(
    filesMoveJob,
    { riderId, userId: ctx.userId },
    { orgId: ctx.orgId, dedupeKey: riderId },
  );
}

export type MoveRun = { moved: number; missing: number; left: boolean };

/** One batch for one rider; how many objects were copied, how many were not there, whether more wait. */
export async function moveBatch(
  ctx: OrgContext,
  riderId: string,
  limit = MOVE_BATCH,
): Promise<MoveRun> {
  const storage = fileStorage();
  if (!storage.objects) return { moved: 0, missing: 0, left: false };
  const objects = storage.objects;
  const prefix = `${ctx.orgId}/${riderId}/`;
  const rows = await withOrgContext(ctx, (tx) =>
    tx
      .select({ id: activityFiles.id, sha256: activityFiles.sha256, key: activityFiles.storageKey })
      .from(activityFiles)
      .where(
        and(
          eq(activityFiles.riderId, riderId),
          isNotNull(activityFiles.storageKey),
          notLike(activityFiles.storageKey, `${prefix.replace(/[\\%_]/g, "\\$&")}%`),
        ),
      )
      .orderBy(activityFiles.createdAt, activityFiles.id)
      .limit(limit),
  );
  let moved = 0;
  let missing = 0;
  for (const row of rows) {
    const from = row.key!;
    const to = objectKey(ctx.orgId, riderId, row.sha256);
    const bytes = await objects.getObject(from);
    if (!bytes) {
      missing += 1;
      await log.warn("files: an object to move is not in the store", { file: row.id });
      continue;
    }
    await reserveKey(to);
    await objects.putObject(to, bytes, FILE_CONTENT_TYPE);
    try {
      await withOrgContext(ctx, async (tx) => {
        await tx
          .update(activityFiles)
          .set({ storageKey: to })
          .where(and(eq(activityFiles.id, row.id), eq(activityFiles.storageKey, from)));
        await tx.execute(sql`delete from file_tombstones where storage_key = ${to}`);
      });
      moved += 1;
    } catch (error) {
      await log.error("files: a moved row could not be pointed at its object", {
        file: row.id,
        error: errorName(error),
      });
    }
  }
  return { moved, missing, left: rows.length >= limit };
}

export const filesMoveHandler = handle(filesMoveJob, async ({ riderId, userId }, { orgId }) => {
  const run = await moveBatch({ orgId: orgId!, userId }, riderId);
  return run.left && run.moved > 0 ? later(1_000) : run;
});
