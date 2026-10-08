import type { BuiltinExercise } from "../types";
import { SOURCES } from "./sources";

/**
 * The strength room with a barbell in a rack (backlog Ø-06). The figures
 * are seen from the side, so the bar points at the reader and shows as
 * the near plate's disc — on the upper back, in the hands or over the
 * chest; the overhead press is seen from the front so both arms show,
 * and there the bar is drawn across with a plate at each end. The load is a word, not kilos; every how-to starts light and has
 * a coach watching (`SOURCES.freeWeights`).
 */

/** Low in the squat with the bar on the upper back; the arrow is the push up. */
export const BACK_SQUAT: BuiltinExercise = {
  id: "backSquat",
  group: "legs",
  equipment: ["barbell"],
  dose: { kind: "reps", reps: 10, perSide: false, sets: 3, load: "moderate" },
  source: `${SOURCES.dcuSquat}; 3 × 10 at a moderate load is Kadence's own, inside ${SOURCES.youthStrength}; ${SOURCES.freeWeights}`,
  pose: {
    joints: {
      head: [112, 49],
      neck: [118, 64],
      hip: [137, 88],
      elbowA: [133, 79],
      handA: [123, 66],
      elbowB: [133, 79],
      handB: [123, 66],
      kneeA: [110, 92],
      footA: [120, 118],
      kneeB: [110, 92],
      footB: [120, 118],
    },
    hidden: ["armB", "legB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "barbell", at: [124, 66] },
    ],
    arrows: [{ from: [176, 96], to: [176, 72], bend: 0 }],
  },
};

/** Hips back and the bar over the middle of the foot; the arrow lifts it along the shins. */
export const DEADLIFT: BuiltinExercise = {
  id: "deadlift",
  group: "legs",
  equipment: ["barbell"],
  dose: { kind: "reps", reps: 8, perSide: false, sets: 3, load: "moderate" },
  source: `Not in DCU's programmes; Kadence's own, with DCU's cues for the back and knees from the squat (Deep back squat 03553, DCU_U17_styrketraening.pdf p. 1); ${SOURCES.youthStrength}; ${SOURCES.freeWeights}`,
  pose: {
    joints: {
      head: [97, 56],
      neck: [109, 67],
      hip: [132, 88],
      elbowA: [111, 87],
      handA: [114, 107],
      elbowB: [111, 87],
      handB: [114, 107],
      kneeA: [106, 94],
      footA: [120, 118],
      kneeB: [106, 94],
      footB: [120, 118],
    },
    hidden: ["armB", "legB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "barbell", at: [114, 107] },
    ],
    arrows: [{ from: [58, 106], to: [58, 82], bend: 0 }],
  },
};

/** A hinge at the hip, the bar in straight arms by the knees; the arrow brings the hip through. */
export const BARBELL_RDL: BuiltinExercise = {
  id: "barbellRdl",
  group: "legs",
  equipment: ["barbell"],
  dose: { kind: "reps", reps: 10, perSide: false, sets: 3, load: "moderate" },
  source: `Kadence's way, with a free weight, to the back of the thigh that DCU trains with the leg curl (Leg curl 03149, DCU_U17/U19_styrketraening.pdf p. 1); ${SOURCES.youthStrength}; ${SOURCES.freeWeights}`,
  pose: {
    joints: {
      head: [79, 45],
      neck: [94, 51],
      hip: [121, 66],
      elbowA: [94, 70],
      handA: [95, 89],
      elbowB: [94, 70],
      handB: [95, 89],
      kneeA: [108, 90],
      footA: [112, 118],
      kneeB: [108, 90],
      footB: [112, 118],
    },
    hidden: ["armB", "legB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "barbell", at: [96, 89] },
    ],
    arrows: [{ from: [147, 62], to: [129, 50], bend: 0.2 }],
  },
};

/** From the front, the bar pressed up over the head in both hands; the arrow follows it. */
export const OVERHEAD_PRESS: BuiltinExercise = {
  id: "overheadPress",
  group: "upper",
  equipment: ["barbell"],
  dose: { kind: "reps", reps: 8, perSide: false, sets: 3, load: "light" },
  source: `Not in DCU's programmes; Kadence's own for the shoulders and arms, inside ${SOURCES.youthStrength}; ${SOURCES.freeWeights}`,
  pose: {
    joints: {
      head: [120, 29],
      neck: [120, 43],
      hip: [120, 71],
      elbowA: [106, 30],
      handA: [101, 15],
      elbowB: [134, 30],
      handB: [139, 15],
      kneeA: [116, 95],
      footA: [114, 118],
      kneeB: [124, 95],
      footB: [126, 118],
    },
    hidden: [],
    props: [
      { kind: "floor", y: 122 },
      { kind: "barbell", at: [120, 15], view: "front" },
    ],
    arrows: [{ from: [176, 44], to: [176, 20], bend: 0 }],
  },
};

/** On the back on a bench, the bar over the chest; the arrow presses it up. */
export const BENCH_PRESS: BuiltinExercise = {
  id: "benchPress",
  group: "upper",
  equipment: ["barbell", "bench"],
  dose: { kind: "reps", reps: 8, perSide: false, sets: 3, load: "moderate" },
  source: `Not in DCU's programmes; Kadence's own for the chest, shoulders and arms, inside ${SOURCES.youthStrength}; ${SOURCES.freeWeights}; the coach at the head end, ready to take the bar, is Kadence's own advice`,
  pose: {
    joints: {
      head: [44, 78],
      neck: [64, 81],
      hip: [108, 81],
      elbowA: [72, 56],
      handA: [72, 30],
      elbowB: [72, 56],
      handB: [72, 30],
      kneeA: [146, 81],
      footA: [152, 118],
      kneeB: [146, 81],
      footB: [152, 118],
    },
    hidden: ["armB", "legB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "bench", at: [30, 85], width: 100, height: 37 },
      { kind: "barbell", at: [72, 29] },
    ],
    arrows: [{ from: [120, 56], to: [120, 32], bend: 0 }],
  },
};

export const STRENGTH: readonly BuiltinExercise[] = [
  BACK_SQUAT,
  DEADLIFT,
  BARBELL_RDL,
  OVERHEAD_PRESS,
  BENCH_PRESS,
];
