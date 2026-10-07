import { z } from "zod";
import { EXERCISE_GROUPS } from "@/modules/workouts/structure";
import { exerciseRefSchema, type ExerciseRef } from "./ref";

/**
 * Exercises and programmes (docs/plan-ovelser-og-programmer.md): the shapes
 * shared by Kadence's own, which live in code (`./builtin`), and a team's
 * own, which live in the database (`team_exercises`, `team_programs`). One
 * renderer draws every exercise from its pose; one view shows every
 * programme; a programme mixes both kinds through `ExerciseRef`.
 *
 * Pure: imports nothing from the database.
 */

export { EXERCISE_GROUPS };
export type { ExerciseGroup } from "@/modules/workouts/structure";

/**
 * What an exercise needs besides a floor; "none" is the empty list. The
 * last four came with a club's strength room (backlog Ø-06): a barbell in
 * a rack, dumbbells, TRX straps and a bar for pull-ups. The database's
 * check lists the same (drizzle/0033).
 */
export const EQUIPMENT = [
  "mat",
  "wall",
  "bench",
  "step",
  "band",
  "kettlebell",
  "ball",
  "barbell",
  "dumbbell",
  "trx",
  "pullupBar",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

/**
 * The figure's box: x from 0 to 240, y from 0 to 140, y downwards, the
 * floor usually near y 122. A figure faces left or right as drawn.
 */
export const BOX = { width: 240, height: 140 } as const;

const coordinate = (max: number) => z.number().min(0).max(max);
export const pointSchema = z.tuple([coordinate(BOX.width), coordinate(BOX.height)]);
export type Point = z.infer<typeof pointSchema>;

/**
 * A stick figure's joints. The shoulders sit at the neck and the head is a
 * circle round `head`. "A" is the arm and leg nearest the viewer, "B" the
 * far ones, drawn a little fainter; a limb can be hidden behind the body.
 */
export const JOINTS = [
  "head",
  "neck",
  "hip",
  "elbowA",
  "handA",
  "elbowB",
  "handB",
  "kneeA",
  "footA",
  "kneeB",
  "footB",
] as const;
export type Joint = (typeof JOINTS)[number];
export const LIMBS = ["armA", "armB", "legA", "legB"] as const;
export type Limb = (typeof LIMBS)[number];

export const propSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("floor"), y: coordinate(BOX.height) }),
  z.object({ kind: z.literal("wall"), x: coordinate(BOX.width) }),
  z.object({ kind: z.literal("mat"), from: pointSchema, to: pointSchema }),
  z.object({
    kind: z.literal("bench"),
    at: pointSchema,
    width: z.number().min(10).max(200),
    height: z.number().min(5).max(100),
  }),
  z.object({ kind: z.literal("step"), at: pointSchema, width: z.number().min(10).max(120) }),
  z.object({ kind: z.literal("band"), from: pointSchema, to: pointSchema }),
  z.object({ kind: z.literal("ball"), at: pointSchema, radius: z.number().min(4).max(40) }),
  z.object({ kind: z.literal("kettlebell"), at: pointSchema }),
  /**
   * A barbell, a bar with a plate at each end, its middle at `at` where the
   * hands or the shoulders hold it; level unless `angle` turns it (degrees,
   * clockwise). Seen from the side, as most figures are, the bar comes
   * towards the reader and one plate shows as a disc at `at`; `view:
   * "front"` draws it across the figure with a plate at each end, for a
   * figure seen from the front.
   */
  z.object({
    kind: z.literal("barbell"),
    at: pointSchema,
    angle: z.number().min(-90).max(90).optional(),
    view: z.enum(["side", "front"]).optional(),
  }),
  /** A dumbbell held at its handle, `at`, level unless `angle` turns it (degrees, clockwise). */
  z.object({
    kind: z.literal("dumbbell"),
    at: pointSchema,
    angle: z.number().min(-90).max(90).optional(),
  }),
  /** TRX straps from where they hang, `anchor`, to the near and the far handle. */
  z.object({
    kind: z.literal("trx"),
    anchor: pointSchema,
    handleA: pointSchema,
    handleB: pointSchema,
  }),
  /** A bar for pull-ups, level, `width` wide, its middle at `at`. */
  z.object({ kind: z.literal("pullupBar"), at: pointSchema, width: z.number().min(20).max(220) }),
]);
export type Prop = z.infer<typeof propSchema>;

