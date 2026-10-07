import type { CalendarEventRow, RaceResultRow } from "@/core/db/schema";
import type { CalendarActivity } from "@/modules/training/activities";
import type { CalendarSession } from "@/modules/training/sessions";
import { clockOf } from "@/modules/training/time-place";
import type { CalendarActivityCard, CalendarCard, CalendarEventCard, EventResult } from "./types";

/**
 * The rows the services return, trimmed to what the calendar draws before
 * they cross to the browser: no timestamps, no audit columns, no one's
 * user id.
 */

export function toCard(s: CalendarSession): CalendarCard {
  return {
    id: s.id,
    riderId: s.riderId,
    onDate: s.onDate,
    sport: s.sport,
    title: s.title,
    description: s.description,
    structure: s.structure,
    plannedMinutes: s.plannedMinutes,
    plannedLoad: s.plannedLoad,
    plannedKm: s.plannedKm,
    templateId: s.templateId,
    startTime: clockOf(s.startTime),
    meetingPlace: s.meetingPlace,
    groupKey: s.groupKey,
    seriesKey: s.seriesKey,
    programmeSession: s.programmeSession,
    activityId: s.activityId,
    activity: s.activity
      ? { id: s.activity.id, movingSeconds: s.activity.movingSeconds, load: s.activity.load }
      : null,
    commentCount: s.commentCount,
  };
}

export function toActivityCard(a: CalendarActivity): CalendarActivityCard {
  return {
    id: a.id,
    riderId: a.riderId,
    onDate: a.onDate,
    sport: a.sport,
    title: a.title,
    movingSeconds: a.movingSeconds,
    rpe: a.rpe,
    commentCount: a.commentCount,
  };
}

export function toEventCard(e: CalendarEventRow): CalendarEventCard {
  return {
    id: e.id,
    riderId: e.riderId,
    kind: e.kind,
    title: e.title,
    startsOn: e.startsOn,
    endsOn: e.endsOn,
    priority: e.priority,
    note: e.note,
    startTime: clockOf(e.startTime),
    meetingPlace: e.meetingPlace,
    transportNote: e.transportNote,
    source: e.source,
  };
}

/**
 * A coach's calendar: each race with the results that hang on it. Only a
 * coach's page calls this; a rider's and a parent's get the races alone.
 */
export function withResults(
  cards: CalendarEventCard[],
  results: RaceResultRow[],
): CalendarEventCard[] {
  const byEvent = new Map<string, EventResult[]>();
  for (const r of results) {
    const list = byEvent.get(r.eventId) ?? [];
    list.push({
      riderId: r.riderId,
      race: r.race,
      raceClass: r.raceClass,
      place: r.place,
      placeNote: r.placeNote,
      resultUrl: r.resultUrl,
    });
    byEvent.set(r.eventId, list);
  }
  return cards.map((card) =>
    byEvent.has(card.id) ? { ...card, results: byEvent.get(card.id) } : card,
  );
}
