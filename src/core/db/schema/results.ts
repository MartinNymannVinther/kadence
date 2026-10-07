import { sql } from "drizzle-orm";
import { check, date, index, pgTable, smallint, text, uniqueIndex } from "drizzle-orm/pg-core";
import { domainId } from "./foundation";
import { tenant, timestamps } from "./shared";
import { riders } from "./team";
import { calendarEvents } from "./calendar";

/**
 * A rider's result in a race, as Cykling Danmark published it
 * (docs/adr/0039). It hangs on a race in the rider's calendar: one the
 * coach put there, or one Kadence made for the day. The race in the
 * calendar is what everyone sees; the place is information for the
 * coach, and no person types it.
 *
 * Read and written under the policies in drizzle/0016: a coach reads and
 * writes, the rider can read their own (it is in their export), and
 * nobody else, no parent and no teammate, sees one.
 */
export const raceResults = pgTable(
  "race_results",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),
    /** Where the result was read: "dcu", Cykling Danmark's member portal. */
    source: text("source").notNull().default("dcu"),
    /** The result's own key at the source: Sportstiming's event and round, "17626:101613". */
    sourceRef: text("source_ref").notNull(),
    /** The race as the organiser named it. */
    race: text("race").notNull(),
    /** Landevej, Cross, MTB, Bane …, as DCU names the discipline. */
    discipline: text("discipline").notNull(),
    /** The class the rider rode in: U17, U19P, A … */
    raceClass: text("race_class").notNull(),
    racedOn: date("raced_on").notNull(),
    place: smallint("place"),
    /** What stood where the place goes when it was not a number: DNF, DNS … */
    placeNote: text("place_note").notNull().default(""),
    /** The result list at Sportstiming, for the coach to open. */
    resultUrl: text("result_url").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("race_results_rider_ref_uq").on(t.riderId, t.source, t.sourceRef),
    index("race_results_rider_idx").on(t.orgId, t.riderId, t.racedOn),
    index("race_results_event_idx").on(t.eventId),
    check("race_results_source", sql`${t.source} = 'dcu'`),
    check("race_results_ref", sql`${t.sourceRef} ~ '^[0-9]{1,10}:[0-9]{0,10}$'`),
    check("race_results_race", sql`char_length(${t.race}) between 1 and 200`),
    check("race_results_discipline", sql`char_length(${t.discipline}) between 1 and 40`),
    check("race_results_class", sql`char_length(${t.raceClass}) between 1 and 40`),
    check("race_results_place", sql`${t.place} is null or ${t.place} between 1 and 9999`),
    check("race_results_place_note", sql`char_length(${t.placeNote}) <= 12`),
    check(
      "race_results_url",
      sql`${t.resultUrl} ~ '^https://www\\.sportstiming\\.dk/event/[0-9]{1,10}/results(\\?round=[0-9]{1,10})?$'`,
    ),
  ],
);
export type RaceResultRow = typeof raceResults.$inferSelect;
