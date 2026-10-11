import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * The foundation schema, shared with Haij (see docs/adr/0001).
 *
 * The auth tables (users, sessions, accounts, verifications, organizations,
 * memberships, invitations, passkeys, two_factors, rate_limits) are owned by
 * Better Auth and queried exclusively through the `kadence_auth` role. The
 * application role `kadence_app` only ever gets the narrow read access defined
 * in the RLS migration. An organization is what the UI calls a workspace
 * ("arbejdsrum"): the tenant every project belongs to.
 *
 * All timestamps are timestamptz; all tables get RLS enabled + forced in the
 * RLS migration (drizzle/0001). Domain tables arrive with the product slices
 * and each one carries org_id, forced RLS, an audit trigger and an isolation
 * test (CONTRIBUTING.md).
 */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  /**
   * Role on the installation itself, as opposed to in an organization.
   * `owner` may admit new organizations (see src/core/access). Set on the
   * first user of an empty installation and otherwise only by hand; never
   * writable from a request (Better Auth field is `input: false`).
   */
  platformRole: text("platform_role"),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activeOrganizationId: text("active_organization_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    ...timestamps,
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    // Account identity is scoped by issuer since Better Auth 1.7
    // (e.g. "local:credential" for password accounts).
    issuer: text("issuer").notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [
    index("accounts_user_id_idx").on(t.userId),
    uniqueIndex("accounts_issuer_account_uq").on(t.issuer, t.accountId),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    metadata: text("metadata"),
    /**
     * What the workspace is (docs/adr/0080): a club or team, or one
     * person's own training. Better Auth does not know the column and no
     * request body can set it (a before-hook in src/core/auth/auth.ts
     * refuses one that tries); our registration code sets it with a
     * direct update right after the organization is created.
     */
    kind: text("kind").notNull().default("club"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("organizations_kind", sql`${t.kind} in ('club', 'personal')`),
    index("organizations_kind_idx").on(t.kind),
  ],
);

export const memberships = pgTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /**
     * When this person last made this workspace the active one, so a new
     * login opens the club they used last (docs/adr/0048). Better Auth
     * does not know the column; the hook in src/core/auth/auth.ts sets it.
     */
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("memberships_org_user_uq").on(t.organizationId, t.userId),
    index("memberships_user_id_idx").on(t.userId),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("invitations_organization_id_idx").on(t.organizationId)],
);

export const passkeys = pgTable(
  "passkeys",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    credentialID: text("credential_id").notNull(),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: boolean("backed_up").notNull(),
    transports: text("transports"),
    aaguid: text("aaguid"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("passkeys_user_id_idx").on(t.userId)],
);

export const twoFactors = pgTable(
  "two_factors",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    verified: boolean("verified").default(true),
    failedVerificationCount: integer("failed_verification_count").default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (t) => [index("two_factors_user_id_idx").on(t.userId)],
);

export const rateLimits = pgTable("rate_limits", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/** Text primary key generated by the database; every domain table uses it. */
export const domainId = (name: string) =>
  text(name)
    .primaryKey()
    .default(sql`(gen_random_uuid())::text`);

/**
 * Append-only audit log; one row per mutation (who, what, when, org,
 * before/after). Written by database triggers plus semantic auth events.
 *
 * Deliberately no foreign keys: the audit trail is immutable and must never
 * be updated or deleted as a side effect of ON DELETE actions on other rows.
 * Enforcement lives in the RLS/audit migration (no UPDATE/DELETE privileges
 * plus a trigger that rejects both).
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    orgId: text("org_id"),
    actorUserId: text("actor_user_id"),
    actorType: text("actor_type").notNull().default("system"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before_data"),
    after: jsonb("after_data"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_org_created_idx").on(t.orgId, t.createdAt),
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
    // Three more are hand-written in drizzle/0042: (org_id, id) for the
    // export's pages, and the partial expression indexes on
    // before_data/after_data ->> 'rider_id' for erase_rider().
  ],
);
