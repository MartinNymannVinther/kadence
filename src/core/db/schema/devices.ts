import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { domainId } from "./foundation";
import { riders } from "./team";
import { tenant, timestamps } from "./shared";

/**
 * A rider's connection to Wahoo, Garmin or Polar. The tokens are sealed with the
 * installation's secret box (src/core/crypto) and never leave the server.
 */
export const deviceLinks = pgTable(
  "device_links",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    /** wahoo | garmin | polar */
    provider: text("provider").notNull(),
    externalUserId: text("external_user_id").notNull(),
    accessTokenSealed: text("access_token_sealed").notNull(),
    refreshTokenSealed: text("refresh_token_sealed"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    /** connected | error | revoked */
    status: text("status").notNull().default("connected"),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastError: text("last_error").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("device_links_rider_provider_uq").on(t.riderId, t.provider),
    uniqueIndex("device_links_external_uq").on(t.provider, t.externalUserId),
    check("device_links_provider", sql`${t.provider} in ('wahoo','garmin','polar')`),
    check("device_links_status", sql`${t.status} in ('connected','error','revoked')`),
  ],
);

export type DeviceLinkRow = typeof deviceLinks.$inferSelect;
