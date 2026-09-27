import { z } from "zod";

/**
 * What a session is made of, the one shape every part of Kadence shares:
 * the workout builder writes it, templates and planned sessions store it
 * (`structure` jsonb), the AI proposes it, the load model estimates from
 * it, and the exporters turn it into .zwo, .erg, .mrc and FIT workouts.
 *
 * Three kinds, one per sport:
 * - **bike**: steps with a duration and a target, and repeats of steps;
 * - **strength**: exercises in groups, and a progression that changes the
 *   sets and reps of a group by the session's number in the programme
 *   (DCU's programmes go 3×16, then 3×12, then 4×6–8 RM for the legs);
 * - **other**: words, for running, cross-country skiing, a swim.
 *
 * Pure: imports nothing from the database.
 */

/**
 * Kadence's own seven zones. Not DCU's: DCU's heart-rate-reserve bands are
 * kept beside them as reference (ADR 0015).
 * They follow the bands of threshold power and threshold heart rate in
 * wide use among cycling coaches, so a coach who thinks in another model
 * can still read them; a session may also say watts, pulse or RPE
 * directly. Low and high are percent of threshold, inclusive, and the
 * exporters and the load model read them from here and nowhere else.
 */
export const ZONES = [1, 2, 3, 4, 5, 6, 7] as const;
export type Zone = (typeof ZONES)[number];

export const ZONE_FTP_PCT: Record<Zone, { low: number; high: number }> = {
  1: { low: 0, high: 55 },
  2: { low: 56, high: 75 },
  3: { low: 76, high: 90 },
  4: { low: 91, high: 105 },
  5: { low: 106, high: 120 },
  6: { low: 121, high: 150 },
  7: { low: 151, high: 250 },
};

/**
 * The one power a zone is ridden at when a single number is needed: what
 * a trainer in ERG mode holds, and what the load model estimates a
 * planned step from. The middle of each band, except where the middle
 * would not be riding: zone 1 is held at 50 % (easy spinning, not 27 %),
 * and zone 7, open-ended above 150 %, at 160 %.
 */
export const ZONE_FTP_RIDE: Record<Zone, number> = {
  1: 50,
  2: 65,
  3: 83,
  4: 98,
  5: 113,
  6: 135,
  7: 160,
};

export const ZONE_HR_PCT: Record<Zone, { low: number; high: number }> = {
  1: { low: 0, high: 80 },
  2: { low: 81, high: 89 },
  3: { low: 90, high: 93 },
  4: { low: 94, high: 99 },
  5: { low: 100, high: 102 },
  6: { low: 103, high: 106 },
  7: { low: 107, high: 130 },
};

export const targetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("zone"), zone: z.number().int().min(1).max(7) }),
  /** Share of the rider's threshold power (FTP), in percent. */
  z.object({
    kind: z.literal("ftp_pct"),
    low: z.number().int().min(0).max(300),
    high: z.number().int().min(0).max(300),
  }),
  /** Share of the rider's threshold heart rate, in percent. */
  z.object({
    kind: z.literal("hr_pct"),
    low: z.number().int().min(0).max(130),
    high: z.number().int().min(0).max(130),
  }),
  /** How hard it should feel, 1–10. */
  z.object({ kind: z.literal("rpe"), value: z.number().int().min(1).max(10) }),
  /** No target: ride as you feel, or all out. */
  z.object({ kind: z.literal("open") }),
]);
export type Target = z.infer<typeof targetSchema>;

export const INTENTS = ["warmup", "work", "recover", "cooldown", "steady"] as const;
export type Intent = (typeof INTENTS)[number];

export const stepSchema = z.object({
  kind: z.literal("step"),
  intent: z.enum(INTENTS),
  seconds: z
    .number()
    .int()
    .min(1)
    .max(12 * 3600),
  target: targetSchema,
  cadenceLow: z.number().int().min(30).max(200).optional(),
  cadenceHigh: z.number().int().min(30).max(200).optional(),
  label: z.string().max(80).optional(),
});
export type Step = z.infer<typeof stepSchema>;

export const repeatSchema = z.object({
  kind: z.literal("repeat"),
  times: z.number().int().min(1).max(50),
  steps: z.array(stepSchema).min(1).max(20),
});
export type Repeat = z.infer<typeof repeatSchema>;

