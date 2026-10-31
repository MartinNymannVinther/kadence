import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { domainId, users } from "./foundation";
import { tenant } from "./shared";
import { riders } from "./team";

/**
 * What a person agreed to when they created their own workspace (docs/adr/
 * 0088): the terms, and their explicit consent to health data (GDPR art.
 * 9(2)(a)) — for themselves, or for their child as the parent. One row per
 * yes, with the version of the words it was given to and the language they
 * were read in. Withdrawing sets `withdrawn_at` and nothing else; giving it
 * again is a new row, so the history of yes and no stays readable.
 *
 * The person's own rows only, coaches included (drizzle/0050). Whether the
 * active workspace's health consent is withdrawn is answered to its members
 * as one boolean by `app_health_consent_withdrawn()`, which the wellbeing
 * services ask before they write.
 */
export const CONSENT_KINDS = ["terms", "health", "garmin", "garmin_ai"] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

export const consents = pgTable(
  "consents",
  {
    id: domainId("id"),
    orgId: tenant(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The rider the health data is about: the person's own row, or their child's. */
    riderId: text("rider_id").references(() => riders.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    givenAt: timestamp("given_at", { withTimezone: true }).notNull().defaultNow(),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    version: text("version").notNull(),
    locale: text("locale").notNull().default("da"),
  },
  (t) => [
    index("consents_org_kind_idx").on(t.orgId, t.kind),
    index("consents_user_idx").on(t.userId),
    index("consents_rider_idx").on(t.riderId),
    check("consents_kind", sql`${t.kind} in ('terms', 'health', 'garmin', 'garmin_ai')`),
    check("consents_locale", sql`${t.locale} in ('da', 'en')`),
    check("consents_version", sql`char_length(${t.version}) between 1 and 20`),
  ],
);

export type ConsentRow = typeof consents.$inferSelect;