/** The movement or the push: an arrow from `from` to `to`, bent by `bend` (-1 to 1). */
export const arrowSchema = z.object({
  from: pointSchema,
  to: pointSchema,
  bend: z.number().min(-1).max(1).default(0),
});
export type Arrow = z.infer<typeof arrowSchema>;

export const poseSchema = z.object({
  joints: z.object(
    Object.fromEntries(JOINTS.map((j) => [j, pointSchema])) as Record<Joint, typeof pointSchema>,
  ),
  hidden: z.array(z.enum(LIMBS)).max(LIMBS.length).default([]),
  props: z.array(propSchema).max(6).default([]),
  arrows: z.array(arrowSchema).max(3).default([]),
});
export type Pose = z.infer<typeof poseSchema>;

/**
 * How heavy, in words rather than kilos, as DCU's programmes and ATK put
 * it: technique before load, and a weight the rider picks for the day.
 */
export const LOADS = ["light", "moderate", "heavy"] as const;
export type Load = (typeof LOADS)[number];

/** How much: for a time or a number of repetitions, per side or not, in sets, and how heavy. */
export const doseSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("time"),
    seconds: z.number().int().min(5).max(600),
    perSide: z.boolean().default(false),
    sets: z.number().int().min(1).max(10).default(1),
    load: z.enum(LOADS).optional(),
  }),
  z.object({
    kind: z.literal("reps"),
    reps: z.number().int().min(1).max(100),
    perSide: z.boolean().default(false),
    sets: z.number().int().min(1).max(10).default(1),
    load: z.enum(LOADS).optional(),
  }),
]);
export type Dose = z.infer<typeof doseSchema>;

/** Kadence's own exercise by its id, or a team's own by its row id (./ref.ts). */
export { exerciseRefSchema, type ExerciseRef };

/** The parts of a programme; a part's title comes from messages (`exercises.parts`). */
export const PART_KEYS = ["any", "morning", "midday", "evening", "before", "after"] as const;
export type PartKey = (typeof PART_KEYS)[number];

export const programItemSchema = z.object({
  exercise: exerciseRefSchema,
  /** The programme's own dose; the exercise's when absent. */
  dose: doseSchema.optional(),
});
export type ProgramItem = z.infer<typeof programItemSchema>;

export const programPartSchema = z.object({
  key: z.enum(PART_KEYS),
  items: z.array(programItemSchema).min(1).max(20),
});
export type ProgramPart = z.infer<typeof programPartSchema>;

export const programPartsSchema = z
  .array(programPartSchema)
  .min(1)
  .max(PART_KEYS.length)
  .refine((parts) => new Set(parts.map((p) => p.key)).size === parts.length, {
    message: "each part once",
  });

/** A team's own exercise as a coach writes it; Kadence's own carry message keys instead. */
export const teamExerciseInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  group: z.enum(EXERCISE_GROUPS),
  equipment: z.array(z.enum(EQUIPMENT)).max(EQUIPMENT.length).default([]),
  dose: doseSchema,
  how: z.string().trim().min(1).max(500),
  why: z.string().trim().max(300).default(""),
  pose: poseSchema,
});
export type TeamExerciseInput = z.infer<typeof teamExerciseInputSchema>;

/** A team's own programme as a coach writes it. */
export const teamProgramInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(300).default(""),
  parts: programPartsSchema,
});
export type TeamProgramInput = z.infer<typeof teamProgramInputSchema>;

/** Kadence's own exercise: its words are in messages, `exercises.items.<id>`. */
export type BuiltinExercise = {
  id: string;
  group: (typeof EXERCISE_GROUPS)[number];
  equipment: readonly Equipment[];
  dose: Dose;
  pose: Pose;
  /** Where the dose and the advice come from, for the reader and the next editor. */
  source: string;
};

/** Kadence's own programme: its name and description are in messages, `exercises.programs.<id>`. */
export type BuiltinProgram = {
  id: string;
  parts: ProgramPart[];
  source: string;
};

/** One exercise ready to show, whichever kind it is, in the reader's language. */
export type ExerciseView = {
  ref: ExerciseRef;
  name: string;
  how: string;
  why: string;
  group: (typeof EXERCISE_GROUPS)[number];
  equipment: readonly Equipment[];
  dose: Dose;
  pose: Pose;
};

/** One programme ready to show or download. */
export type ProgramView = {
  title: string;
  description: string;
  parts: Array<{ key: PartKey; items: Array<{ exercise: ExerciseView; dose: Dose }> }>;
};
