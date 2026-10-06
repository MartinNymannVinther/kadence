import { teamTips } from "@/components/coach/team-tips";
import type { RiderRow } from "@/core/db/schema";
import type { OrgContext } from "@/core/db/tenant";
import type { CoachTip } from "@/modules/coach";
import { getInsights } from "@/modules/insight/service";
import type { RiderInsight } from "@/modules/insight/rider";
import { getTeamSettings } from "@/modules/team/settings";
import { teamSignals, type RiderSignals } from "./signals";

/**
 * What the team's week shows of the signals (ADR 0062), read for a coach
 * in the week that is in progress: the attention list's insights — open
 * and afklaret flags as the insight service returns them under RLS —
 * each rider's badges for the grid, whether the AI may write a summary,
 * and the coach's tips. Flags belong to the week in progress (ADR 0026),
 * so the page asks for this only when that is the week shown.
 */
export type TeamAttentionData = {
  insights: RiderInsight[];
  signals: Record<string, RiderSignals>;
  aiAllowed: boolean;
  tips: CoachTip[];
};

export async function teamAttentionData(
  ctx: OrgContext,
  input: {
    today: string;
    locale: string;
    riders: Pick<RiderRow, "birthYear" | "sex" | "categoryOverride">[];
  },
): Promise<TeamAttentionData> {
  const [insights, settings] = await Promise.all([
    getInsights(ctx, { today: input.today }),
    getTeamSettings(ctx),
  ]);
  const tips = await teamTips(ctx, {
    today: input.today,
    locale: input.locale,
    riders: input.riders,
    flagKinds: insights.flatMap((i) => i.flags.map((f) => f.kind)),
    allowYouthWeight: settings.allowYouthWeight,
  });
  return {
    insights,
    signals: teamSignals(insights),
    aiAllowed: settings.aiOnRiderData,
    tips,
  };
}
