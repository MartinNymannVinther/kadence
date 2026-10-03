import { sql } from "drizzle-orm";
import {
  check,
  customType,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { tenant } from "./shared";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

/**
 * A club's logo and its picture (docs/adr/0048): at most one of each per
 * workspace. The browser scales and re-encodes the picture before it is
 * sent, which also drops its EXIF data; the server checks the bytes are a
 * PNG, JPEG or WebP and within the size. The column is named `bytes` so
 * `audit_redact` keeps the image out of the audit log (drizzle/0003).
 *
 * Read by everyone in the team, written by its coaches, under the
 * policies in drizzle/0019.
 */
export const orgImages = pgTable(
  "org_images",
  {
    orgId: tenant(),
    kind: text("kind").notNull(),
    mime: text("mime").notNull(),
    bytes: bytea("bytes").notNull(),
    width: smallint("width").notNull(),
    height: smallint("height").notNull(),
    updatedBy: text("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    primaryKey({ columns: [t.orgId, t.kind] }),
    check("org_images_kind", sql`${t.kind} in ('logo', 'cover')`),
    check("org_images_mime", sql`${t.mime} in ('image/png', 'image/jpeg', 'image/webp')`),
    check(
      "org_images_size",
      sql`octet_length(${t.bytes}) <= case when ${t.kind} = 'logo' then 307200 else 2097152 end`,
    ),
    check(
      "org_images_dimensions",
      sql`${t.width} between 1 and 4096 and ${t.height} between 1 and 4096`,
    ),
  ],
);
