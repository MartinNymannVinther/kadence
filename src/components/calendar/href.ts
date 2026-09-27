/**
 * The calendar's addresses: the week, whose calendar, which view, and
 * which session's panel is open. One builder, so every link keeps the
 * others' choices — a panel opened in week 40 closes back to week 40.
 */
export type CalendarQuery = {
  week?: string;
  rider?: string | null;
  view?: "team" | null;
  session?: string | null;
};

export function withQuery(path: string, query: Record<string, string | null | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

export function calendarHref(query: CalendarQuery): string {
  return withQuery("/calendar", {
    week: query.week,
    rider: query.rider,
    view: query.view,
    session: query.session,
  });
}
