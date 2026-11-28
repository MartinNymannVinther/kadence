import { sql } from "drizzle-orm";
import { check, date, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { domainId, users } from "./foundation";
import { riders } from "./team";
import { tenant } from "./shared";
import { plannedSessions } from "./training";

/**
 * Why a planned session was moved or skipped (docs/adr/0117): one row for
 * every move and every skip, with the reason picked in one tap, kept so
 * the patterns in a rider's changes can be seen and the plan shaped to
 * the rider. What the session was is copied in, so the row still says
 * something once the session is gone.
 *
 * Read by whoever reads the rider's training — a parent sees that a
 * session was skipped and why; written by whoever may change the rider's
 * plan, always as themselves. Nobody changes or removes a row: it goes
 * with the rider or the workspace. The words a person wrote beside the
 * reason are in `session_change_notes`, which a parent does not read.
 */
export { CHANGE_KINDS, CHANGE_REASONS } from "@/modules/training/change-reasons";
export type { ChangeKind, ChangeReason } from "@/modules/training/change-reasons";

export const sessionChanges = pgTable(
  "session_changes",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    plannedSessionId: text("planned_session_id").references(() => plannedSessions.id, {
      onDelete: "set null",
    }),
    kind: text("kind").notNull(),
    /** The day the session was on before the change. */
    fromDate: date("from_date").notNull(),
    /** The day it was moved to; null for a skip. */
    toDate: date("to_date"),
    sport: text("sport").notNull(),
    title: text("title").notNull(),
    plannedMinutes: integer("planned_minutes").notNull(),
    /** One of CHANGE_REASONS, or null when none was given. */
    reason: text("reason"),
    /** Who made the change: the rider, or a coach. */
    byRole: text("by_role").notNull(),
    changedBy: text("changed_by").references(() => users.id, { onDelete: "set null" }),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("session_changes_rider_idx").on(t.orgId, t.riderId, t.changedAt),
    check("session_changes_kind", sql`${t.kind} in ('moved', 'skipped', 'unskipped')`),
    check(
      "session_changes_reason",
      sql`${t.reason} is null or ${t.reason} in ('ill','pain','tired','school','weather','time','travel','other')`,
    ),
    check("session_changes_by_role", sql`${t.byRole} in ('rider', 'coach')`),
    check("session_changes_to_date", sql`(${t.kind} = 'moved') = (${t.toDate} is not null)`),
  ],
);

/** The words beside a change: between the rider and the coaches, never a parent. */
export const sessionChangeNotes = pgTable(
  "session_change_notes",
  {
    changeId: text("change_id")
      .primaryKey()
      .references(() => sessionChanges.id, { onDelete: "cascade" }),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    note: text("note").notNull(),
  },
  (t) => [
    index("session_change_notes_rider_idx").on(t.orgId, t.riderId),
    check("session_change_notes_note", sql`char_length(${t.note}) between 1 and 500`),
  ],
);

export type SessionChangeRow = typeof sessionChanges.$inferSelect;
