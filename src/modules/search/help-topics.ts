/**
 * The sections of Hjælp, for Søg: the keys of the page's HOW_TO list
 * (src/app/[locale]/(app)/(narrow)/help/page.tsx), in its order, each
 * titled by `help.howTo.<key>.title` and reached at `/help#help-<key>`.
 * A copy rather than an import, because the page is a server component
 * with reads of its own; tests/search/places.test.ts holds every key here
 * to both message catalogues, so a section that is renamed or dropped is
 * caught there rather than as an empty row in the palette.
 */
export const HELP_TOPICS = [
  "roles",
  "password",
  "words",
  "overview",
  "calendar",
  "search",
  "sessions",
  "exercises",
  "done",
  "comments",
  "season",
  "load",
  "warnings",
  "checkin",
  "reminders",
  "devices",
  "toDevice",
  "rulle",
  "keys",
  "strava",
  "parents",
  "parentsPage",
  "ai",
  "data",
  "pilot",
] as const;

export type HelpTopic = (typeof HELP_TOPICS)[number];

/** Where a section of Hjælp is read: the page, scrolled to the section. */
export function helpHref(topic: HelpTopic): string {
  return `/help#help-${topic}`;
}
