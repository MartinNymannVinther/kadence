import type { BuiltinExercise } from "../types";
import { SOURCES } from "./sources";

/** Legs: the pedalling muscles, with body weight, a step, a bench or a kettlebell. */

/** Down and back, arms forward; the arrow is the push up (DCU: full effort up). */
export const SQUAT: BuiltinExercise = {
  id: "squat",
  group: "legs",
  equipment: [],
  dose: { kind: "reps", reps: 15, perSide: false, sets: 3 },
  source: `The squat and its cues (straight back, knees in line with the feet, feet shoulder-width apart) are DCU's warm-up, 1 × 20 at a low load (DCU_U17_styrketraening.pdf); 3 × 15 with body weight is Kadence's own; ${SOURCES.youthStrength}`,
  pose: {
    joints: {
      head: [112, 49],
      neck: [118, 64],
      hip: [137, 88],
      elbowA: [99, 63],
      handA: [81, 63],
      elbowB: [99, 63],
      handB: [81, 63],
      kneeA: [110, 92],
      footA: [120, 118],
      kneeB: [110, 92],
      footB: [120, 118],
    },
    hidden: ["armB", "legB"],
    props: [{ kind: "floor", y: 122 }],
    arrows: [{ from: [153, 94], to: [153, 70], bend: 0 }],
  },
};

/** The squat with a kettlebell held at the chest. */
export const GOBLET_SQUAT: BuiltinExercise = {
  id: "gobletSquat",
  group: "legs",
  equipment: ["kettlebell"],
  dose: { kind: "reps", reps: 10, perSide: false, sets: 3 },
  source: `${SOURCES.catalogue}; ${SOURCES.youthStrength}`,
  pose: {
    joints: {
      head: [112, 49],
      neck: [118, 64],
      hip: [137, 88],
      elbowA: [117, 83],
      handA: [102, 73],
      elbowB: [117, 83],
      handB: [102, 73],
      kneeA: [110, 92],
      footA: [120, 118],
      kneeB: [110, 92],
      footB: [120, 118],
    },
    hidden: ["armB", "legB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "kettlebell", at: [101, 73] },
    ],
    arrows: [{ from: [153, 94], to: [153, 70], bend: 0 }],
  },
};

/** On the back, the hips lifted until shoulders, hips and knees are in line. */
export const GLUTE_BRIDGE: BuiltinExercise = {
  id: "gluteBridge",
  group: "legs",
  equipment: ["mat"],
  dose: { kind: "reps", reps: 12, perSide: false, sets: 3 },
  source: `${SOURCES.catalogue}; ${SOURCES.youthStrength}`,
  pose: {
    joints: {
      head: [48, 110],
      neck: [70, 118],
      hip: [109, 98],
      elbowA: [97, 118],
      handA: [123, 118],
      elbowB: [97, 118],
      handB: [123, 118],
      kneeA: [144, 80],
      footA: [150, 118],
      kneeB: [144, 80],
      footB: [150, 118],
    },
    hidden: ["armB", "legB"],
    props: [{ kind: "floor", y: 122 }],
    arrows: [{ from: [109, 90], to: [109, 70], bend: 0 }],
  },
};

/** A long step forward, the back knee towards the floor. */
export const LUNGE: BuiltinExercise = {
  id: "lunge",
  group: "legs",
  equipment: [],
  dose: { kind: "reps", reps: 10, perSide: true, sets: 3 },
  source: `${SOURCES.catalogue}; ${SOURCES.youthStrength}`,
  pose: {
    joints: {
      head: [104, 43],
      neck: [105, 58],
      hip: [105, 89],
      elbowA: [119, 72],
      handA: [107, 85],
      elbowB: [119, 72],
      handB: [107, 85],
      kneeA: [77, 90],
      footA: [76, 118],
      kneeB: [113, 116],
      footB: [141, 118],
    },
    hidden: ["armB"],
    props: [{ kind: "floor", y: 122 }],
    arrows: [{ from: [131, 87], to: [131, 107], bend: 0 }],
  },
};

/** The near foot on a step, the arrow lifting the body onto it. */
export const STEP_UP: BuiltinExercise = {
  id: "stepUp",
  group: "legs",
  equipment: ["step"],
  dose: { kind: "reps", reps: 10, perSide: true, sets: 3 },
  source: `${SOURCES.catalogue}; ${SOURCES.youthStrength}`,
  pose: {
    joints: {
      head: [101, 20],
      neck: [104, 35],
      hip: [108, 66],
      elbowA: [110, 53],
      handA: [104, 70],
      elbowB: [94, 52],
      handB: [100, 69],
      kneeA: [80, 66],
      footA: [78, 94],
      kneeB: [117, 93],
      footB: [128, 118],
    },
    hidden: [],
    props: [
      { kind: "floor", y: 122 },
      { kind: "step", at: [52, 98], width: 56 },
    ],
    arrows: [{ from: [134, 78], to: [134, 54], bend: 0 }],
  },
};

