import { and, eq, inArray, sql } from "drizzle-orm";
import { activities } from "@/core/db/schema";
import type { AppTransaction } from "@/core/db/tenant";

/**
 * The AI reads a rider's rides from Garmin only with the rider's own yes
 * (docs/adr/0112): letting a model read them is the rider's own
 * decision, given explicitly and withdrawn at will. Without the yes, a
 * proposal built on the rider's rides says so instead of asking the model,
 * and Monday's overview leaves the rider out of what the model reads.
 *
 * A rider counts as having rides from Garmin when any ride of theirs came
 * through Garmin, whenever it was ridden: the form reaches back months and
 * the records years, so a window would have to follow every reader of
 * rides. Both questions run under the caller's own policies, so a rider
 * the caller may not read counts for nothing.
 */

export class GarminAiNotAllowed extends Error {
  constructor() {
    super("no yes to the AI reading rides from Garmin");
    this.name = "GarminAiNotAllowed";
  }
}

/** The riders, of these, with a standing yes of their own (drizzle/0060). */
async function saidYes(tx: AppTransaction, riderIds: string[]): Promise<Set<string>> {
  const result = await tx.execute(
    sql`select app_garmin_ai_riders(${sql.param(riderIds)}::text[]) as id`,
  );
  return new Set((result.rows as { id: string }[]).map((r) => r.id));
}

/** The riders, of these, whose rides the AI may not read: rides from Garmin and no yes. */
export async function garminAiBlocked(
  tx: AppTransaction,
  riderIds: string[],
): Promise<Set<string>> {
  if (riderIds.length === 0) return new Set();
  const withGarmin = await tx
    .selectDistinct({ riderId: activities.riderId })
    .from(activities)
    .where(and(eq(activities.source, "garmin"), inArray(activities.riderId, riderIds)));
  if (withGarmin.length === 0) return new Set();
  const yes = await saidYes(
    tx,
    withGarmin.map((r) => r.riderId),
  );
  return new Set(withGarmin.map((r) => r.riderId).filter((id) => !yes.has(id)));
}

/** Refuses before the model is asked when the rider's rides from Garmin are not the AI's to read. */
export async function requireGarminAi(tx: AppTransaction, riderId: string): Promise<void> {
  if ((await garminAiBlocked(tx, [riderId])).size > 0) throw new GarminAiNotAllowed();
}

/** The same for one ride: only a ride from Garmin needs the rider's yes. */
export async function requireGarminAiForRide(
  tx: AppTransaction,
  ride: { riderId: string; source: string },
): Promise<void> {
  if (ride.source !== "garmin") return;
  const yes = await saidYes(tx, [ride.riderId]);
  if (!yes.has(ride.riderId)) throw new GarminAiNotAllowed();
}