export const bikeStructureSchema = z.object({
  kind: z.literal("bike"),
  steps: z.array(z.union([stepSchema, repeatSchema])).max(60),
});
export type BikeStructure = z.infer<typeof bikeStructureSchema>;

export const EXERCISE_GROUPS = ["legs", "core", "upper", "mobility", "other"] as const;
export type ExerciseGroup = (typeof EXERCISE_GROUPS)[number];

export const exerciseSchema = z.object({
  name: z.string().min(1).max(80),
  group: z.enum(EXERCISE_GROUPS),
  sets: z.number().int().min(1).max(10),
  /** "12", "6-8", "15-20", "30 s" — as a coach writes it. */
  reps: z.string().min(1).max(20),
  /** "RM" when the reps are a repetition maximum, or a weight, or empty. */
  load: z.string().max(40).default(""),
  restSeconds: z.number().int().min(0).max(900).optional(),
  note: z.string().max(300).default(""),
});
export type Exercise = z.infer<typeof exerciseSchema>;

/** From session `from` to session `to` (inclusive, open-ended when null), a group is done so. */
export const progressionRuleSchema = z.object({
  group: z.enum(EXERCISE_GROUPS),
  from: z.number().int().min(1).max(200),
  to: z.number().int().min(1).max(200).nullable(),
  sets: z.number().int().min(1).max(10),
  reps: z.string().min(1).max(20),
  load: z.string().max(40).default(""),
});
export type ProgressionRule = z.infer<typeof progressionRuleSchema>;

export const strengthStructureSchema = z.object({
  kind: z.literal("strength"),
  warmup: z.string().max(500).default(""),
  exercises: z.array(exerciseSchema).max(30),
  progression: z.array(progressionRuleSchema).max(30).default([]),
  /** Minutes one session takes, for the calendar and for session RPE. */
  minutes: z.number().int().min(0).max(300).default(60),
});
export type StrengthStructure = z.infer<typeof strengthStructureSchema>;

export const otherStructureSchema = z.object({
  kind: z.literal("other"),
  text: z.string().max(2000).default(""),
  minutes: z.number().int().min(0).max(1440).default(0),
});
export type OtherStructure = z.infer<typeof otherStructureSchema>;

export const structureSchema = z.discriminatedUnion("kind", [
  bikeStructureSchema,
  strengthStructureSchema,
  otherStructureSchema,
]);
export type Structure = z.infer<typeof structureSchema>;

/**
 * Reads a stored structure. Rows written before a kind existed (the
 * column's default is `{"steps": []}`) read as an empty bike session;
 * anything that does not parse reads as an empty structure of the sport
 * rather than failing the page it is on.
 */
export function readStructure(value: unknown, sport: "bike" | "strength" | "other"): Structure {
  const candidate =
    value && typeof value === "object" && !("kind" in value) ? { kind: sport, ...value } : value;
  const parsed = structureSchema.safeParse(candidate);
  if (parsed.success && parsed.data.kind === sport) return parsed.data;
  if (sport === "bike") return { kind: "bike", steps: [] };
  if (sport === "strength")
    return { kind: "strength", warmup: "", exercises: [], progression: [], minutes: 60 };
  return { kind: "other", text: "", minutes: 0 };
}

/** The steps in riding order, repeats unrolled. */
export function flattenSteps(structure: BikeStructure): Step[] {
  const out: Step[] = [];
  for (const item of structure.steps) {
    if (item.kind === "step") out.push(item);
    else for (let i = 0; i < item.times; i++) out.push(...item.steps);
  }
  return out;
}

/** How long a session takes, in whole minutes. */
export function structureMinutes(structure: Structure): number {
  if (structure.kind === "bike")
    return Math.round(flattenSteps(structure).reduce((sum, s) => sum + s.seconds, 0) / 60);
  return structure.minutes;
}

/**
 * The exercises as they are done in session `n` of a programme: each
 * exercise takes the sets, reps and load of the rule for its group that
 * covers `n`, and keeps its own when no rule does.
 */
export function resolveStrengthSession(structure: StrengthStructure, n: number): Exercise[] {
  return structure.exercises.map((exercise) => {
    const rule = structure.progression.find(
      (r) => r.group === exercise.group && n >= r.from && (r.to === null || n <= r.to),
    );
    return rule ? { ...exercise, sets: rule.sets, reps: rule.reps, load: rule.load } : exercise;
  });
}
