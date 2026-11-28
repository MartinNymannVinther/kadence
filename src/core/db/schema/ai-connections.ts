import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { domainId, users } from "./foundation";
import { oauthClients } from "./oauth";
import { tenant, timestamps } from "./shared";

/**
 * A person's own assistant connected to one workspace (docs/adr/0118).
 * Made when the person says yes on the consent page, and the one thing
 * /api/mcp asks on every call: a valid token whose connection is gone
 * reaches nothing. Removing the row on "Din AI" also takes away Better
 * Auth's consent and tokens for it (src/modules/mcp/connections.ts).
 *
 * Only the person sees their own (drizzle/0064): not a coach, not a
 * parent, not a teammate (Martin's answer of 27 November 2026).
 */
export const aiConnections = pgTable(
  "ai_connections",
  {
    id: domainId("id"),
    orgId: tenant(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClients.clientId, { onDelete: "cascade" }),
    /** The name the assistant gave itself, capped; shown as plain text, never trusted. */
    clientName: text("client_name").notNull(),
    /** Where the assistant returns to after the yes (claude.ai): what the person can trust. */
    clientHost: text("client_host").notNull(),
    scopes: text("scopes").array().notNull(),
    /**
     * What the person lets the assistant do (docs/adr/0120,
     * src/modules/mcp/permissions.ts): reading on from the start, writing
     * and deleting off until the person turns them on.
     */
    permissions: text("permissions")
      .array()
      .notNull()
      .default(
        sql`array['read_sessions','read_rides','read_checkins','read_form','read_season']::text[]`,
      ),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("ai_connections_uq").on(t.orgId, t.userId, t.clientId),
    index("ai_connections_user_idx").on(t.userId),
    index("ai_connections_client_idx").on(t.clientId),
    check("ai_connections_name", sql`char_length(${t.clientName}) between 1 and 80`),
    check("ai_connections_host", sql`char_length(${t.clientHost}) between 1 and 255`),
    check(
      "ai_connections_permissions",
      sql`${t.permissions} <@ array['read_sessions','read_rides','read_checkins','read_form','read_season','write_checkin','write_ride_feedback','write_move_skip','write_sessions','delete_sessions','delete_manual','delete_rides','delete_checkins']::text[]`,
    ),
    check(
      "ai_connections_scopes",
      sql`${t.scopes} <@ array['kadence:read','kadence:checkin','kadence:draft']::text[]`,
    ),
  ],
);

export type AiConnectionRow = typeof aiConnections.$inferSelect;
