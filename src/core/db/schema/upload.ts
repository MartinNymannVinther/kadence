import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { domainId, users } from "./foundation";
import { tenant, timestamps } from "./shared";
import { riders } from "./team";

/**
 * A rider's upload key (docs/adr/0029): what lets a helper — a script on
 * the family's computer, an app on the phone, the bike computer itself —
 * hand a ride file to Kadence with nobody signed in. The key is shown
 * once and stored only as a hash, the way an invitation key is
 * (src/core/access/tokens.ts). It admits one thing, a file for this
 * rider, and it is dead the moment the row is gone.
 *
 * Read and written under the policies in drizzle/0014: the rider makes
 * and removes their own, a coach sees that one exists and can remove it,
 * nobody else sees it. The application role cannot read `key_hash` at
 * all: it is granted every column but that one, and the one question
 * that needs the hash is answered by `upload_key_owner`.
 */
export const uploadKeys = pgTable(
  "upload_keys",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    /** What the rider calls it: where the key is in use. */
    name: text("name").notNull(),
    /** sha256 of the key, in hex. The key itself is never stored. */
    keyHash: text("key_hash").notNull(),
    /** The key's last four characters, to tell two keys apart on the page. */
    hint: text("hint").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    /** A short code for what went wrong last, empty when nothing did. */
    lastError: text("last_error").notNull().default(""),
    /**
     * The account that made the key. A key works only while that account
     * is the rider's: a rider row taken over by another person does not
     * hand its keys on.
     */
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("upload_keys_hash_uq").on(t.keyHash),
    index("upload_keys_rider_idx").on(t.orgId, t.riderId),
    check("upload_keys_name", sql`char_length(${t.name}) between 1 and 60`),
    check("upload_keys_hash", sql`${t.keyHash} ~ '^[0-9a-f]{64}$'`),
    check("upload_keys_hint", sql`char_length(${t.hint}) = 4`),
  ],
);

export type UploadKeyRow = typeof uploadKeys.$inferSelect;
