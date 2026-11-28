import { sql } from "drizzle-orm";
import { check, customType, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { aiConnections } from "./ai-connections";
import { domainId, users } from "./foundation";
import { tenant } from "./shared";
import { riders } from "./team";

/**
 * What a person's own assistant wrote or deleted, kept so the person can
 * undo it for 30 days (docs/adr/0120, Haij's dogma five: everything the AI
 * does can be undone). One row per change: what it touched, the row as it
 * was before (none for something made new), when the row was last written
 * by the change, and for a deleted ride its file.
 *
 * The person's own rows only, in the workspace (drizzle/0066): not a coach,
 * not a parent. A row is written once and only its undo is noted after;
 * the sweep takes rows past 30 days.
 */
export const AI_ACTION_ENTITIES = ["planned_session", "activity", "checkin"] as const;
export type AiActionEntity = (typeof AI_ACTION_ENTITIES)[number];
export const AI_ACTION_KINDS = ["created", "updated", "deleted"] as const;
export type AiActionKind = (typeof AI_ACTION_KINDS)[number];

const bytes = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

export const aiActions = pgTable(
  "ai_actions",
  {
    id: domainId("id"),
    orgId: tenant(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    connectionId: text("connection_id").references(() => aiConnections.id, {
      onDelete: "set null",
    }),
    /** The tool the assistant called. */
    tool: text("tool").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    kind: text("kind").notNull(),
    /** The row before the change; null when the change made it. */
    before: jsonb("before"),
    /** The row's `updated_at` right after the change: an undo after somebody else wrote it is refused. */
    afterStamp: timestamp("after_stamp", { withTimezone: true }),
    /** For a deleted ride: its file's row and bytes, and the session it was laid on. */
    fileMeta: jsonb("file_meta"),
    fileBytes: bytes("file_bytes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    undoneAt: timestamp("undone_at", { withTimezone: true }),
  },
  (t) => [
    index("ai_actions_user_idx").on(t.orgId, t.userId, t.createdAt),
    index("ai_actions_created_idx").on(t.createdAt),
    check("ai_actions_entity", sql`${t.entity} in ('planned_session', 'activity', 'checkin')`),
    check("ai_actions_kind", sql`${t.kind} in ('created', 'updated', 'deleted')`),
    check("ai_actions_tool", sql`char_length(${t.tool}) between 1 and 64`),
  ],
);

export type AiActionRow = typeof aiActions.$inferSelect;
