/**
 * What the calendar's client components are handed from the server: plain
 * rows, trimmed to what they draw. The services' own types stay on the
 * server side of the line.
 */

import type { PlanBasis } from "@/modules/paradigms";

/**
 * A rider to choose. `basis` is the class-year or an adult's training
 * profile this season, where the page knows it: a strength series is
 * measured against the profile's rhythm for adults (ADR 0092).
 */
export type RiderOption = { id: string; name: string; basis?: PlanBasis | null };

export type CalendarCard = {
  id: string;
  riderId: string;
  onDate: string;
  sport: string;
  title: string;
  description: string;
  structure: unknown;
  plannedMinutes: number;
  plannedLoad: number | null;
  plannedKm: number | null;
  templateId: string | null;
  /** "17:30", when it starts; and where (ADR 0058). */
  startTime: string | null;
  meetingPlace: string;
  groupKey: string | null;
  /** The series a "Gentag" made it part of (ADR 0041). */
  seriesKey: string | null;
  programmeSession: number | null;
  activityId: string | null;
  activity: { id: string; movingSeconds: number; load: number | null } | null;
  commentCount: number;
};

export type CalendarActivityCard = {
  id: string;
  riderId: string;
  onDate: string;
  sport: string;
  title: string;
  movingSeconds: number;
  rpe: number | null;
  commentCount: number;
};

export type CalendarEventCard = {
  id: string;
  riderId: string | null;
  kind: string;
  title: string;
  startsOn: string;
  endsOn: string;
  priority: string | null;
  note: string;
  /** "09:30", when it starts on the first day; where; and who drives (P2-03). */
  startTime: string | null;
  meetingPlace: string;
  transportNote: string;
  /** "dcu" for a race Kadence read from Cykling Danmark (ADR 0039). */
  source: string | null;
  /** One of the rider's parents put it in (ADR 0069). */
  fromParent: boolean;
  /** The results on the race: given to a coach's calendar only. */
  results?: EventResult[];
};

/** A rider's result on a race, as Cykling Danmark published it. */
export type EventResult = {
  riderId: string;
  race: string;
  raceClass: string;
  place: number | null;
  placeNote: string;
  resultUrl: string;
};
