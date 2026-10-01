import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { volumeOf, type Volume, type VolumeRange } from "./volume";
import { readFor } from "./volumes";

/**
 * What a plan does to the four numbers before it is made (ADR 0040,
 * 0041): for each rider and each period the plan touches — a week, or
 * the months of a series — the numbers as they stand and as they would
 * stand with the plan's sessions in the calendar. A read under RLS: a
 * rider sees their own. Shown, never enforced.
 */

export type PlannedAddition = { onDate: string; sport: string; plannedMinutes: number };

export type PeriodPreview = VolumeRange & { before: Volume; after: Volume };

export type RiderPlanPreview = { riderId: string; name: string; periods: PeriodPreview[] };

export async function previewPlan(
  ctx: OrgContext,
  input: {
    riderIds: string[];
    /** The sessions the plan would add for a rider. */
    additions: (riderId: string) => PlannedAddition[];
    periods: VolumeRange[];
    today: string;
  },
): Promise<RiderPlanPreview[]> {
  if (input.riderIds.length === 0 || input.periods.length === 0) return [];
  const range = { from: input.periods[0]!.from, to: input.periods.at(-1)!.to };
  const data = await withOrgContext(ctx, (tx) => readFor(tx, input.riderIds, range));
  const riders = [...data].sort(([, a], [, b]) => a.name.localeCompare(b.name, "da"));
  return riders.map(([riderId, d]) => {
    const added = input.additions(riderId).map((a) => ({ ...a, done: false }));
    return {
      riderId,
      name: d.name,
      periods: input.periods.map((period) => ({
        ...period,
        before: volumeOf({ ...d, range: period, today: input.today }),
        after: volumeOf({
          ...d,
          sessions: [...d.sessions, ...added],
          range: period,
          today: input.today,
        }),
      })),
    };
  });
}
