import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { domainId, users } from "./foundation";
import { tenant, timestamps } from "./shared";
import { riders } from "./team";
import { calendarEvents } from "./calendar";

/**
 * The club championship (docs/adr/0051): the one place in Kadence where
 * riders see placings, because it is the club's own tradition — rounds
 * the club rides itself, results the coaches type in, and a roll of
 * honour over the years. Read by everyone in the club, written by its
 * coaches, under the policies in drizzle/0022. Nothing here is read from
 * Cykling Danmark.
 */

/** One season's championship, with the points each place earns. */
export const clubChampionships = pgTable(
  "club_championships",
  {
    id: domainId("id"),
    orgId: tenant(),
    /** The year the championship is named for. */
    season: smallint("season").notNull(),
    title: text("title").notNull(),
    /** Points for 1st, 2nd, …; every finisher past the list gets one. */
    points: jsonb("points").notNull(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("club_championships_org_idx").on(t.orgId, t.season),
    check("club_championships_season", sql`${t.season} between 1900 and 2200`),
    check("club_championships_title", sql`char_length(${t.title}) between 1 and 120`),
  ],
);

/** A round: a time trial, a hill climb, a road race — whatever the club rides. */
export const clubChampionshipRounds = pgTable(
  "club_championship_rounds",
  {
    id: domainId("id"),
    orgId: tenant(),
    championshipId: text("championship_id")
      .notNull()
      .references(() => clubChampionships.id, { onDelete: "cascade" }),
    heldOn: date("held_on").notNull(),
    /** tt | hill | road | crit | other */
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    /** time | place — how the round's order is decided. */
    measure: text("measure").notNull(),
    eventId: text("event_id").references(() => calendarEvents.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("club_championship_rounds_idx").on(t.orgId, t.championshipId, t.heldOn),
    check("club_rounds_kind", sql`${t.kind} in ('tt','hill','road','crit','other')`),
    check("club_rounds_measure", sql`${t.measure} in ('time','place')`),
    check("club_rounds_title", sql`char_length(${t.title}) between 1 and 120`),
  ],
);

/** One rider's result in a round; a guest or a rider from before Kadence goes by name. */
export const clubChampionshipEntries = pgTable(
  "club_championship_entries",
  {
    id: domainId("id"),
    orgId: tenant(),
    roundId: text("round_id")
      .notNull()
      .references(() => clubChampionshipRounds.id, { onDelete: "cascade" }),
    riderId: text("rider_id").references(() => riders.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    /** U17 | U19 | U23 | open */
    class: text("class").notNull(),
    timeMs: integer("time_ms"),
    place: smallint("place"),
    /** finished | dnf | dns */
    status: text("status").notNull().default("finished"),
    ...timestamps,
  },
  (t) => [
    index("club_entries_round_idx").on(t.orgId, t.roundId),
    uniqueIndex("club_entries_round_rider_uq")
      .on(t.roundId, t.riderId)
      .where(sql`${t.riderId} is not null`),
    check("club_entries_class", sql`${t.class} in ('U17','U19','U23','open')`),
    check("club_entries_status", sql`${t.status} in ('finished','dnf','dns')`),
    check("club_entries_name", sql`char_length(${t.name}) between 1 and 120`),
    check("club_entries_time", sql`${t.timeMs} is null or ${t.timeMs} between 1 and 86400000`),
    check("club_entries_place", sql`${t.place} is null or ${t.place} between 1 and 999`),
  ],
);

/** The roll of honour: a club champion for a year and class, from Kadence or from before it. */
export const clubChampions = pgTable(
  "club_champions",
  {
    id: domainId("id"),
    orgId: tenant(),
    year: smallint("year").notNull(),
    /** U17 | U19 | U23 | open */
    class: text("class").notNull(),
    /** "Klubmester", "Årets fremgang", "Holdets ildsjæl" — the club's own words. */
    title: text("title").notNull(),
    riderId: text("rider_id").references(() => riders.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    note: text("note").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    index("club_champions_org_idx").on(t.orgId, t.year),
    check("club_champions_year", sql`${t.year} between 1900 and 2200`),
    check("club_champions_class", sql`${t.class} in ('U17','U19','U23','open')`),
    check("club_champions_title", sql`char_length(${t.title}) between 1 and 80`),
    check("club_champions_name", sql`char_length(${t.name}) between 1 and 120`),
    check("club_champions_note", sql`char_length(${t.note}) <= 300`),
  ],
);
