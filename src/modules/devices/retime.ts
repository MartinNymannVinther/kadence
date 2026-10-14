import { eq } from "drizzle-orm";
import { activities, activityFiles, riders } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { loadFile } from "@/modules/storage/keep";
import { requireCoach } from "@/modules/team/access";
import { activityFromFit } from "./from-fit";
import { retimePatch } from "./retime-rule";

/**
 * Reads a workspace's stored ride files again with today's moving time
 * and corrects the rides that were stored with the wrong one
 * (docs/adr/0096, retime-rule.ts says what changes). A coach's job, as
 * rereadActivityDetails (reread.ts) is: one file at a time, each in its
 * own transaction through RLS, so the audit log has every change and who
 * it was done for. The rider's current thresholds give the zones and a
 * load by power or heart rate, as an import today would.
 *
 * Idempotent: a corrected ride reads again as it is stored, so a second
 * run changes nothing. A file that is gone or no longer decodes is
 * counted and left as it is. `signal`, when aborted, stops before the
 * next file; what was corrected stays corrected.
 */

export type RetimeCount = { read: number; changed: number; failed: number };

export async function retimeActivities(
  ctx: OrgContext,
  signal?: AbortSignal,
): Promise<RetimeCount> {
  const files = await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    return tx.select({ activityId: activityFiles.activityId }).from(activityFiles);
  });

  const count: RetimeCount = { read: 0, changed: 0, failed: 0 };
  for (const { activityId } of files) {
    if (signal?.aborted) break;
    await withOrgContext(ctx, async (tx) => {
      const [row] = await tx
        .select({
          bytes: activityFiles.bytes,
          storageKey: activityFiles.storageKey,
          ftp: riders.ftpWatts,
          thresholdHr: riders.thresholdHr,
          movingSeconds: activities.movingSeconds,
          sport: activities.sport,
          rpe: activities.rpe,
          loadMethod: activities.loadMethod,
        })
        .from(activityFiles)
        .innerJoin(activities, eq(activities.id, activityFiles.activityId))
        .innerJoin(riders, eq(riders.id, activityFiles.riderId))
        .where(eq(activityFiles.activityId, activityId));
      if (!row) return;
      const bytes = await loadFile(row);
      if (!bytes) {
        count.failed++;
        return;
      }
      let patch;
      try {
        // The stored sport decides only where the file can but guess (a GPX).
        const hint = row.sport === "bike" ? "bike" : "other";
        patch = retimePatch(row, activityFromFit(bytes, row, hint));
      } catch {
        // The decoder is pure: whatever it throws is this file's, not the run's.
        count.failed++;
        return;
      }
      count.read++;
      if (!patch) return;
      await tx.update(activities).set(patch).where(eq(activities.id, activityId));
      count.changed++;
    });
  }
  return count;
}
