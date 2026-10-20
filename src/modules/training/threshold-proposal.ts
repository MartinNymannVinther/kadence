import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { Refused } from "@/core/action";
import { activities, riderMeasurements, riders } from "@/core/db/schema";
import { withOrgContext, type AppTransaction, type OrgContext } from "@/core/db/tenant";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import { rideNamesIn } from "@/modules/activities/names";
import type { RideName } from "@/modules/activities/ride-name";
import { ageIn, heartRateCeiling, summarizeHeartRate } from "@/modules/load/heart-rate-summary";
import {
  estimateThresholds,
  heartRateCandidates,
  type ThresholdEstimates,
} from "@/modules/load/threshold-estimate";
import type { Current, EstimateRide } from "@/modules/load/threshold-shared";

/**
 * Kadence's proposal for a rider's thresholds, read from their own rides
 * (docs/adr/0094). Whoever may read the rider's training may ask — the
 * rider, a coach, a parent the rider shares training with — and the rides
 * are read under the same RLS as everywhere else. Nothing is written:
 * the numbers go back to the form, and a person saves them or not.
 *
 * What is read, for a rider with a year of riding (say 250 rides):
 *
 * 1. one row per bike ride in the last 365 days, with only the small
 *    columns — the power curve (`best_powers`, about 25 numbers), average
 *    and max pulse, the moving time: some 250 rows and 100 kB;
 * 2. the pulse channel of the streams (`streams->'hr'`, one number per
 *    5 seconds) for the few rides that could hold a threshold or a max
 *    (`heartRateCandidates`, at most 18, usually 6–12): some 5–10 kB
 *    each, so under 200 kB. The other channels and the other rides'
 *    streams never leave the database;
 * 3. the resting pulses measured by hand in the last year, a handful of
 *    rows (wellbeing: read only by those the rider shares it with).
 */

export const WINDOW_DAYS = 365;

export type ThresholdProposal = {
  estimates: ThresholdEstimates;
  current: Current & { thresholdsOn: string | null };
  /** Bike rides in the last year, and how many of their pulse streams were read. */
  read: { rides: number; streams: number };
  /** What each source ride is called on the pages, by its id (docs/adr/0098). */
  rideNames: Record<string, RideName>;
};

async function mayReadTraining(tx: AppTransaction, riderId: string): Promise<boolean> {
  const result = await tx.execute(sql`select app_can_read_rider(${riderId}, 'training') as ok`);
  return (result.rows[0] as { ok?: boolean } | undefined)?.ok === true;
}

/** Whether the rider has a bike ride in the last year — what shows the button. */
export async function hasRidesForProposal(
  ctx: OrgContext,
  riderId: string,
  today: string = todayInCopenhagen(),
): Promise<boolean> {
  return withOrgContext(ctx, async (tx) => {
    const [row] = await tx
      .select({ id: activities.id })
      .from(activities)
      .where(
        and(
          eq(activities.riderId, riderId),
          eq(activities.sport, "bike"),
          gte(activities.onDate, addDaysIso(today, -WINDOW_DAYS)),
          lte(activities.onDate, today),
        ),
      )
      .limit(1);
    return Boolean(row);
  });
}

export async function proposeThresholds(
  ctx: OrgContext,
  riderId: string,
  options: { today?: string } = {},
): Promise<ThresholdProposal> {
  const today = options.today ?? todayInCopenhagen();
  const from = addDaysIso(today, -WINDOW_DAYS);
  return withOrgContext(ctx, async (tx) => {
    if (!(await mayReadTraining(tx, riderId))) throw new Refused("forbidden");
    const [rider] = await tx
      .select({
        birthYear: riders.birthYear,
        ftpWatts: riders.ftpWatts,
        thresholdHr: riders.thresholdHr,
        maxHr: riders.maxHr,
        restingHr: riders.restingHr,
        thresholdsOn: riders.thresholdsOn,
      })
      .from(riders)
      .where(eq(riders.id, riderId))
      .limit(1);
    if (!rider) throw new Refused("notFound");

    const rows = await tx
      .select({
        id: activities.id,
        onDate: activities.onDate,
        title: activities.title,
        movingSeconds: activities.movingSeconds,
        bestPowers: activities.bestPowers,
        avgHr: activities.avgHr,
        maxHr: activities.maxHr,
      })
      .from(activities)
      .where(
        and(
          eq(activities.riderId, riderId),
          eq(activities.sport, "bike"),
          gte(activities.onDate, from),
          lte(activities.onDate, today),
        ),
      );
    const rides = rows.map((r) => ({
      ...r,
      bestPowers: (r.bestPowers ?? null) as Record<string, number> | null,
    }));

    const candidates = heartRateCandidates(rides, today);
    const streams =
      candidates.length === 0
        ? []
        : await tx
            .select({ id: activities.id, hr: sql<unknown>`${activities.streams} -> 'hr'` })
            .from(activities)
            .where(and(eq(activities.riderId, riderId), inArray(activities.id, candidates)));
    const ceiling = heartRateCeiling(ageIn(rider.birthYear, today));
    const pulse = new Map(
      streams.map((s) => [s.id, summarizeHeartRate(Array.isArray(s.hr) ? s.hr : null, ceiling)]),
    );

    const resting = await tx
      .select({ measuredOn: riderMeasurements.measuredOn, value: riderMeasurements.value })
      .from(riderMeasurements)
      .where(
        and(
          eq(riderMeasurements.riderId, riderId),
          eq(riderMeasurements.kind, "resting_hr"),
          gte(riderMeasurements.measuredOn, from),
          lte(riderMeasurements.measuredOn, today),
        ),
      );

    const estimateRides: EstimateRide[] = rides.map((r) => ({
      id: r.id,
      onDate: r.onDate,
      title: r.title,
      bestPowers: r.bestPowers,
      hasHeartRate: r.avgHr !== null && r.avgHr > 0,
      ...(pulse.has(r.id) ? { heartRate: pulse.get(r.id) ?? null } : {}),
    }));
    const { thresholdsOn, birthYear, ...current } = rider;
    const estimates = estimateThresholds({
      rides: estimateRides,
      resting,
      birthYear,
      today,
      current,
    });
    const sourceIds = Object.values(estimates).flatMap((e) =>
      e.sources.flatMap((s) => (s.activityId ? [s.activityId] : [])),
    );
    return {
      estimates,
      current: { ...current, thresholdsOn },
      read: { rides: rides.length, streams: streams.length },
      rideNames: Object.fromEntries(await rideNamesIn(tx, sourceIds)),
    };
  });
}
