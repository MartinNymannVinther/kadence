import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { domainId, organizations, users } from "./foundation";

const tenant = () =>
  text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" });

/**
 * One row per model call, so calls per person and per workspace can be
 * counted and capped, and what they cost added up (docs/adr/0089). Kept
 * short: no content, only who, what kind, when, and what it spent.
 *
 * The row is written before the model is asked, and the tokens and the
 * cost after it answered; a call that failed keeps nulls. `cost_micro` is
 * micro-euro, null when the provider gave no token count or the model has
 * no known price. `billed_to` says whose key paid: the installation's,
 * which the monthly budget counts, or the workspace's own (ADR 0006).
 */
export const aiCalls = pgTable(
  "ai_calls",
  {
    id: domainId("id"),
    orgId: tenant(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").notNull(), // draft | split | summary | test
    engine: text("engine").notNull().default(""),
    provider: text("provider"),
    model: text("model"),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    costMicro: bigint("cost_micro", { mode: "number" }),
    billedTo: text("billed_to").notNull().default("installation"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ai_calls_user_created_idx").on(t.userId, t.createdAt),
    check("ai_calls_billed_to", sql`${t.billedTo} in ('installation', 'workspace')`),
  ],
);

/**
 * The installation's price list for model calls (docs/adr/0089), seeded
 * by drizzle/0049 from src/modules/ai/prices.ts. Not a team's: every
 * workspace reads it, nobody but a migration writes it. Prices are
 * micro-euro per million tokens; null is a model whose price is not known.
 */
export const aiPrices = pgTable(
  "ai_prices",
  {
    provider: text("provider").notNull(),
    /** An API model id, or "*" for every model of the provider. */
    model: text("model").notNull(),
    inputMicroPerMtok: bigint("input_micro_per_mtok", { mode: "number" }),
    outputMicroPerMtok: bigint("output_micro_per_mtok", { mode: "number" }),
    validFrom: date("valid_from").notNull(),
    source: text("source").notNull(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.model, t.validFrom] })],
);

/**
 * The model this workspace uses, when it does not want the one the
 * installation set. One row per workspace, absent until somebody chooses:
 * absence means "inherit the installation", which is the honest default
 * for a tool that must also run with no model at all.
 *
 * The API key is stored encrypted (AES-256-GCM, see src/core/crypto) and
 * never leaves the server; the settings page can say a key is stored and
 * when it was stored, and nothing more. The Ollama address is deliberately
 * not here: a workspace picking its own URL would be a request the server
 * makes to wherever a member points it, and that is a hole nobody asked
 * for. The installation owns the address; the workspace owns the model.
 */
export const workspaceLlmSettings = pgTable("workspace_llm_settings", {
  id: domainId("id"),
  orgId: tenant().unique(),
  /** mistral | ollama | none — "none" is a deliberate opt-out, not absence. */
  provider: text("provider").notNull(),
  /** Null means the provider's own default model. */
  model: text("model"),
  /** Versioned ciphertext, or null when the installation's key is used. */
  apiKeyCipher: text("api_key_cipher"),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WorkspaceLlmSettingsRow = typeof workspaceLlmSettings.$inferSelect;
