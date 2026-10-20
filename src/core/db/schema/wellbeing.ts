import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { domainId, users } from "./foundation";
import { riders } from "./team";
import { tenant, timestamps } from "./shared";

/**
 * A known pain ticked "som det plejer" on a check-in, as it stood that day
 * (docs/adr/0097): its id, its place and its usual level on the ladder. A
 * snapshot rather than a reference, so the day's zone is worked out from
 * the check-in row alone and does not change when the known pain is
 * changed or removed later.
 */
export type UsualPain = { id: string; place: string; level: number };

/**
 * How the rider is: one short check-in a day. Scales run 1–5 with 5 the
 * good end; pain follows ATK's four steps (0 none … 3 stops training).
 */
export const checkins = pgTable(
  "checkins",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    onDate: date("on_date").notNull(),
    sleepHours: numeric("sleep_hours", { precision: 3, scale: 1, mode: "number" }),
    sleepQuality: smallint("sleep_quality"),
    energy: smallint("energy"),
    mood: smallint("mood"),
    /** 5 = fresh legs, 1 = very sore. */
    soreness: smallint("soreness"),
    /** 5 = calm, 1 = a lot on (school, exams, life). */
    stress: smallint("stress"),
    pain: smallint("pain").notNull().default(0),
    painWhere: text("pain_where").notNull().default(""),
    ill: smallint("ill").notNull().default(0),
    /** The known pains the rider said hurt as usual today (docs/adr/0097). */
    usualPains: jsonb("usual_pains").$type<UsualPain[]>().notNull().default([]),
    note: text("note").notNull().default(""),
    /**
     * When the check-in last turned red (`isRedCheckin`), kept while it
     * stays red and cleared when it is put right; null when it is not red.
     * A coach's wellbeing reminder counts from it (docs/adr/0060), so a
     * check-in saved green and changed to red later in the day is told.
     */
    redSince: timestamp("red_since", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("checkins_rider_date_uq").on(t.riderId, t.onDate),
    index("checkins_org_rider_idx").on(t.orgId, t.riderId, t.onDate),
    check(
      "checkins_scales",
      sql`coalesce(${t.sleepQuality},3) between 1 and 5 and coalesce(${t.energy},3) between 1 and 5
        and coalesce(${t.mood},3) between 1 and 5 and coalesce(${t.soreness},3) between 1 and 5
        and coalesce(${t.stress},3) between 1 and 5`,
    ),
    check("checkins_pain", sql`${t.pain} between 0 and 3`),
    check("checkins_ill", sql`${t.ill} between 0 and 1`),
    check("checkins_sleep", sql`${t.sleepHours} is null or ${t.sleepHours} between 0 and 24`),
    check(
      "checkins_usual_pains",
      sql`jsonb_typeof(${t.usualPains}) = 'array' and jsonb_array_length(${t.usualPains}) <= 5`,
    ),
  ],
);

export type CheckinRow = typeof checkins.$inferSelect;

/**
 * Something that always hurts a little, and how much it usually does
 * (docs/adr/0097): a place in the rider's own words and a usual level on
 * ATK's ladder, 1 or 2 — pain 3 is never usual. Health data, read as the
 * check-ins are (the 'wellbeing' scope) and written by the rider or a
 * coach. At most five a rider, and one per place, in the service: a
 * unique index would make a history's move (drizzle/0046) collide when
 * both rider rows know the same pain.
 */
export const knownPains = pgTable(
  "known_pains",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    place: text("place").notNull(),
    usualLevel: smallint("usual_level").notNull(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("known_pains_rider_idx").on(t.orgId, t.riderId),
    check("known_pains_place", sql`char_length(${t.place}) between 1 and 40`),
    check("known_pains_usual_level", sql`${t.usualLevel} between 1 and 2`),
  ],
);

export type KnownPainRow = typeof knownPains.$inferSelect;
