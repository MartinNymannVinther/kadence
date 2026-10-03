import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { domainId, organizations, users } from "./foundation";

/**
 * Trænerrummet (docs/adr/0052): a room for the coaches on one
 * installation, across clubs. It belongs to the installation, not to a
 * workspace, so these tables carry no `org_id`; they still have forced
 * RLS and audit triggers (drizzle/0023). Only a person who coaches a team
 * somewhere reads or writes; riders and parents never do; there are no
 * private messages. The database stamps who wrote a post and for which
 * club, from the session, and only the installation's owner moderates.
 */

const stamped = {
  /** Who wrote it; null once the account is gone, and then the names go too. */
  authorUserId: text("author_user_id").references(() => users.id, { onDelete: "set null" }),
  /** The club the author wrote as; null once the club is gone. */
  authorOrgId: text("author_org_id").references(() => organizations.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull().default(""),
  clubName: text("club_name").notNull().default(""),
  hiddenAt: timestamp("hidden_at", { withTimezone: true }),
  hiddenBy: text("hidden_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const communityThreads = pgTable(
  "community_threads",
  {
    id: domainId("id"),
    /** training | strength | wellbeing | races | equipment | dcu */
    category: text("category").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** A copy of a session from the author's library: its structure, never a rider's data. */
    workout: jsonb("workout"),
    locked: boolean("locked").notNull().default(false),
    lastPostAt: timestamp("last_post_at", { withTimezone: true }).notNull().defaultNow(),
    ...stamped,
  },
  (t) => [
    index("community_threads_recent_idx").on(t.lastPostAt),
    check(
      "community_threads_category",
      sql`${t.category} in ('training','strength','wellbeing','races','equipment','dcu')`,
    ),
    check("community_threads_title", sql`char_length(${t.title}) between 1 and 160`),
    check("community_threads_body", sql`char_length(${t.body}) between 1 and 8000`),
  ],
);

export const communityPosts = pgTable(
  "community_posts",
  {
    id: domainId("id"),
    threadId: text("thread_id")
      .notNull()
      .references(() => communityThreads.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    ...stamped,
  },
  (t) => [
    index("community_posts_thread_idx").on(t.threadId, t.createdAt),
    check("community_posts_body", sql`char_length(${t.body}) between 1 and 8000`),
  ],
);

export const communityReports = pgTable(
  "community_reports",
  {
    id: domainId("id"),
    /** thread | post */
    targetKind: text("target_kind").notNull(),
    targetId: text("target_id").notNull(),
    reporterUserId: text("reporter_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    handledAt: timestamp("handled_at", { withTimezone: true }),
    handledBy: text("handled_by"),
  },
  (t) => [
    index("community_reports_open_idx").on(t.handledAt),
    check("community_reports_kind", sql`${t.targetKind} in ('thread','post')`),
    check("community_reports_reason", sql`char_length(${t.reason}) <= 500`),
  ],
);

/** Where a coach last read a thread, for the count of unread threads. */
export const communityReads = pgTable(
  "community_reads",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    threadId: text("thread_id")
      .notNull()
      .references(() => communityThreads.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.threadId] })],
);
