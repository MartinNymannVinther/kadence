import { addDaysIso, todayInCopenhagen } from "@/core/dates";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { whoAmIIn } from "@/modules/team/access";
import { gather } from "./gather";
import { riderInsight, SERIES_DAYS, WARMUP_DAYS, type RiderInsight } from "./rider";

/**
 * The insight for the pages: one rider's load and guardrails, or the whole
 * team's, ordered so the riders who need attention come first. A parent
 * gets their children's, with wellbeing only where the rider shares it —
 * which the database has already decided by what it returned.
 */

const SEVERITY = { alert: 3, warn: 2, info: 1 } as const;

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
    });
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
      );
    });
    return insights.sort(
      (a, b) => attentionScore(b) - attentionScore(a) || a.name.localeCompare(b.name, "da"),
    );
  });
}
