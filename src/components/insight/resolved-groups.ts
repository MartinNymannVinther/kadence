import type { RiderInsight } from "@/modules/insight/rider";
import type { Flag, WellbeingStatus } from "@/modules/load";

/**
 * The trace under the attention list, grouped the way the list is: one
 * group per rider with their name, their wellbeing chip and the flags a
 * coach has marked afklaret this week (ADR 0026). Pure, so the rule that
 * a red-zone rider is never out of sight is tested without React.
 */
export type ResolvedGroup = {
  riderId: string;
  /** The rider's name on the team list; null on the rider's own page, which names them already. */
  riderName: string | null;
  /** The chip beside the name on the team list; null on the rider's own page, which shows it on top. */
  wellbeing: WellbeingStatus | null;
  klass: string;
  items: { resolutionId: string; flag: Flag }[];
};

export function resolvedGroups(
  insights: readonly RiderInsight[],
  klassOf: (insight: RiderInsight) => string,
  options: { named: boolean } = { named: true },
): ResolvedGroup[] {
  return insights
    .filter((i) => i.resolved.length > 0)
    .map((i) => ({
      riderId: i.riderId,
      riderName: options.named ? i.name : null,
      wellbeing: options.named ? i.wellbeing : null,
      klass: klassOf(i),
      items: i.resolved.map((r) => ({ resolutionId: r.resolution.id, flag: r.flag })),
    }));
}

/** The count line counts flags held, not rows: two strength pairs on one row are two. */
export const resolvedCount = (groups: readonly ResolvedGroup[]) =>
  groups.reduce((n, g) => n + g.items.length, 0);

/** The trace opens by itself when a rider in it is in the red zone: professional help is never a click away. */
export const opensByItself = (groups: readonly ResolvedGroup[]) =>
  groups.some((g) => g.wellbeing?.action === "help");
