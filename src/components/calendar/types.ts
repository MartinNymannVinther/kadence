/**
 * What the calendar's client components are handed from the server: plain
 * rows, trimmed to what they draw. The services' own types stay on the
 * server side of the line.
 */

export type RiderOption = { id: string; name: string };

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
  groupKey: string | null;
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
};
