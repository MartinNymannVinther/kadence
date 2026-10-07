import { sql } from "drizzle-orm";
import { check, date, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { domainId, users } from "./foundation";
import { tenant, timestamps } from "./shared";

/**
 * What a person can be reminded of (docs/adr/0060). `wellbeing` is a
 * coach's: a rider on the team checked in in the red zone (drizzle/0029).
 */
export const PUSH_KINDS = ["checkin", "comment", "plan", "week", "wellbeing"] as const;
export type PushKind = (typeof PUSH_KINDS)[number];

/**
 * A browser that has said yes to Kadence's reminders, for one person on
 * one team (docs/adr/0060). The push itself carries nothing: it wakes the
 * service worker, which asks Kadence what is new as the signed-in person,
 * so the push services see an address and a time and never a word of
 * what it is about. Each row is its owner's alone; the reminder job finds
 * the rows through `push_subscriptions_due()` and then reads everything
 * else as that person, under the ordinary policies (drizzle/0028).
 */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: domainId("id"),
    orgId: tenant(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The browser's push address, a capability URL; kept out of the audit log. */
    endpoint: text("endpoint").notNull(),
    kinds: text("kinds")
      .array()
      .notNull()
      .default(sql`'{checkin,comment,plan,week}'::text[]`),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("push_subscriptions_endpoint_uq").on(t.orgId, t.userId, t.endpoint),
    index("push_subscriptions_user_idx").on(t.userId),
    check(
      "push_subscriptions_endpoint",
      sql`${t.endpoint} like 'https://%' and char_length(${t.endpoint}) <= 1000`,
    ),
    check(
      "push_subscriptions_kinds",
      sql`${t.kinds} <@ array['checkin','comment','plan','week','wellbeing']::text[]`,
    ),
  ],
);

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;

/**
 * What the reminder run has told one subscription, so nothing goes out
 * twice (docs/adr/0060, drizzle/0038): technical timestamps the job
 * writes on every reminder, kept apart from the subscription so they do
 * not write the audit trail. One row per subscription, its owner's alone
 * like the subscription; made by the run the first time it reads it, and
 * gone with the subscription.
 */
export const pushRuns = pgTable(
  "push_runs",
  {
    subscriptionId: text("subscription_id")
      .primaryKey()
      .references(() => pushSubscriptions.id, { onDelete: "cascade" }),
    orgId: tenant(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Everything before this moment has been told; the next push is about what came after. */
    toldUpTo: timestamp("told_up_to", { withTimezone: true }).notNull(),
    /** The Copenhagen day the last check-in reminder went out. */
    checkinRemindedOn: date("checkin_reminded_on"),
    /** The Monday of the last week a parent was told about. */
    weekToldOn: date("week_told_on"),
    /** When the last reminder went out; null until one has (see `lastTold`). */
    toldAt: timestamp("told_at", { withTimezone: true }),
  },
  (t) => [index("push_runs_user_idx").on(t.userId)],
);

export type PushRunRow = typeof pushRuns.$inferSelect;
