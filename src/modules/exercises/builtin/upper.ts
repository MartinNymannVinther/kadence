import type { BuiltinExercise } from "../types";
import { SOURCES } from "./sources";

/** Upper body: arms, shoulders and the upper back that hold a rider on the bars. */

/** Halfway down, elbows back along the body; the arrow presses up. */
export const PUSH_UP: BuiltinExercise = {
  id: "pushUp",
  group: "upper",
  equipment: [],
  dose: { kind: "reps", reps: 10, perSide: false, sets: 3 },
  source: `${SOURCES.catalogue}; ${SOURCES.youthStrength}`,
  pose: {
    joints: {
      head: [53, 67],
      neck: [74, 76],
      hip: [115, 91],
      elbowA: [88, 100],
      handA: [70, 118],
      elbowB: [88, 100],
      handB: [70, 118],
      kneeA: [153, 105],
      footA: [190, 118],
      kneeB: [153, 105],
      footB: [190, 118],
    },
    hidden: ["armB", "legB"],
    props: [{ kind: "floor", y: 122 }],
    arrows: [{ from: [96, 72], to: [96, 50], bend: 0 }],
  },
};

/** A band fixed at the wall, the elbows pulled back; the arrow follows the elbow. */
export const BAND_ROW: BuiltinExercise = {
  id: "bandRow",
  group: "upper",
  equipment: ["band"],
  dose: { kind: "reps", reps: 12, perSide: false, sets: 3 },
  source: `${SOURCES.catalogue}; ${SOURCES.youthStrength}`,
  pose: {
    joints: {
      head: [128, 16],
      neck: [130, 31],
      hip: [133, 62],
      elbowA: [145, 43],
      handA: [128, 49],
      elbowB: [145, 43],
      handB: [128, 49],
      kneeA: [129, 90],
      footA: [132, 118],
      kneeB: [129, 90],
      footB: [132, 118],
    },
    hidden: ["armB", "legB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "wall", x: 30 },
      { kind: "band", from: [32, 49], to: [128, 49] },
    ],
    arrows: [{ from: [151, 33], to: [171, 33], bend: 0 }],
  },
};

export const UPPER: readonly BuiltinExercise[] = [PUSH_UP, BAND_ROW];
