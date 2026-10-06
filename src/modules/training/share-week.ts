import { addDaysIso, mondayOf, weekNumber } from "@/core/dates";
import { byStartTime, clockOf, clockText } from "./time-place";

/**
 * "Del ugen" (docs/plan-fokus-vinter.md, wave 4): a week as plain text
 * for the club's SMS or chat group — the team, the week, and per day its
 * sessions with time, place, title and length. A session the team rides
 * together is one line with how many riders have it, and in the team's
 * week no rider is named. Nothing about how anyone is, did or felt: no
 * check-ins, no rides, no flags. A single rider's week names the rider
 * once, at the top.
 *
 * Pure: imports nothing from the database. The words come in from the
 * reader's language (calendar.share and training.duration).
 */

export type ShareSession = {
  riderId: string;
  onDate: string;
  sport: string;
  title: string;
  plannedMinutes: number;
  startTime: string | null;
  meetingPlace: string;
};

export type ShareWords = {
  /** "Uge 41" */
  week: (n: number) => string;
  /** "6 ryttere" */
  riders: (count: number) => string;
  /** "1 t 30 min" */
  duration: (minutes: number) => string;
  /** When the week holds no session. */
  empty: string;
};

function intlLocale(locale: string): string {
  return locale === "en" ? "en-GB" : "da-DK";
}

/** "Tirsdag 6. oktober" / "Tuesday 6 October": plan dates carry no clock, so UTC never moves a day. */
function dayHeading(iso: string, locale: string): string {
  const text = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type Line = ShareSession & { riders: Set<string> };

/** A day's sessions, the same session on several riders as one line. */
function linesOf(sessions: ShareSession[]): Line[] {
  const lines = new Map<string, Line>();
  for (const s of byStartTime(sessions)) {
    const key = [
      s.sport,
      s.title.trim(),
      clockOf(s.startTime),
      s.meetingPlace.trim(),
      s.plannedMinutes,
    ]
      .map(String)
      .join("\u0000");
    const line = lines.get(key) ?? { ...s, riders: new Set<string>() };
    line.riders.add(s.riderId);
    lines.set(key, line);
  }
  return [...lines.values()];
}

/** "– 17.30, Klubhuset: Intervaller (1 t 30 min), 6 ryttere" */
function lineText(line: Line, words: ShareWords, locale: string, counted: boolean): string {
  const when = [
    line.startTime ? clockText(line.startTime, locale) : "",
    line.meetingPlace.trim(),
  ].filter(Boolean);
  const length = line.plannedMinutes > 0 ? ` (${words.duration(line.plannedMinutes)})` : "";
  const riders = counted ? `, ${words.riders(line.riders.size)}` : "";
  return `– ${when.length > 0 ? `${when.join(", ")}: ` : ""}${line.title.trim()}${length}${riders}`;
}

export function shareWeekText(
  input: {
    team: string;
    monday: string;
    sessions: ShareSession[];
    /** A single rider's week: the rider's name. Without it, the team's week. */
    rider?: string;
    locale: string;
  },
  words: ShareWords,
): string {
  const { locale } = input;
  const monday = mondayOf(input.monday);
  const header = [input.team.trim(), input.rider?.trim(), words.week(weekNumber(monday))]
    .filter(Boolean)
    .join(" · ");
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(monday, i)).flatMap((date) => {
    const lines = linesOf(input.sessions.filter((s) => s.onDate === date));
    if (lines.length === 0) return [];
    return [
      [
        dayHeading(date, locale),
        ...lines.map((l) => lineText(l, words, locale, input.rider === undefined)),
      ].join("\n"),
    ];
  });
  return [header, ...(days.length > 0 ? days : [words.empty])].join("\n\n");
}
