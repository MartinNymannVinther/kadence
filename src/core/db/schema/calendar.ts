import { sql } from "drizzle-orm";
import { check, date, index, pgTable, text, time } from "drizzle-orm/pg-core";
import { domainId, users } from "./foundation";
import { tenant, timestamps } from "./shared";
import { riders } from "./team";

/**
 * Everything else in the calendar: races, school, exams, camps, holidays,
 * illness. Without a rider it is the team's and every member sees it; a
 * rider's own follows the rider policies in drizzle/0003, and a parent
 * may put the family's days into their child's (docs/adr/0069).
 */
export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id").references(() => riders.id, { onDelete: "cascade" }),
    /** race | exam | school | camp | holiday | ill | other */
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    /** A race's priority: A | B | C. */
    priority: text("priority"),
    note: text("note").notNull().default(""),
    /**
     * When and where it starts, and who drives: "09.30 ved Odense Havn,
     * Annes bil fra klubhuset kl. 7.30" (docs/backlog.md P2-03, as a
     * session has them, ADR 0058). All optional. The time is a wall-clock
     * time in Copenhagen on the first day, with no zone.
     */
    startTime: time("start_time"),
    meetingPlace: text("meeting_place").notNull().default(""),
    transportNote: text("transport_note").notNull().default(""),
    /** Where the event came from when no person typed it: "dcu", a race read from Cykling Danmark (docs/adr/0039). */
    source: text("source"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("calendar_events_org_dates_idx").on(t.orgId, t.startsOn),
    check("calendar_events_source", sql`${t.source} is null or ${t.source} = 'dcu'`),
    check(
      "calendar_events_kind",
      sql`${t.kind} in ('race','exam','school','camp','holiday','ill','other')`,
    ),
    check("calendar_events_dates", sql`${t.endsOn} >= ${t.startsOn}`),
    check("calendar_events_priority", sql`${t.priority} is null or ${t.priority} in ('A','B','C')`),
    check("calendar_events_meeting_place", sql`char_length(${t.meetingPlace}) <= 120`),
    check("calendar_events_transport_note", sql`char_length(${t.transportNote}) <= 200`),
  ],
);

export type CalendarEventRow = typeof calendarEvents.$inferSelect;
