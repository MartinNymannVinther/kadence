import { addDaysIso, mondayOf, todayInCopenhagen } from "@/core/dates";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { whoAmIIn } from "@/modules/team/access";
import { FORECAST_MAX_DAYS, type FlagKind, type Severity } from "@/modules/load";
import { gather } from "./gather";
import { resolutionsFor } from "./resolutions";
import { riderInsight, SERIES_DAYS, WARMUP_DAYS, type RiderInsight } from "./rider";
import { flagWindow, forRider, readIntensity } from "@/modules/season/intensity";
import { teamPlanning } from "@/modules/team/settings";

/**
 * The insight for the pages: one rider's load and guardrails, or the whole
 * team's, ordered so the riders who need attention come first. A parent
 * gets their children's, with wellbeing only where the rider shares it —
 * which the database has already decided by what it returned. A flag a
 * coach has marked afklaret this week is split off here (ADR 0026), so
 * every consumer of `flags` sees the open ones alone.
 */

const SEVERITY = { alert: 3, warn: 2, info: 1 } as const;

/** Open flags only: a rider whose flags are all afklaret sorts with the calm ones. */
export function attentionScore(insight: RiderInsight): number {
  return insight.flags.reduce((sum, f) => sum + SEVERITY[f.severity] ** 2, 0);
}

export async function getInsights(
  ctx: OrgContext,
  options: { riderIds?: string[]; today?: string } = {},
): Promise<RiderInsight[]> {
  const today = options.today ?? todayInCopenhagen();
  return withOrgContext(ctx, async (tx) => {
    const me = await whoAmIIn(tx, ctx);
    if (!me) return [];
    const data = await gather(tx, {
      from: addDaysIso(today, -(SERIES_DAYS + WARMUP_DAYS)),
      to: addDaysIso(today, 7),
      riderIds: options.riderIds,
      aheadTo: addDaysIso(today, FORECAST_MAX_DAYS),
    });
    const { paradigm, lowIntensityFirst } = await teamPlanning(tx, ctx.orgId);
    const window = flagWindow(today);
    const intensity = lowIntensityFirst
      ? await readIntensity(
          tx,
          data.riders.map((r) => r.id),
          window.from,
          window.to,
        )
      : null;
    const resolutions = await resolutionsFor(
      tx,
      data.riders.map((r) => r.id),
      mondayOf(today),
    );
    const insights = data.riders.map((rider) => {
      const checks = data.checkins.filter((c) => c.riderId === rider.id);
      // A parent's view has check-ins only when the rider shares them; a
      // coach and the rider always do. Without any, wellbeing says nothing
      // rather than "all well".
      const wellbeingVisible = me.isCoach || me.rider?.id === rider.id || rider.shareWellbeing;
      return riderInsight(
        rider,
        data.activities.filter((a) => a.riderId === rider.id),
        data.sessions.filter((s) => s.riderId === rider.id),
        checks,
        today,
        wellbeingVisible,
        data.races.filter((r) => r.riderId === null || r.riderId === rider.id),
        resolutions
          .filter((r) => r.riderId === rider.id)
          .map((r) => ({
            id: r.id,
            kind: r.kind as FlagKind,
            severity: r.severity as Severity,
            seen: r.seen,
          })),
        paradigm,
        intensity && forRider(intensity, rider.id),
      );
    });
    return insights.sort(
      (a, b) => attentionScore(b) - attentionScore(a) || a.name.localeCompare(b.name, "da"),
    );
  });
}
