import { nextMonday, nextWeekSummary } from "@/components/today/next-week";
import { addDaysIso, mondayOf } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { getInsights } from "@/modules/insight/service";
import { listRiderNews } from "@/modules/team/news";
import { listEvents } from "@/modules/training/events";
import { listSessions } from "@/modules/training/sessions";

/**
 * What a coach's Overblik shows, read at once and each under the caller's
 * RLS: whether next week is planned and what is in it, who has something
 * worth a look this week (the insight service, ADR 0062), what the riders
 * have written lately, and the team's day and week as before.
 */
export async function coachOverview(
  ctx: OrgContext,
  riders: readonly { id: string }[],
  today: string,
) {
  const riderIds = riders.map((r) => r.id);
  const monday = mondayOf(today);
  const next = nextMonday(today);
  const [sessionsToday, events, insights, nextSessions, nextEvents, news] = await Promise.all([
    listSessions(ctx, { from: today, to: today, riderIds }),
    listEvents(ctx, { from: monday, to: addDaysIso(monday, 6) }),
    getInsights(ctx, { today }),
    listSessions(ctx, { from: next, to: addDaysIso(next, 6), riderIds }),
    listEvents(ctx, { from: next, to: addDaysIso(next, 6) }),
    listRiderNews(ctx, { today }),
  ]);
  return {
    sessionsToday,
    teamEvents: events.filter((e) => e.riderId === null),
    insights,
    nextWeek: nextWeekSummary({
      monday: next,
      riders,
      sessions: nextSessions,
      events: nextEvents,
    }),
    news,
  };
}
