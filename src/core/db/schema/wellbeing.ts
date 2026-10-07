import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { domainId } from "./foundation";
import { riders } from "./team";
import { tenant, timestamps } from "./shared";

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
  ],
);

export type CheckinRow = typeof checkins.$inferSelect;
