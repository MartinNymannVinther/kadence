import { compliance, type ComplianceColour } from "@/modules/load";
import { calendarHref, type CalendarQuery } from "./href";
import type { CalendarActivityCard, CalendarCard } from "./types";

/**
 * A rider's week as the phone's card shows it (ADR 0062): seven compact
 * days, each with its sessions' sports and how they went, and one tint
 * for the day — the session that most wants a look. Pure, so the shaping
 * is tested without React; the card only draws what this returns.
 */

export type DaySession = {
  id: string;
  sport: string;
  title: string;
  plannedMinutes: number;
  colour: ComplianceColour;
  done: boolean;
};

export type CardDay = {
  date: string;
  isToday: boolean;
  sessions: DaySession[];
  /** The day's tint; null for a day with nothing planned. */
  colour: ComplianceColour | null;
  /** One session opens its panel, several the rider's week; an empty day leads nowhere. */
  href: string | null;
};

/** Which colour speaks for a day: missed or far off first, then off plan, still open, unplanned, as planned. */
const LOUDEST: readonly ComplianceColour[] = ["red", "yellow", "grey", "none", "green"];

export function dayColour(colours: readonly ComplianceColour[]): ComplianceColour | null {
  return LOUDEST.find((c) => colours.includes(c)) ?? null;
}

/** How a planned session went against its plan, in the load model's colours. */
function colourOf(session: CalendarCard, today: string): ComplianceColour {
  const done = session.activity
    ? { minutes: session.activity.movingSeconds / 60, load: session.activity.load }
    : null;
  return compliance(
    { minutes: session.plannedMinutes, load: session.plannedLoad },
    done,
    session.onDate,
    today,
  );
}

export function cardDays(
  riderId: string,
  days: readonly string[],
  sessions: readonly CalendarCard[],
  today: string,
  query: CalendarQuery,
): CardDay[] {
  const mine = sessions.filter((s) => s.riderId === riderId);
  return days.map((date) => {
    const day: DaySession[] = mine
      .filter((s) => s.onDate === date)
      .map((s) => ({
        id: s.id,
        sport: s.sport,
        title: s.title,
        plannedMinutes: s.plannedMinutes,
        colour: colourOf(s, today),
        done: s.activity !== null,
      }));
    const href =
      day.length === 1
        ? calendarHref({ ...query, session: day[0]!.id })
        : day.length > 1
          ? calendarHref({ week: query.week, rider: riderId })
          : null;
    return {
      date,
      isToday: date === today,
      sessions: day,
      colour: dayColour(day.map((s) => s.colour)),
      href,
    };
  });
}

/**
 * A rider's week in minutes on the bike and off it: what is in the
 * calendar, and what was done — a planned session's ride and a ride
 * without a plan alike. The line a row shows when there is no season bar.
 */
export function weekMinutes(
  riderId: string,
  sessions: readonly CalendarCard[],
  activities: readonly CalendarActivityCard[],
): { planned: number; done: number } {
  const mine = sessions.filter((s) => s.riderId === riderId);
  return {
    planned: mine.reduce((sum, s) => sum + s.plannedMinutes, 0),
    done:
      mine.reduce((sum, s) => sum + (s.activity?.movingSeconds ?? 0), 0) / 60 +
      activities
        .filter((a) => a.riderId === riderId)
        .reduce((sum, a) => sum + a.movingSeconds / 60, 0),
  };
}
