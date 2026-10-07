import { toEventCard } from "@/components/calendar/to-card";
import type { ChildView } from "@/components/parents/child-card";
import type { ChildThread } from "@/components/parents/child-threads";
import { toTodayCard } from "@/components/today/to-today-card";
import { zoneDays } from "@/components/wellbeing/zone-days";
import { addDaysIso, minIso } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { getInsights } from "@/modules/insight/service";
import { getRider } from "@/modules/team/riders";
import { listUnplanned } from "@/modules/training/activities";
import { listEvents } from "@/modules/training/events";
import { listFamilyEvents } from "@/modules/training/family-events";
import { listSessions } from "@/modules/training/sessions";
import { listCheckins } from "@/modules/wellbeing/checkins";

/** Conversations from this far back are shown; older ones are on the calendar. */
const THREAD_DAYS = 14;
const MAX_THREADS = 5;

/** What a parent may see of one child, as the database lets them (ADR 0011). */
export async function childView(
  ctx: OrgContext,
  riderId: string,
  week: { monday: string; sunday: string; today: string },
): Promise<ChildView | null> {
  const rider = await getRider(ctx, riderId);
  if (!rider) return null;
  const ahead = addDaysIso(week.today, 30);
  const from = minIso([week.monday, addDaysIso(week.today, -(THREAD_DAYS - 1))]);
  const [sessions, unplanned, events, insights, checkins, family] = await Promise.all([
    listSessions(ctx, { from, to: week.sunday, riderIds: [riderId] }),
    listUnplanned(ctx, { from, to: week.sunday, riderIds: [riderId] }),
    listEvents(ctx, { from: week.monday, to: ahead, riderIds: [riderId] }),
    getInsights(ctx, { riderIds: [riderId], today: week.today }),
    listCheckins(ctx, { from: addDaysIso(week.today, -13), to: week.today, riderIds: [riderId] }),
    listFamilyEvents(ctx, riderId, week.today),
  ]);
  const cards = events.map(toEventCard);
  const threads: ChildThread[] = [
    ...sessions.map((s) => ({ kind: "session" as const, ...s })),
    ...unplanned.map((a) => ({ kind: "activity" as const, ...a })),
  ]
    .filter((x) => x.commentCount > 0 && x.onDate <= week.today)
    .sort((a, b) => b.onDate.localeCompare(a.onDate))
    .slice(0, MAX_THREADS)
    .map((x) => ({
      kind: x.kind,
      id: x.id,
      title: x.title,
      sport: x.sport,
      onDate: x.onDate,
      count: x.commentCount,
    }));
  return {
    riderId,
    name: rider.name,
    shareTraining: rider.shareTraining,
    shareWellbeing: rider.shareWellbeing,
    sessions: sessions.filter((s) => s.onDate >= week.monday).map(toTodayCard),
    events: cards.filter((e) => e.startsOn <= week.sunday),
    upcoming: cards
      .filter((e) => e.endsOn >= week.today && e.kind !== "holiday")
      .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
      .slice(0, 6),
    family,
    threads,
    load: (insights[0]?.series ?? []).map((d) => ({
      date: d.date,
      fitness: d.fitness,
      fatigue: d.fatigue,
      form: d.form,
    })),
    zones: zoneDays(checkins, week.today),
  };
}
