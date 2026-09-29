import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { domainId, users } from "./foundation";
import { tenant, timestamps } from "./shared";

/**
 * A one-time link a coach made for a member of the team who forgot the
 * password (docs/adr/0032). The link itself is Better Auth's own password
 * reset, kept in its verification table and gone once used or an hour
 * old; this row is the record that it was made, by whom and for whom.
 * The person reads it on their security page, the coaches in the audit
 * trail. Written by a coach under the policies in drizzle/0015 and never
 * changed.
 */
export const passwordResets = pgTable(
  "password_resets",
  {
    id: domainId("id"),
    orgId: tenant(),
    /** Who the link lets back in. */
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The coach who made it. */
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("password_resets_user_idx").on(t.orgId, t.userId)],
);
