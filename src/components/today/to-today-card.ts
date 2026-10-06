import { toCard } from "@/components/calendar/to-card";
import type { CalendarCard } from "@/components/calendar/types";
import type { CalendarSession } from "@/modules/training/sessions";
import type { TimePlace } from "./time-place";

/**
 * A session for Today, Mig and the parents' page: the calendar's card,
 * with when and where it starts (ADR 0057) carried along, for the rows
 * that show it.
 */
export function toTodayCard(s: CalendarSession): CalendarCard & TimePlace {
  return { ...toCard(s), startTime: s.startTime, meetingPlace: s.meetingPlace };
}
