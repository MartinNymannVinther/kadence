import { date, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { domainId, users } from "./foundation";
import { riders } from "./team";
import { tenant } from "./shared";

/**
 * A session in a rider's next days that somebody deleted, kept for seven
 * days so the rider can be told the plan changed (docs/adr/0060,
 * drizzle/0037). Written by the session service as it deletes, only for a
 * session not yet ridden in the days a plan reminder looks at, only by
 * somebody other than the rider, and only on an installation with
 * reminders. Read under the rider's training policies; nobody changes or
 * removes a row, and the reminder job sweeps the ones past seven days.
 */
export const plannedSessionDeletions = pgTable(
  "planned_session_deletions",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    /** The day the session was on. */
    onDate: date("on_date").notNull(),
    title: text("title").notNull(),
    /** Who deleted it; always the caller, as the policy checks. */
    deletedBy: text("deleted_by").references(() => users.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("planned_session_deletions_rider_idx").on(t.orgId, t.riderId, t.deletedAt),
    index("planned_session_deletions_at_idx").on(t.deletedAt),
  ],
);

export type PlannedSessionDeletionRow = typeof plannedSessionDeletions.$inferSelect;
