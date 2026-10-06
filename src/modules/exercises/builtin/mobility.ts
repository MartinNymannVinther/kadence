import type { BuiltinExercise } from "../types";
import { SOURCES } from "./sources";

/**
 * Mobility: the stretches and the slow movements, drawn side on. Poses
 * stand on a floor at y 122; a standing figure is drawn smaller than one
 * on the floor so it fits the box, with the same stroke and head.
 */

/**
 * Kneeling hip-flexor stretch: the shape every pose follows. Torso upright
 * over the back knee, the front thigh level, the hand on the hip, the
 * arrow pushing the hip forward. The stretched back leg is the near one.
 */
export const HIP_FLEXOR: BuiltinExercise = {
  id: "hipFlexor",
  group: "mobility",
  equipment: ["mat"],
  dose: { kind: "time", seconds: 30, perSide: true, sets: 1 },
  source: SOURCES.acsmStretch,
  pose: {
    joints: {
      head: [129, 26],
      neck: [129, 46],
      hip: [129, 86],
      elbowA: [146, 64],
      handA: [132, 82],
      elbowB: [146, 64],
      handB: [132, 82],
      kneeA: [146, 118],
      footA: [182, 118],
      kneeB: [93, 82],
      footB: [89, 118],
    },
    hidden: ["armB"],
    props: [{ kind: "floor", y: 122 }],
    arrows: [{ from: [163, 86], to: [141, 86], bend: 0 }],
  },
};

/** On all fours, the back rounded up; the arrow lifts it. */
export const CAT_COW: BuiltinExercise = {
  id: "catCow",
  group: "mobility",
  equipment: ["mat"],
  dose: { kind: "reps", reps: 10, perSide: false, sets: 1 },
  source: `${SOURCES.catalogue} (it suggests 2 × 10; one set is enough to get going); no source sets a dose for it`,
  pose: {
    joints: {
      head: [54, 79],
      neck: [70, 63],
      hip: [114, 77],
      elbowA: [70, 91],
      handA: [70, 118],
      elbowB: [70, 91],
      handB: [70, 118],
      kneeA: [114, 118],
      footA: [155, 118],
      kneeB: [114, 118],
      footB: [155, 118],
    },
    hidden: ["armB", "legB"],
    props: [{ kind: "floor", y: 122 }],
    arrows: [{ from: [92, 62], to: [92, 40], bend: 0 }],
  },
};

/** On the back, one leg raised and held; the arrow draws it towards the head. */
export const HAMSTRING_STRETCH: BuiltinExercise = {
  id: "hamstringStretch",
  group: "mobility",
  equipment: ["mat"],
  dose: { kind: "time", seconds: 30, perSide: true, sets: 1 },
  source: SOURCES.acsmStretch,
  pose: {
    joints: {
      head: [44, 110],
      neck: [66, 118],
      hip: [110, 118],
      elbowA: [89, 103],
      handA: [116, 85],
      elbowB: [89, 103],
      handB: [116, 85],
      kneeA: [117, 79],
      footA: [124, 40],
      kneeB: [150, 118],
      footB: [189, 118],
    },
    hidden: ["armB"],
    props: [{ kind: "floor", y: 122 }],
    arrows: [{ from: [148, 46], to: [116, 37], bend: -0.25 }],
  },
};

/**
 * Seated figure four: an ankle over the other knee, leaning forward. The
 * arms are hidden — drawn, they tangle with the legs at card size.
 */
export const FIGURE_FOUR: BuiltinExercise = {
  id: "figureFour",
  group: "mobility",
  equipment: ["bench"],
  dose: { kind: "time", seconds: 30, perSide: true, sets: 1 },
  source: SOURCES.acsmStretch,
  pose: {
    joints: {
      head: [121, 30],
      neck: [112, 46],
      hip: [96, 78],
      elbowA: [124, 58],
      handA: [126, 72],
      elbowB: [124, 58],
      handB: [126, 72],
      kneeA: [107, 66],
      footA: [131, 72],
      kneeB: [128, 79],
      footB: [129, 118],
    },
    hidden: ["armA", "armB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "bench", at: [58, 83], width: 46, height: 39 },
    ],
    arrows: [{ from: [131, 18], to: [147, 36], bend: -0.3 }],
  },
};

