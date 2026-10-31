import { sql } from "drizzle-orm";
import { check, customType, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { domainId } from "./foundation";
import { tenant, timestamps } from "./shared";
import { riders } from "./team";

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
    /**
     * When the refresh token runs out, where the provider says (Garmin):
     * the job `device.refresh` renews a link before it does (docs/adr/0113).
     */
    refreshExpiresAt: timestamp("refresh_expires_at", { withTimezone: true }),
    /**
     * What the rider let Kadence do at the provider, as the provider last
     * answered it (Garmin's ACTIVITY_EXPORT, WORKOUT_IMPORT, …); null when
     * it has not been read.
     */
    permissions: text("permissions").array(),
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

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

/**
 * A ride file a provider handed over and Kadence has not yet imported
 * (docs/adr/0113). Garmin lets a file be downloaded once, so the bytes are
 * kept here the moment they arrive, and an import that fails for a moment
 * is tried again from them rather than from Garmin. The row goes in the
 * transaction that imports the ride, or as soon as the ride is refused
 * for good; it lives minutes, not days. The export leaves it out: once
 * imported, the file is in `activity_files`.
 */
export const deviceInbox = pgTable(
  "device_inbox",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    /** The provider's id for the activity, as on `activities.external_id`. */
    externalId: text("external_id").notNull(),
    fileName: text("file_name").notNull(),
    /** The device the ride was recorded on, as the provider names it. */
    deviceName: text("device_name"),
    /** The sport the provider names, where it does: bike | strength | other. */
    sport: text("sport"),
    bytes: bytea("bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("device_inbox_activity_uq").on(t.riderId, t.provider, t.externalId),
    check("device_inbox_provider", sql`${t.provider} in ('wahoo','garmin','polar')`),
    check("device_inbox_sport", sql`${t.sport} in ('bike','strength','other')`),
    check("device_inbox_device_name", sql`char_length(${t.deviceName}) <= 80`),
    check("device_inbox_size", sql`octet_length(${t.bytes}) <= 26214400`),
  ],
);
