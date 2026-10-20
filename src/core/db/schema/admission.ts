import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  type AnyPgColumn,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { domainId, users } from "./foundation";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ------------------------------------------------------------------ */
/* Admission: who may create an organization on this installation.   */
/* Platform-level tables without org_id, reachable only through the   */
/* auth role - see drizzle/0001 and ADR 0004.                          */
/* ------------------------------------------------------------------ */

/**
 * What an application, and the invitation its approval mints, says about
 * a personal workspace (docs/adr/0080). A club's application leaves all
 * but `kind` empty. For one person, `birth_year` is the rider's — the
 * applicant's own for "me", the child's for "child" — and a child's name
 * (and, if given, the address a link can be made for) rides along, so the
 * registration can create the child's rider row. Nothing else about a
 * child is asked for.
 */
const personalApplication = {
  kind: text("kind").notNull().default("club"),
  birthYear: integer("birth_year"),
  forWhom: text("for_whom"),
  childName: text("child_name"),
  childEmail: text("child_email"),
};

function personalChecks(
  table: string,
  t: {
    kind: AnyPgColumn;
    birthYear: AnyPgColumn;
    forWhom: AnyPgColumn;
    childName: AnyPgColumn;
  },
) {
  return [
    check(`${table}_kind`, sql`${t.kind} in ('club', 'personal')`),
    check(`${table}_for_whom`, sql`${t.forWhom} is null or ${t.forWhom} in ('me', 'child')`),
    check(
      `${table}_birth_year`,
      sql`${t.birthYear} is null or ${t.birthYear} between 1900 and 2200`,
    ),
    check(
      `${table}_personal`,
      sql`${t.kind} = 'club' or (${t.birthYear} is not null and ${t.forWhom} is not null)`,
    ),
    check(
      `${table}_child`,
      sql`${t.forWhom} is distinct from 'child' or ${t.childName} is not null`,
    ),
  ];
}

/**
 * Someone asking to use this installation. Holds personal data about a
 * person who is not (yet) a user, which is why the table is narrow and
 * declines are kept only as a record of the decision.
 */
export const accessRequests = pgTable(
  "access_requests",
  {
    id: domainId("id"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    organizationName: text("organization_name").notNull(),
    message: text("message"),
    ...personalApplication,
    /** pending | approved | declined */
    status: text("status").notNull().default("pending"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    // One open application per address; a declined or approved one does
    // not block a later application from the same person.
    uniqueIndex("access_requests_pending_email_uq")
      .on(sql`lower(${t.email})`)
      .where(sql`${t.status} = 'pending'`),
    index("access_requests_status_created_idx").on(t.status, t.createdAt),
    ...personalChecks("access_requests", t),
  ],
);

/**
 * A single-use key that lets one e-mail address register one account and
 * its organization while signup is otherwise closed. Only the hash is
 * stored: the plain token is shown once, to the person who created it,
 * and travels in the registration link.
 */
export const accessInvitations = pgTable(
  "access_invitations",
  {
    id: domainId("id"),
    email: text("email").notNull(),
    organizationName: text("organization_name").notNull(),
    ...personalApplication,
    /** sha256 hex of the token in the link. */
    tokenHash: text("token_hash").notNull(),
    invitedBy: text("invited_by").references(() => users.id, { onDelete: "set null" }),
    accessRequestId: text("access_request_id").references(() => accessRequests.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    usedByUserId: text("used_by_user_id").references(() => users.id, { onDelete: "set null" }),
    /** Set when the owner issued a replacement link; the old key is dead. */
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("access_invitations_token_hash_uq").on(t.tokenHash),
    index("access_invitations_email_idx").on(sql`lower(${t.email})`),
    ...personalChecks("access_invitations", t),
  ],
);
