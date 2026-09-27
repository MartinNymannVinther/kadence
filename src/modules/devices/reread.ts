import { eq } from "drizzle-orm";
import { activities, activityFiles, riders } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { FitError } from "@/modules/fit";
import { requireCoach } from "@/modules/team/access";
import { activityFromFit } from "./from-fit";

/**
 * Reads a team's stored FIT files again with today's decoder and fills in
 * what an older import did not keep: the route, the laps, the climbs, the
 * power curve, the fastest second and the heart-rate drift. Only those —
 * the load, the zones, the rider's RPE and notes and the matched session
 * stay as they were. A coach's job, one file at a time, through RLS like
 * every other write; a file that no longer decodes is counted and left.
 */
export async function rereadActivityDetails(
  ctx: OrgContext,
): Promise<{ read: number; failed: number }> {
  const files = await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    return tx.select({ activityId: activityFiles.activityId }).from(activityFiles);
  });

  let read = 0;
  let failed = 0;
  for (const { activityId } of files) {
    await withOrgContext(ctx, async (tx) => {
      const [row] = await tx
        .select({
          bytes: activityFiles.bytes,
          ftp: riders.ftpWatts,
          thresholdHr: riders.thresholdHr,
        })
        .from(activityFiles)
        .innerJoin(riders, eq(riders.id, activityFiles.riderId))
        .where(eq(activityFiles.activityId, activityId));
      if (!row) return;
      try {
        const values = activityFromFit(new Uint8Array(row.bytes), row);
        await tx
          .update(activities)
          .set({
            streams: values.streams,
            bestPowers: values.bestPowers,
            laps: values.laps,
            climbs: values.climbs,
            maxSpeed: values.maxSpeed,
            hrDrift: values.hrDrift,
          })
          .where(eq(activities.id, activityId));
        read++;
      } catch (error) {
        if (!(error instanceof FitError)) throw error;
        failed++;
      }
    });
  }
  return { read, failed };
}
