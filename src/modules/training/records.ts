import { and, desc, eq, gte } from "drizzle-orm";
import { activities } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import { rideNamesIn } from "@/modules/activities/names";
import type { RideName } from "@/modules/activities/ride-name";
import {
  bestCurve,
  inPeriod,
  PERIODS,
  records,
  type Period,
  type PowerRecord,
  type RecordSource,
  type Records,
} from "@/modules/load/records";

/**
 * A rider's records for the pages, read through RLS like every other
 * ride: whoever may read the rider's training reads them. Rides older
 * than `MAX_YEARS` are left out of "ever" — a record from a past class
 * says little about the rider now, and the query stays small.
 */

export const MAX_YEARS = 4;

export type RiderRecords = {
  byPeriod: Record<Period, Records>;
  /** The best curve per period, for a ride's curve to be held against. */
  curves: Record<Period, Array<[number, number]>>;
  /** Which of each period's power records this ride holds, when one is asked for. */
  setBy: Record<Period, number[]>;
  /** What each record's ride is called on the pages, by its id (docs/adr/0098). */
  names: Record<string, RideName>;
};

export async function getRiderRecords(
  ctx: OrgContext,
  riderId: string,
  options: { today?: string; activityId?: string } = {},
): Promise<RiderRecords> {
  const today = options.today ?? todayInCopenhagen();
  return withOrgContext(ctx, async (tx) => {
    const rows = await tx
      .select({
        id: activities.id,
        onDate: activities.onDate,
        title: activities.title,
        sport: activities.sport,
        bestPowers: activities.bestPowers,
        distanceM: activities.distanceM,
        ascentM: activities.ascentM,
        movingSeconds: activities.movingSeconds,
      })
      .from(activities)
      .where(
        and(
          eq(activities.riderId, riderId),
          gte(activities.onDate, addDaysIso(today, -365 * MAX_YEARS)),
        ),
      )
      .orderBy(desc(activities.onDate));
    const out = fromRows(rows, today, options.activityId);
    const holders = PERIODS.flatMap((period) => {
      const r = out.byPeriod[period];
      return [...r.power, r.longestKm, r.mostClimbingM, r.longestHours].flatMap((h) =>
        h ? [h.activityId] : [],
      );
    });
    const names = await rideNamesIn(tx, holders);
    return { ...out, names: Object.fromEntries(names) };
  });
}

function fromRows(
  rows: Array<Omit<RecordSource, "bestPowers"> & { bestPowers: unknown }>,
  today: string,
  activityId: string | undefined,
): Omit<RiderRecords, "names"> {
  const sources: RecordSource[] = rows.map((r) => ({
    ...r,
    bestPowers: (r.bestPowers ?? null) as Record<string, number> | null,
  }));
  const out = {
    byPeriod: {} as Record<Period, Records>,
    curves: {} as Record<Period, Array<[number, number]>>,
    setBy: {} as Record<Period, number[]>,
  };
  for (const period of PERIODS) {
    const curve = bestCurve(inPeriod(sources, period, today));
    out.byPeriod[period] = records(sources, period, today);
    out.curves[period] = [...curve.values()]
      .sort((a, b) => a.seconds - b.seconds)
      .map((r: PowerRecord) => [r.seconds, r.watts]);
    out.setBy[period] = activityId
      ? [...curve.values()].filter((r) => r.activityId === activityId).map((r) => r.seconds)
      : [];
  }
  return out;
}
