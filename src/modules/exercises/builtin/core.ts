import type { BuiltinExercise } from "../types";
import { SOURCES } from "./sources";

/** Core: stomach, back and the sides of the trunk, on a mat. */

/** On the forearms, the body straight. A hold, so no arrow. */
export const PLANK: BuiltinExercise = {
  id: "plank",
  group: "core",
  equipment: ["mat"],
  dose: { kind: "time", seconds: 30, perSide: false, sets: 3 },
  source: `${SOURCES.catalogue}; ${SOURCES.youthStrength}`,
  pose: {
    joints: {
      head: [53, 83],
      neck: [74, 91],
      hip: [117, 100],
      elbowA: [74, 118],
      handA: [48, 118],
      elbowB: [74, 118],
      handB: [48, 118],
      kneeA: [156, 109],
      footA: [194, 118],
      kneeB: [156, 109],
      footB: [194, 118],
    },
    hidden: ["armB", "legB"],
    props: [{ kind: "floor", y: 122 }],
    arrows: [],
  },
};

/**
 * Seen from the front: the lower forearm on the floor (the far arm, so
 * fainter), the top arm up, the arrow over the hip lifting it.
 */
export const SIDE_PLANK: BuiltinExercise = {
  id: "sidePlank",
  group: "core",
  equipment: ["mat"],
  dose: { kind: "time", seconds: 20, perSide: true, sets: 3 },
  source: `${SOURCES.catalogue}; the side bridge is ${SOURCES.mcGill}`,
  pose: {
    joints: {
      head: [56, 86],
      neck: [77, 91],
      hip: [120, 100],
      elbowA: [75, 64],
      handA: [72, 38],
      elbowB: [74, 118],
      handB: [59, 118],
      kneeA: [159, 109],
      footA: [197, 118],
      kneeB: [159, 109],
      footB: [197, 118],
    },
    hidden: ["legB"],
    props: [{ kind: "floor", y: 122 }],
    arrows: [{ from: [122, 90], to: [122, 68], bend: 0 }],
  },
};

/**
 * On the back: the near arm up and the far arm reaching back; the far leg
 * at 90/90 and the near leg reaching out, which the arrow follows.
 */
export const DEAD_BUG: BuiltinExercise = {
  id: "deadBug",
  group: "core",
  equipment: ["mat"],
  dose: { kind: "reps", reps: 10, perSide: false, sets: 3 },
  source: SOURCES.catalogue,
  pose: {
    joints: {
      head: [48, 110],
      neck: [70, 118],
      hip: [114, 118],
      elbowA: [71, 91],
      handA: [72, 65],
      elbowB: [50, 100],
      handB: [31, 83],
      kneeA: [153, 111],
      footA: [192, 104],
      kneeB: [114, 78],
      footB: [154, 78],
    },
    hidden: [],
    props: [{ kind: "floor", y: 122 }],
    arrows: [{ from: [162, 80], to: [196, 92], bend: -0.35 }],
  },
};

/** On all fours, the far arm forward and the near leg back. */
export const BIRD_DOG: BuiltinExercise = {
  id: "birdDog",
  group: "core",
  equipment: ["mat"],
  dose: { kind: "reps", reps: 10, perSide: false, sets: 3 },
  source: `${SOURCES.catalogue}; the bird dog is ${SOURCES.mcGill}`,
  pose: {
    joints: {
      head: [50, 75],
      neck: [70, 63],
      hip: [114, 77],
      elbowA: [70, 91],
      handA: [70, 118],
      elbowB: [42, 60],
      handB: [15, 57],
      kneeA: [155, 74],
      footA: [196, 71],
      kneeB: [114, 118],
      footB: [155, 118],
    },
    hidden: [],
    props: [{ kind: "floor", y: 122 }],
    arrows: [
      { from: [170, 57], to: [194, 57], bend: 0 },
      { from: [41, 43], to: [17, 43], bend: 0 },
    ],
  },
};

/** DCU's "faldskærm": on the stomach, arms and legs lifted a little. */
export const SUPERMAN: BuiltinExercise = {
  id: "superman",
  group: "core",
  equipment: ["mat"],
  dose: { kind: "reps", reps: 15, perSide: false, sets: 3 },
  source:
    'DCU\'s U17 strength programme, "Faldskærm – Ryg bøjning", 3 × 15–20 (DCU_U17_styrketraening.pdf; docs/research/dcu-traeningsanbefalinger.md, section 6.2); 15 is the low end, without weight',
  pose: {
    joints: {
      head: [65, 107],
      neck: [84, 111],
      hip: [128, 117],
      elbowA: [58, 103],
      handA: [34, 96],
      elbowB: [58, 103],
      handB: [34, 96],
      kneeA: [167, 113],
      footA: [207, 107],
      kneeB: [167, 113],
      footB: [207, 107],
    },
    hidden: ["armB", "legB"],
    props: [{ kind: "floor", y: 122 }],
    arrows: [
      { from: [40, 90], to: [40, 72], bend: 0 },
      { from: [201, 101], to: [201, 83], bend: 0 },
    ],
  },
};

export const CORE: readonly BuiltinExercise[] = [PLANK, SIDE_PLANK, DEAD_BUG, BIRD_DOG, SUPERMAN];
