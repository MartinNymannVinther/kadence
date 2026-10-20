import type { BuiltinExercise } from "../types";
import { SOURCES } from "./sources";

/**
 * Dumbbells and a kettlebell in the strength room (backlog Ø-06): one leg
 * at a time, the upper back, and the hip's quick push. A dumbbell is drawn
 * level in the hand that holds it; the far one, behind the body, is left
 * out as the far arm is.
 */

/** The lunge with a dumbbell in each hand, arms straight down. */
export const DUMBBELL_LUNGE: BuiltinExercise = {
  id: "dumbbellLunge",
  group: "legs",
  equipment: ["dumbbell"],
  dose: { kind: "reps", reps: 8, perSide: true, sets: 3, load: "moderate" },
  source: `The lunge is ${SOURCES.catalogue}; with dumbbells, one leg at a time as DCU's single-leg press trains it (Single leg leg press 00925, DCU_U19/U23_styrketraening.pdf p. 1), is Kadence's own; ${SOURCES.youthStrength}; ${SOURCES.freeWeights}`,
  pose: {
    joints: {
      head: [104, 43],
      neck: [105, 58],
      hip: [105, 89],
      elbowA: [107, 77],
      handA: [108, 95],
      elbowB: [107, 77],
      handB: [108, 95],
      kneeA: [77, 90],
      footA: [76, 118],
      kneeB: [113, 116],
      footB: [141, 118],
    },
    hidden: ["armB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "dumbbell", at: [108, 96] },
    ],
    arrows: [{ from: [131, 87], to: [131, 107], bend: 0 }],
  },
};

/** The step-up with a dumbbell in each hand; the arrow lifts the body onto the step. */
export const DUMBBELL_STEP_UP: BuiltinExercise = {
  id: "dumbbellStepUp",
  group: "legs",
  equipment: ["dumbbell", "step"],
  dose: { kind: "reps", reps: 8, perSide: true, sets: 3, load: "moderate" },
  source: `The step-up is ${SOURCES.catalogue}; with dumbbells is Kadence's own; ${SOURCES.youthStrength}; ${SOURCES.freeWeights}`,
  pose: {
    joints: {
      head: [101, 20],
      neck: [104, 35],
      hip: [108, 66],
      elbowA: [101, 54],
      handA: [99, 72],
      elbowB: [101, 54],
      handB: [99, 72],
      kneeA: [80, 66],
      footA: [78, 94],
      kneeB: [117, 93],
      footB: [128, 118],
    },
    hidden: ["armB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "step", at: [52, 98], width: 56 },
      { kind: "dumbbell", at: [99, 73] },
    ],
    arrows: [{ from: [140, 78], to: [140, 54], bend: 0 }],
  },
};

/** A knee and a hand on the bench, the other hand rowing the dumbbell up to the hip. */
export const DUMBBELL_ROW: BuiltinExercise = {
  id: "dumbbellRow",
  group: "upper",
  equipment: ["dumbbell", "bench"],
  dose: { kind: "reps", reps: 10, perSide: true, sets: 3, load: "moderate" },
  source: `Kadence's own for the upper back, as the row with a band in ${SOURCES.catalogue}; ${SOURCES.youthStrength}; ${SOURCES.freeWeights}`,
  pose: {
    joints: {
      head: [86, 43],
      neck: [101, 46],
      hip: [140, 54],
      elbowA: [123, 34],
      handA: [122, 58],
      elbowB: [100, 69],
      handB: [99, 90],
      kneeA: [154, 87],
      footA: [158, 118],
      kneeB: [140, 90],
      footB: [176, 90],
    },
    hidden: [],
    props: [
      { kind: "floor", y: 122 },
      { kind: "bench", at: [44, 93], width: 140, height: 29 },
      { kind: "dumbbell", at: [122, 59] },
    ],
    arrows: [{ from: [122, 88], to: [122, 70], bend: 0 }],
  },
};

/** Standing tall at the top of the swing, the bell at chest height; the arrow is its arc. */
export const KETTLEBELL_SWING: BuiltinExercise = {
  id: "kettlebellSwing",
  group: "legs",
  equipment: ["kettlebell"],
  dose: { kind: "reps", reps: 12, perSide: false, sets: 3, load: "moderate" },
  source: `Kadence's own for the hip's quick push, inside ${SOURCES.youthStrength}; ${SOURCES.freeWeights}`,
  pose: {
    joints: {
      head: [129, 17],
      neck: [131, 31],
      hip: [131, 62],
      elbowA: [113, 34],
      handA: [95, 37],
      elbowB: [113, 34],
      handB: [95, 37],
      kneeA: [130, 90],
      footA: [130, 118],
      kneeB: [130, 90],
      footB: [130, 118],
    },
    hidden: ["armB", "legB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "kettlebell", at: [94, 37] },
    ],
    arrows: [{ from: [118, 104], to: [84, 62], bend: -0.4 }],
  },
};

export const STRENGTH_WEIGHTS: readonly BuiltinExercise[] = [
  DUMBBELL_LUNGE,
  DUMBBELL_STEP_UP,
  DUMBBELL_ROW,
  KETTLEBELL_SWING,
];