/** The far foot on a bench behind, low on the front leg. */
export const SPLIT_SQUAT: BuiltinExercise = {
  id: "splitSquat",
  group: "legs",
  equipment: ["bench"],
  dose: { kind: "reps", reps: 8, perSide: true, sets: 3 },
  source: `${SOURCES.catalogue}; Kadence's way, without machines, to the single-leg press of DCU's U19 and U23 programmes; ${SOURCES.youthStrength}`,
  pose: {
    joints: {
      head: [95, 45],
      neck: [97, 61],
      hip: [99, 91],
      elbowA: [111, 73],
      handA: [101, 87],
      elbowB: [111, 73],
      handB: [101, 87],
      kneeA: [71, 91],
      footA: [66, 118],
      kneeB: [110, 117],
      footB: [134, 102],
    },
    hidden: ["armB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "bench", at: [120, 106], width: 56, height: 16 },
    ],
    arrows: [{ from: [133, 87], to: [133, 63], bend: 0 }],
  },
};

/** A hinge at the hip, the kettlebell hanging from straight arms; the arrow brings the hip through. */
export const ROMANIAN_DEADLIFT: BuiltinExercise = {
  id: "romanianDeadlift",
  group: "legs",
  equipment: ["kettlebell"],
  dose: { kind: "reps", reps: 10, perSide: false, sets: 3 },
  source: `${SOURCES.catalogue}; ${SOURCES.youthStrength}`,
  pose: {
    joints: {
      head: [79, 45],
      neck: [94, 51],
      hip: [121, 66],
      elbowA: [93, 70],
      handA: [93, 88],
      elbowB: [93, 70],
      handB: [93, 88],
      kneeA: [108, 90],
      footA: [112, 118],
      kneeB: [108, 90],
      footB: [112, 118],
    },
    hidden: ["armB", "legB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "kettlebell", at: [93, 90] },
    ],
    arrows: [{ from: [147, 62], to: [129, 50], bend: 0.2 }],
  },
};

/** On a step with a hand on the wall, rising onto the toes. */
export const CALF_RAISE: BuiltinExercise = {
  id: "calfRaise",
  group: "legs",
  equipment: ["step", "wall"],
  dose: { kind: "reps", reps: 15, perSide: false, sets: 3 },
  source:
    "DCU's U17 strength programme has the calf raise (\"Læg strækning\"): straight legs, rise onto the toes and lower slowly (DCU_U17_styrketraening.pdf; docs/research/dcu-traeningsanbefalinger.md, section 6.2); 3 × 15 with body weight is Kadence's own",
  pose: {
    joints: {
      head: [119, 15],
      neck: [120, 28],
      hip: [120, 55],
      elbowA: [104, 31],
      handA: [88, 34],
      elbowB: [104, 31],
      handB: [88, 34],
      kneeA: [120, 80],
      footA: [120, 104],
      kneeB: [120, 80],
      footB: [120, 104],
    },
    hidden: ["armB", "legB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "wall", x: 84 },
      { kind: "step", at: [104, 108], width: 40 },
    ],
    arrows: [{ from: [136, 102], to: [136, 80], bend: 0 }],
  },
};

/**
 * A jump from a quarter squat, arms swung back; the arrow is the jump.
 * For the bones (docs/adr/0092): road cycling builds little bone, and
 * jumps are one way to add load (Olmedillas et al. 2012, BMC Med 10:168;
 * Hinton et al. 2015, Bone 79:203–212, up to 100 jumps a session in men
 * with low bone mass).
 */
export const SQUAT_JUMP: BuiltinExercise = {
  id: "squatJump",
  group: "legs",
  equipment: [],
  dose: { kind: "reps", reps: 6, perSide: false, sets: 3 },
  source:
    "Jumps for bone: Olmedillas et al. 2012, BMC Med 10:168 (cycling alone does not build bone; add osteogenic training); Hinton et al. 2015, Bone 79:203–212 (jumping raised bone density in men with low bone mass); 3 × 6 soft jumps is Kadence's own",
  pose: {
    joints: {
      head: [106, 42],
      neck: [114, 55],
      hip: [137, 82],
      elbowA: [133, 70],
      handA: [150, 79],
      elbowB: [133, 70],
      handB: [150, 79],
      kneeA: [113, 97],
      footA: [124, 118],
      kneeB: [113, 97],
      footB: [124, 118],
    },
    hidden: ["armB", "legB"],
    props: [{ kind: "floor", y: 122 }],
    arrows: [{ from: [84, 80], to: [84, 30], bend: 0 }],
  },
};

export const LEGS: readonly BuiltinExercise[] = [
  SQUAT,
  GOBLET_SQUAT,
  GLUTE_BRIDGE,
  LUNGE,
  STEP_UP,
  SPLIT_SQUAT,
  ROMANIAN_DEADLIFT,
  CALF_RAISE,
  SQUAT_JUMP,
];
