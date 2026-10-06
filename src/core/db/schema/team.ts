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
  time,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
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
    /**
     * The model the team plans by: DCU's 2025 recommendations, or none
     * (docs/adr/0049). Coaches change it whenever they like.
     */
    guidance: text("guidance").notNull().default("dcu-2025"),
    /** Whether the club keeps a club championship in Kadence (docs/adr/0051). Off by default. */
    clubChampionship: boolean("club_championship").notNull().default(false),
    /**
     * Whether the team measures its sessions against the intensity profile
     * "Lav intensitet først" on top of its hours (docs/adr/0053). Off by default.
     */
    lowIntensityFirst: boolean("low_intensity_first").notNull().default(false),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    check("team_settings_kind", sql`${t.teamKind} in ('U17','U19','U23','mixed')`),
    check("team_settings_guidance", sql`${t.guidance} in ('dcu-2025','none')`),
  ],
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
    /**
     * The UCI ID on the rider's licence, set by a coach (docs/adr/0039).
     * Eleven digits, stored without the spaces the licence prints them with.
     */
    uciId: text("uci_id"),
    /** When Kadence last asked Cykling Danmark for the rider's races, and what went wrong if it did. */
    racesCheckedAt: timestamp("races_checked_at", { withTimezone: true }),
    racesError: text("races_error").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("riders_org_uci_uq")
      .on(t.orgId, t.uciId)
      .where(sql`${t.uciId} is not null`),
    uniqueIndex("riders_org_user_uq")
      .on(t.orgId, t.userId)
      .where(sql`${t.userId} is not null`),
    index("riders_org_idx").on(t.orgId),
    check("riders_birth_year", sql`${t.birthYear} between 1940 and 2100`),
    check("riders_sex", sql`${t.sex} is null or ${t.sex} in ('female','male')`),
    check("riders_uci_id", sql`${t.uciId} is null or ${t.uciId} ~ '^[0-9]{11}$'`),
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
 * A process goal for one rider (ADR 0013, process before results; ADR
 * 0024): "30 strength sessions this winter", "12 rides over three hours",
 * "80 hours on the bike by March" — a count or a sum over a period, read
 * off the rider's sessions and rides by `kind`, or kept by hand
 * (`manual`, with `progress` bumped by the rider or the coach). Never a
 * result: no watt, no place, no weight.
 */
export const riderGoals = pgTable(
  "rider_goals",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** strength_sessions | bike_sessions | bike_hours | long_rides | manual */
    kind: text("kind").notNull(),
    target: numeric("target", { precision: 7, scale: 1, mode: "number" }).notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    /** For long_rides: a ride counts from this many hours. */
    minHours: numeric("min_hours", { precision: 4, scale: 1, mode: "number" }),
    /** For manual: how far along, kept by hand. */
    progress: smallint("progress").notNull().default(0),
    /** dcu | own — a DCU goal is the one Kadence proposed. */
    source: text("source").notNull().default("own"),
    note: text("note").notNull().default(""),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("rider_goals_rider_idx").on(t.orgId, t.riderId, t.endsOn),
    check(
      "rider_goals_kind",
      sql`${t.kind} in ('strength_sessions','bike_sessions','bike_hours','long_rides','manual')`,
    ),
    check("rider_goals_source", sql`${t.source} in ('dcu','own')`),
    check("rider_goals_target", sql`${t.target} > 0`),
    check("rider_goals_dates", sql`${t.endsOn} >= ${t.startsOn}`),
    check("rider_goals_progress", sql`${t.progress} >= 0`),
  ],
);

export type RiderGoalRow = typeof riderGoals.$inferSelect;

/**
 * A coach's "afklaret" on one guardrail flag for one week (ADR 0026). The
 * flag is never stored — it is computed from the rider's data on every
 * view (src/modules/load/guardrails.ts) — only the coach's decision that it
 * has been dealt with: the rider, the kind, the Monday of the week, the
 * most serious severity seen and the values of every flag of that kind at
 * the press, so a flag that comes back worse is shown again
 * (src/modules/load/resolved.ts). The week, the severity and the snapshot
 * are the server's, never the client's. Only a coach writes; a rider
 * cannot wave their own warning away. Read with the scope of the data
 * behind the flag: a resolution of a check-in flag is health data.
 */