/** Hands on a wall, the back leg straight; the arrow keeps its heel down. */
export const CALF_STRETCH: BuiltinExercise = {
  id: "calfStretch",
  group: "mobility",
  equipment: ["wall"],
  dose: { kind: "time", seconds: 30, perSide: true, sets: 1 },
  source: SOURCES.acsmStretch,
  pose: {
    joints: {
      head: [139, 27],
      neck: [133, 41],
      hip: [120, 70],
      elbowA: [149, 32],
      handA: [166, 39],
      elbowB: [149, 32],
      handB: [166, 39],
      kneeA: [106, 94],
      footA: [92, 118],
      kneeB: [129, 96],
      footB: [146, 118],
    },
    hidden: ["armB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "wall", x: 170 },
    ],
    arrows: [{ from: [82, 88], to: [82, 108], bend: 0 }],
  },
};

/** Standing on one leg, a hand on the wall, the heel drawn to the buttock. */
export const QUAD_STRETCH: BuiltinExercise = {
  id: "quadStretch",
  group: "mobility",
  equipment: ["wall"],
  dose: { kind: "time", seconds: 30, perSide: true, sets: 1 },
  source: SOURCES.acsmStretch,
  pose: {
    joints: {
      head: [126, 16],
      neck: [127, 31],
      hip: [128, 62],
      elbowA: [136, 48],
      handA: [144, 66],
      elbowB: [112, 43],
      handB: [96, 35],
      kneeA: [135, 89],
      footA: [143, 64],
      kneeB: [128, 90],
      footB: [128, 118],
    },
    hidden: [],
    props: [
      { kind: "floor", y: 122 },
      { kind: "wall", x: 92 },
    ],
    arrows: [{ from: [156, 84], to: [153, 62], bend: 0.3 }],
  },
};

/** Kneeling, straight arms on a bench; the arrow lets the chest sink. */
export const THORACIC_OPENER: BuiltinExercise = {
  id: "thoracicOpener",
  group: "mobility",
  equipment: ["bench"],
  dose: { kind: "time", seconds: 30, perSide: false, sets: 2 },
  source: `Kadence's own suggestion, held like a static stretch: ${SOURCES.acsmStretch}`,
  pose: {
    joints: {
      head: [91, 92],
      neck: [111, 91],
      hip: [150, 83],
      elbowA: [89, 80],
      handA: [66, 75],
      elbowB: [89, 80],
      handB: [66, 75],
      kneeA: [156, 118],
      footA: [192, 118],
      kneeB: [156, 118],
      footB: [192, 118],
    },
    hidden: ["armB", "legB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "bench", at: [22, 77], width: 54, height: 45 },
    ],
    arrows: [{ from: [130, 57], to: [130, 77], bend: 0 }],
  },
};

/** Back to the wall, the chin drawn straight back; as in the reference drawing. */
export const CHIN_TUCK: BuiltinExercise = {
  id: "chinTuck",
  group: "mobility",
  equipment: ["wall"],
  dose: { kind: "reps", reps: 10, perSide: false, sets: 1 },
  source: "Kadence's own suggestion; no source in docs/research sets a dose for it",
  pose: {
    joints: {
      head: [142, 17],
      neck: [150, 31],
      hip: [150, 62],
      elbowA: [147, 50],
      handA: [145, 68],
      elbowB: [147, 50],
      handB: [145, 68],
      kneeA: [148, 90],
      footA: [147, 118],
      kneeB: [148, 90],
      footB: [147, 118],
    },
    hidden: ["armB", "legB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "wall", x: 156 },
    ],
    arrows: [{ from: [102, 17], to: [126, 17], bend: 0 }],
  },
};

export const MOBILITY: readonly BuiltinExercise[] = [
  HIP_FLEXOR,
  CAT_COW,
  HAMSTRING_STRETCH,
  FIGURE_FOUR,
  CALF_STRETCH,
  QUAD_STRETCH,
  THORACIC_OPENER,
  CHIN_TUCK,
];
