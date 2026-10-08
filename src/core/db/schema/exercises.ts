import { sql } from "drizzle-orm";
import { boolean, check, index, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { domainId, users } from "./foundation";
import { tenant, timestamps } from "./shared";

/**
 * A team's own exercises and programmes (docs/plan-ovelser-og-programmer.md),
 * beside Kadence's own, which live in code (src/modules/exercises/builtin).
 * The team's, like its library: every member reads, coaches keep, every
 * change is audited (drizzle/0032).
 *
 * The JSON columns hold the contract's shapes (src/modules/exercises/types.ts:
 * a dose, a pose, a programme's parts). The application validates them with
 * the contract's schemas on the way in and again on the way out; the
 * database only bounds their size and kind, so a wrong shape cannot grow
 * without limit even if it slipped past.
 *
 * Nothing is deleted: a coach archives, so a programme that names an
 * exercise keeps resolving it. The workspace's deletion and the demo's
 * expiry remove both tables through `org_id`'s cascade.
 */

/**
 * The lists in the checks below are EXERCISE_GROUPS and EQUIPMENT (the last
 * four since drizzle/0033); tests/exercises/team-schema proves they agree.
 */
export const teamExercises = pgTable(
  "team_exercises",
  {
    id: domainId("id"),
    orgId: tenant(),
    name: text("name").notNull(),
    /** One of EXERCISE_GROUPS. */
    group: text("group").notNull(),
    /** What the exercise needs besides a floor, from EQUIPMENT; empty for none. */
    equipment: text("equipment")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** A Dose: for a time or a number of repetitions. */
    dose: jsonb("dose").notNull(),
    how: text("how").notNull(),
    why: text("why").notNull().default(""),
    /** A Pose: the stick figure, its props and arrows, in the 240 × 140 box. */
    pose: jsonb("pose").notNull(),
    archived: boolean("archived").notNull().default(false),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("team_exercises_org_idx").on(t.orgId, t.archived),
    check("team_exercises_group", sql`${t.group} in ('legs','core','upper','mobility','other')`),
    check(
      "team_exercises_equipment",
      sql`${t.equipment} <@ array['mat','wall','bench','step','band','kettlebell','ball','barbell','dumbbell','trx','pullupBar']::text[]`,
    ),
    check("team_exercises_name", sql`char_length(${t.name}) between 1 and 60`),
    check("team_exercises_how", sql`char_length(${t.how}) between 1 and 500`),
    check("team_exercises_why", sql`char_length(${t.why}) <= 300`),
    check(
      "team_exercises_dose",
      sql`jsonb_typeof(${t.dose}) = 'object' and octet_length(${t.dose}::text) <= 1024`,
    ),
    check(
      "team_exercises_pose",
      sql`jsonb_typeof(${t.pose}) = 'object' and octet_length(${t.pose}::text) <= 8192`,
    ),
  ],
);

/**
 * A team's own programme: parts of the day, each a list of exercises —
 * Kadence's own (`builtin:<id>`) or the team's (`team:<uuid>`) — with a
 * dose of the programme's own where it differs from the exercise's.
 */
export const teamPrograms = pgTable(
  "team_programs",
  {
    id: domainId("id"),
    orgId: tenant(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    /** ProgramPart[]: `{ key, items: [{ exercise, dose? }] }`, each part once. */
    parts: jsonb("parts").notNull(),
    archived: boolean("archived").notNull().default(false),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("team_programs_org_idx").on(t.orgId, t.archived),
    check("team_programs_name", sql`char_length(${t.name}) between 1 and 60`),
    check("team_programs_description", sql`char_length(${t.description}) <= 300`),
    check(
      "team_programs_parts",
      sql`jsonb_typeof(${t.parts}) = 'array' and octet_length(${t.parts}::text) <= 32768`,
    ),
  ],
);

export type TeamExerciseRow = typeof teamExercises.$inferSelect;
export type TeamProgramRow = typeof teamPrograms.$inferSelect;
