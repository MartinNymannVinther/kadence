import { toEventCard } from "@/components/calendar/to-card";
import { toTodayCard } from "@/components/today/to-today-card";
import { zoneDays } from "@/components/wellbeing/zone-days";
import { addDaysIso, maxIso } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import { getInsights } from "@/modules/insight/service";
import { getRider } from "@/modules/team/riders";
import { listEvents } from "@/modules/training/events";
import { dcuProposalFor, listGoals } from "@/modules/training/goals";
import { getRiderRecords } from "@/modules/training/records";
import { listSessions } from "@/modules/training/sessions";
import { weekDates, weekFrom } from "@/modules/training/week";
import { listCheckins } from "@/modules/wellbeing/checkins";
import { readStructure } from "@/modules/workouts/structure";

/**
 * What a rider's own page holds (docs/adr/0062): this week, the next
 * week's bike sessions a bike computer can ride (ADR 0031), the form,
 * two weeks of check-ins, goals and records. Read under the rider's own
 * RLS, as Today read them before.
 */
export async function meData(ctx: OrgContext, riderId: string, today: string) {
  const monday = weekFrom(undefined, today);
  const days = weekDates(monday);
  const sunday = days[6] ?? today;
  const lastDay = addDaysIso(today, 6);
  const [sessions, events, checkins, insights, records, goals, rider] = await Promise.all([
    listSessions(ctx, { from: monday, to: maxIso([sunday, lastDay]), riderIds: [riderId] }),
    listEvents(ctx, { from: monday, to: sunday, riderIds: [riderId] }),
    listCheckins(ctx, { from: addDaysIso(today, -13), to: today, riderIds: [riderId] }),
    getInsights(ctx, { riderIds: [riderId], today }),
    getRiderRecords(ctx, riderId, { today }),
    listGoals(ctx, riderId, today),
    getRider(ctx, riderId),
  ]);
  // The next seven days' bike sessions with steps: what a bike computer can ride.
  const toDevice = sessions
    .filter((s) => s.onDate >= today && s.onDate <= lastDay && s.sport === "bike")
    .filter((s) => {
      const structure = readStructure(s.structure, "bike");
      return structure.kind === "bike" && structure.steps.length > 0;
    })
    .map((s) => ({ id: s.id, title: s.title, onDate: s.onDate }));
  return {
    days,
    sessions: sessions.filter((s) => s.onDate <= sunday).map(toTodayCard),
    events: events.map(toEventCard),
    toDevice,
    zones: zoneDays(checkins, today),
    insight: insights[0] ?? null,
    records,
    goals,
    dcuProposal: rider ? dcuProposalFor(rider, goals, today) : null,
    name: rider?.name ?? "",
  };
}