export const flagResolutions = pgTable(
  "flag_resolutions",
  {
    id: domainId("id"),
    orgId: tenant(),
    riderId: text("rider_id")
      .notNull()
      .references(() => riders.id, { onDelete: "cascade" }),
    /** A FlagKind from src/modules/load/guardrails.ts. */
    kind: text("kind").notNull(),
    /** info | warn | alert — the most serious of the kind when resolved. */
    severity: text("severity").notNull(),
    /** The Monday of the week the flag was raised in. */
    weekMonday: date("week_monday").notNull(),
    /** The `values` of every flag of this kind that fired at the press. */
    seen: jsonb("seen").$type<Record<string, number | string>[]>().notNull().default([]),
    /** Reserved for a later UI; open reading for the rider and their guardians (ADR 0026). */
    note: text("note").notNull().default(""),
    resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("flag_resolutions_rider_kind_week_uq").on(t.riderId, t.kind, t.weekMonday),
    index("flag_resolutions_org_week_idx").on(t.orgId, t.weekMonday),
    check(
      "flag_resolutions_kind",
      sql`${t.kind} in ('hours_above_corridor','hours_below_corridor','ramp','longest_ride','strength_spacing','compliance','wellbeing_talk','wellbeing_help','pain','sleep_short','sleep_below_minimum','mid_zone')`,
    ),
    check("flag_resolutions_severity", sql`${t.severity} in ('info','warn','alert')`),
    check("flag_resolutions_monday", sql`extract(isodow from ${t.weekMonday}) = 1`),
  ],
);

export type FlagResolutionRow = typeof flagResolutions.$inferSelect;

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
    /**
     * A rider's own session (docs/adr/0050): null for the team's library.
     * The rider writes it; the coaches and, when the rider shares training,
     * the parents read it (drizzle/0021).
     */
    riderId: text("rider_id").references(() => riders.id, { onDelete: "cascade" }),
    /** The rider's session a coach took into the team's library, when it is a copy of one. */
    copiedFrom: text("copied_from").references((): AnyPgColumn => workoutTemplates.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    index("workout_templates_org_idx").on(t.orgId, t.sport),
    index("workout_templates_rider_idx").on(t.orgId, t.riderId),
    uniqueIndex("workout_templates_source_key_uq")
      .on(t.orgId, t.sourceKey)
      .where(sql`${t.sourceKey} is not null`),
    check("workout_templates_sport", sql`${t.sport} in ('bike','strength','other')`),
    check("workout_templates_source", sql`${t.source} in ('dcu','own')`),
    check("workout_templates_minutes", sql`${t.plannedMinutes} between 0 and 1440`),
  ],
);

/**
 * A training block (ADR 0025): a few weeks of sessions from the library,
 * laid out day by day, to be put into one or more riders' calendars from
 * a Monday. The team's, like its templates: everyone reads, coaches keep.
 */
export const trainingBlocks = pgTable(
  "training_blocks",
  {
    id: domainId("id"),
    orgId: tenant(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    weeks: smallint("weeks").notNull(),
    archived: boolean("archived").notNull().default(false),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("training_blocks_org_idx").on(t.orgId, t.archived),
    check("training_blocks_weeks", sql`${t.weeks} between 1 and 12`),
  ],
);

/**
 * One session of a block on a day (0 is the first Monday): a template from
 * the library, or a session built in the week planner and kept in the block
 * itself (docs/adr/0059), which carries its own sport, title and steps.
 */
export const trainingBlockItems = pgTable(
  "training_block_items",
  {
    id: domainId("id"),
    orgId: tenant(),
    blockId: text("block_id")
      .notNull()
      .references(() => trainingBlocks.id, { onDelete: "cascade" }),
    templateId: text("template_id").references(() => workoutTemplates.id, {
      onDelete: "cascade",
    }),
    /** bike | strength | other, for a session kept in the block. */
    sport: text("sport"),
    title: text("title"),
    description: text("description").notNull().default(""),
    structure: jsonb("structure"),
    plannedMinutes: smallint("planned_minutes"),
    startTime: time("start_time"),
    meetingPlace: text("meeting_place").notNull().default(""),
    day: smallint("day").notNull(),
    sort: smallint("sort").notNull().default(0),
  },
  (t) => [
    index("training_block_items_block_idx").on(t.orgId, t.blockId, t.day),
    check("training_block_items_day", sql`${t.day} between 0 and 83`),
    check(
      "training_block_items_session",
      sql`${t.templateId} is not null or (${t.sport} is not null and ${t.title} is not null and ${t.structure} is not null)`,
    ),
    check("training_block_items_meeting_place", sql`char_length(${t.meetingPlace}) <= 120`),
  ],
);

export type TrainingBlockRow = typeof trainingBlocks.$inferSelect;
export type TrainingBlockItemRow = typeof trainingBlockItems.$inferSelect;

export type TeamSettingsRow = typeof teamSettings.$inferSelect;
export type RiderRow = typeof riders.$inferSelect;
export type GuardianRow = typeof guardians.$inferSelect;
export type RiderMeasurementRow = typeof riderMeasurements.$inferSelect;
export type SeasonPlanRow = typeof seasonPlans.$inferSelect;
export type WorkoutTemplateRow = typeof workoutTemplates.$inferSelect;
