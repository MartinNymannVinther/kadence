import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { domainId, invitations, users } from "./foundation";
import { tenant, timestamps } from "./shared";

/**
 * The team: the people in it and what the team shares.
 *
 * A workspace is a team — a club's U17 group, a U19 squad, a U23 team, or
 * one rider training on their own. Its coaches are the workspace's owners
 * and admins; a rider and a parent are members with a row here that says
 * so (docs/adr/0010). Everything that belongs to one rider carries
 * `rider_id`, and the database decides who may read it: the team's
 * coaches, the rider, and the rider's confirmed guardians for what the
 * rider shares (docs/adr/0011, drizzle/0003).
 */

/** One row per workspace; absent until a coach changes a default. */
export const teamSettings = pgTable(
  "team_settings",
  {
    id: domainId("id"),
    orgId: tenant().unique(),
    /** U17 | U19 | U23 | mixed — what the team is, for defaults and the demo. */
    teamKind: text("team_kind").notNull().default("mixed"),
    /** Whether the AI may read riders' training and check-ins (off by default). */
    aiOnRiderData: boolean("ai_on_rider_data").notNull().default(false),
    /** Whether weight may be recorded for riders under 19. Off by default (docs/adr/0013). */
    allowYouthWeight: boolean("allow_youth_weight").notNull().default(false),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [check("team_settings_kind", sql`${t.teamKind} in ('U17','U19','U23','mixed')`)],
);

/**
 * A rider on the team. A coach may create the row before the rider has an
 * account; the invitation it was sent with links the account on joining
 * (`claim_invitation_links` in drizzle/0003).
 */
export const riders = pgTable(
  "riders",
  {
    id: domainId("id"),
    orgId: tenant(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    invitationId: text("invitation_id").references(() => invitations.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    /** DCU's classes go by birth year, so the year is all Kadence asks for. */
    birthYear: smallint("birth_year").notNull(),
    /** female | male | null — optional, only used where recommendations differ. */
    sex: text("sex"),
    /** A coach's override of the class and year the birth year gives ("U19-1"), e.g. a rider moved up. */
    categoryOverride: text("category_override"),
    ftpWatts: smallint("ftp_watts"),
    thresholdHr: smallint("threshold_hr"),
    maxHr: smallint("max_hr"),
    restingHr: smallint("resting_hr"),
    thresholdsOn: date("thresholds_on"),
    /** What the rider lets their guardians see (docs/adr/0011). */
    shareTraining: boolean("share_training").notNull().default(true),
    shareWellbeing: boolean("share_wellbeing").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("riders_org_user_uq")
      .on(t.orgId, t.userId)
      .where(sql`${t.userId} is not null`),
    index("riders_org_idx").on(t.orgId),
    check("riders_birth_year", sql`${t.birthYear} between 1940 and 2100`),
    check("riders_sex", sql`${t.sex} is null or ${t.sex} in ('female','male')`),
    check(
      "riders_category",
      sql`${t.categoryOverride} is null or ${t.categoryOverride} in ('U17-1','U17-2','U19-1','U19-2','U23-1','U23-2','U23-3','U23-4','senior')`,
    ),
  ],
);

/**
 * A parent or guardian linked to one rider. The link gives nothing until
 * the rider has confirmed it, and it lapses in the year the rider turns 18
 * unless the rider confirms it again as an adult.
 */
export const guardians = pgTable(
  "guardians",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    invitationId: text("invitation_id").references(() => invitations.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    /** mother | father | guardian | other — a word for the interface, nothing more. */
    relation: text("relation").notNull().default("guardian"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    confirmedAsAdult: boolean("confirmed_as_adult").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("guardians_org_rider_idx").on(t.orgId, t.riderId),
    uniqueIndex("guardians_rider_user_uq")
      .on(t.riderId, t.userId)
      .where(sql`${t.userId} is not null`),
  ],
);

/**
 * What changes slowly and is worth a history: height through the growth
 * spurt, threshold tests, resting pulse. Weight only where the team has
 * allowed it for riders under 19 (docs/adr/0013).
 */
export const riderMeasurements = pgTable(
  "rider_measurements",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    measuredOn: date("measured_on").notNull(),
    /** height_cm | weight_kg | ftp_w | threshold_hr | max_hr | resting_hr */
    kind: text("kind").notNull(),
    value: numeric("value", { precision: 7, scale: 2, mode: "number" }).notNull(),
    note: text("note").notNull().default(""),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("rider_measurements_rider_idx").on(t.orgId, t.riderId, t.measuredOn),
    check(
      "rider_measurements_kind",
      sql`${t.kind} in ('height_cm','weight_kg','ftp_w','threshold_hr','max_hr','resting_hr')`,
    ),
  ],
);

/**
 * A season plan for one rider: twelve months of planned hours and a phase
 * each, from October (ADR 0015). Filled from DCU's recommendation for the rider's
 * class and year in it (src/modules/dcu), then the coach's to change;
 * the difference from DCU is always shown, never hidden.
 */
export const seasonPlans = pgTable(
  "season_plans",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    /** The calendar year the season starts in (October). */
    seasonStartYear: integer("season_start_year").notNull(),
    /** The DCU class and year the plan was filled from, e.g. "U19-1". */
    basis: text("basis").notNull(),
    /** [{ month: 10, hours: 0, phase: "break", note: "" }, … ] — twelve entries from October. */
    months: jsonb("months").notNull(),
    note: text("note").notNull().default(""),
    ...timestamps,
  },
  (t) => [uniqueIndex("season_plans_rider_season_uq").on(t.riderId, t.seasonStartYear)],
);

/**
 * The team's library: bike sessions, strength sessions and programmes.
 * DCU's strength programmes arrive as templates with a progression
 * (src/modules/dcu/strength.ts); a coach's own sit beside them.
 */
export const workoutTemplates = pgTable(
  "workout_templates",
  {
    id: domainId("id"),
    orgId: tenant(),
    name: text("name").notNull(),
    /** bike | strength | other */
    sport: text("sport").notNull(),
    description: text("description").notNull().default(""),
    /** The steps, or the exercises and progression — src/modules/workouts/structure.ts. */
    structure: jsonb("structure").notNull(),
    plannedMinutes: smallint("planned_minutes").notNull().default(0),
    /** dcu | own */
    source: text("source").notNull().default("own"),
    /** Stable key for a DCU template, so a newer edition can replace it. */
    sourceKey: text("source_key"),
    archived: boolean("archived").notNull().default(false),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("workout_templates_org_idx").on(t.orgId, t.sport),
    uniqueIndex("workout_templates_source_key_uq")
      .on(t.orgId, t.sourceKey)
      .where(sql`${t.sourceKey} is not null`),
    check("workout_templates_sport", sql`${t.sport} in ('bike','strength','other')`),
    check("workout_templates_source", sql`${t.source} in ('dcu','own')`),
    check("workout_templates_minutes", sql`${t.plannedMinutes} between 0 and 1440`),
  ],
);

export type TeamSettingsRow = typeof teamSettings.$inferSelect;
export type RiderRow = typeof riders.$inferSelect;
export type GuardianRow = typeof guardians.$inferSelect;
export type RiderMeasurementRow = typeof riderMeasurements.$inferSelect;
export type SeasonPlanRow = typeof seasonPlans.$inferSelect;
export type WorkoutTemplateRow = typeof workoutTemplates.$inferSelect;
