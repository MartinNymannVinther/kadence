import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { domainId, organizations } from "./foundation";

/**
 * What Kadence costs, as data (docs/adr/0090, drizzle/0052). The
 * installation's own list, without org_id: every role that shows a price
 * reads it, and only the installation's owner changes it, through the
 * database function set_price_plan(), which adds a row from the day the
 * change takes effect and keeps the older ones (drizzle/0053). Whole kroner, VAT included unless
 * the row says otherwise; the AI budget in micro-euro and the file quota
 * in bytes, as team_settings holds them (ADR 0087, 0089).
 */
export const pricePlans = pgTable(
  "price_plans",
  {
    key: text("key").notNull(),
    nameDa: text("name_da").notNull(),
    nameEn: text("name_en").notNull(),
    priceYearDkk: integer("price_year_dkk").notNull(),
    /** Per rider beyond `includedRiders`, a year; null when the price does not grow with riders. */
    perRiderDkk: integer("per_rider_dkk"),
    includedRiders: integer("included_riders"),
    aiBudgetMicro: bigint("ai_budget_micro", { mode: "number" }).notNull(),
    fileQuotaBytes: bigint("file_quota_bytes", { mode: "number" }).notNull(),
    vatIncluded: boolean("vat_included").notNull().default(true),
    validFrom: date("valid_from")
      .notNull()
      .default(sql`current_date`),
    source: text("source"),
  },
  (t) => [
    // A plan's price is a row per day it took effect (drizzle/0053): the
    // latest that has come is today's, the older ones are its history.
    primaryKey({ columns: [t.key, t.validFrom] }),
    check("price_plans_price", sql`${t.priceYearDkk} >= 0`),
    check("price_plans_per_rider", sql`${t.perRiderDkk} is null or ${t.perRiderDkk} >= 0`),
    check("price_plans_included", sql`${t.includedRiders} is null or ${t.includedRiders} >= 0`),
    check("price_plans_ai_budget", sql`${t.aiBudgetMicro} >= 0`),
    check("price_plans_file_quota", sql`${t.fileQuotaBytes} >= 0`),
  ],
);

/**
 * A payment the installation's owner registered by hand after the bank
 * transfer came in (docs/adr/0090). The invoice itself is made and kept
 * in the owner's own bookkeeping; this is the record that it was paid,
 * for which period. The workspace's owner reads its own; nobody in a
 * workspace writes one: only set_payment(), which checks the caller owns
 * the installation and moves the workspace to 'paid' in the same breath.
 */
export const payments = pgTable(
  "payments",
  {
    id: domainId("id"),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    amountDkk: integer("amount_dkk").notNull(),
    vatDkk: integer("vat_dkk").notNull(),
    invoiceNo: text("invoice_no").notNull(),
    periodFrom: date("period_from").notNull(),
    periodTo: date("period_to").notNull(),
    registeredBy: text("registered_by").notNull(),
    registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
    note: text("note"),
  },
  (t) => [
    check("payments_amount", sql`${t.amountDkk} >= 0`),
    check("payments_vat", sql`${t.vatDkk} >= 0 and ${t.vatDkk} <= ${t.amountDkk}`),
    check("payments_period", sql`${t.periodTo} >= ${t.periodFrom}`),
    check("payments_invoice_no", sql`length(${t.invoiceNo}) between 1 and 100`),
    index("payments_org_idx").on(t.orgId, t.registeredAt),
  ],
);
