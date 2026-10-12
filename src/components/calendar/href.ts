import { mondayOf } from "@/core/dates";
import { anchorDate, seasonOfMonth } from "@/modules/calendar/grid";

/**
 * The calendar's addresses: the scale (a week, a month or a season), the
 * place on it, whose calendar, and which session's panel is open. One
 * builder, so every link keeps the others' choices — a panel opened in
 * week 40 closes back to week 40, and the switch from a coach's team
 * month to the year keeps the team (docs/adr/0093).
 *
 * The team's week stays `?view=team`, as every older link says it; the
 * month and the season are `?view=month&month=2026-11` and
 * `?view=year&year=2026` (the season from October 2026), with `team=1`
 * for the team's.
 */
export type CalendarQuery = {
  week?: string;
  /** "yyyy-mm", in the month view. */
  month?: string | null;
  /** The season's first year, in the year view. */
  year?: number | null;
  rider?: string | null;
  view?: "team" | "month" | "year" | null;
  /** The team's month or season, a coach's; the team's week is `view: "team"`. */
  team?: boolean;
  session?: string | null;
};

export function withQuery(path: string, query: Record<string, string | null | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export function calendarHref(query: CalendarQuery): string {
  const scale = query.view === "month" || query.view === "year" ? query.view : "week";
  const team = query.view === "team" || query.team === true;
  return withQuery("/calendar", {
    week: scale === "week" ? query.week : null,
    month: scale === "month" ? query.month : null,
    year: scale === "year" && query.year ? String(query.year) : null,
    rider: team ? null : query.rider,
    view: scale === "week" ? (team ? "team" : null) : scale,
    team: scale !== "week" && team ? "1" : null,
    session: query.session,
  });
}

/**
 * The same calendar at another scale, opened where the reader is: the
 * week, month or season that holds today when the one shown does,
 * otherwise the one the shown range starts in.
 */
export function scaleHref(
  query: CalendarQuery,
  scale: "week" | "month" | "year",
  shown: { from: string; to: string },
  today: string,
): string {
  const at = anchorDate(shown, today);
  const team = query.view === "team" || query.team === true;
  const base = { rider: query.rider, team, session: null };
  if (scale === "month") return calendarHref({ ...base, view: "month", month: at.slice(0, 7) });
  if (scale === "year")
    return calendarHref({ ...base, view: "year", year: seasonOfMonth(at.slice(0, 7)) });
  return calendarHref({ ...base, view: team ? "team" : null, week: mondayOf(at) });
}

/** The same place for the whole team: the team's week, month or season. */
export function teamHref(query: CalendarQuery): string {
  const scale = query.view === "month" || query.view === "year" ? query.view : "team";
  return calendarHref({ ...query, view: scale, team: true, rider: null, session: null });
}

/** The same place for one rider. */
export function riderHref(query: CalendarQuery, riderId: string): string {
  const scale = query.view === "month" || query.view === "year" ? query.view : null;
  return calendarHref({ ...query, view: scale, team: false, rider: riderId, session: null });
}
