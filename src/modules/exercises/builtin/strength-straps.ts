import type { BuiltinExercise } from "../types";
import { SOURCES } from "./sources";

/**
 * TRX straps, a bar for pull-ups and elastic bands in the strength room
 * (backlog Ø-06): the rider's own weight, and the small muscles round the
 * hip and the shoulder. The straps hang from above; the pull-up bar and a
 * band held in both hands are seen from the front, as the side plank is.
 */

/** Leaning back with straight arms and a straight body; the arrow draws the chest towards the handles. */
export const TRX_ROW: BuiltinExercise = {
  id: "trxRow",
  group: "upper",
  equipment: ["trx"],
  dose: { kind: "reps", reps: 10, perSide: false, sets: 3 },
  source: `Kadence's own for the upper back with the rider's own weight, as the row with a band in ${SOURCES.catalogue}; ${SOURCES.youthStrength}`,
  pose: {
    joints: {
      head: [165, 45],
      neck: [154, 56],
      hip: [132, 78],
      elbowA: [137, 48],
      handA: [120, 41],
      elbowB: [137, 48],
      handB: [120, 41],
      kneeA: [112, 98],
      footA: [92, 118],
      kneeB: [112, 98],
      footB: [92, 118],
    },
    hidden: ["armB", "legB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "trx", anchor: [52, 12], handleA: [119, 41], handleB: [119, 41] },
    ],
    arrows: [{ from: [152, 30], to: [126, 19], bend: 0 }],
  },
};

/** The back foot in the straps behind, low on the front leg. */
export const TRX_SPLIT_SQUAT: BuiltinExercise = {
  id: "trxSplitSquat",
  group: "legs",
  equipment: ["trx"],
  dose: { kind: "reps", reps: 8, perSide: true, sets: 3 },
  source: `As the split squat on a bench (${SOURCES.catalogue}), one leg at a time as DCU's single-leg press trains it (Single leg leg press 00925, DCU_U19/U23_styrketraening.pdf p. 1); in the straps is Kadence's own; ${SOURCES.youthStrength}`,
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
      kneeB: [114, 113],
      footB: [140, 100],
    },
    hidden: ["armB"],
    props: [
      { kind: "floor", y: 122 },
      { kind: "trx", anchor: [150, 12], handleA: [141, 99], handleB: [141, 99] },
    ],
    arrows: [{ from: [124, 88], to: [124, 64], bend: 0 }],
  },
};

/** From the front, hanging from the bar with the elbows bent; the arrow lifts the body. */
export const PULL_UP: BuiltinExercise = {
  id: "pullUp",
  group: "upper",
  equipment: ["pullupBar"],
  dose: { kind: "reps", reps: 5, perSide: false, sets: 3 },
  source: `Kadence's own for the back and arms with the rider's own weight; 3 × 5 is a start below the 6–15 of ${SOURCES.youthStrength}, since a full pull-up is heavy for many — the band-assisted one is the way there`,
  pose: {
    joints: {
      head: [120, 28],
      neck: [120, 42],
      hip: [120, 73],
      elbowA: [100, 34],
      handA: [96, 14],
      elbowB: [140, 34],
      handB: [144, 14],
      kneeA: [114, 99],
      footA: [112, 124],
      kneeB: [126, 99],
      footB: [128, 124],
    },
    hidden: [],
    props: [{ kind: "pullupBar", at: [120, 13], width: 96 }],
    arrows: [{ from: [158, 78], to: [158, 54], bend: 0 }],
  },
};

/** The pull-up standing in a band looped over the bar, which takes some of the weight. */
export const BAND_PULL_UP: BuiltinExercise = {
  id: "bandPullUp",
  group: "upper",
  equipment: ["pullupBar", "band"],
  dose: { kind: "reps", reps: 6, perSide: false, sets: 3 },
  source: `Kadence's own: the pull-up with help, so the whole movement is trained; ${SOURCES.youthStrength}`,
  pose: {
    joints: {
      head: [120, 28],
      neck: [120, 42],
      hip: [120, 73],
      elbowA: [100, 34],
      handA: [96, 14],
      elbowB: [140, 34],
      handB: [144, 14],
      kneeA: [114, 99],
      footA: [112, 124],
      kneeB: [126, 99],
      footB: [128, 124],
    },
    hidden: [],
    props: [
      { kind: "pullupBar", at: [120, 13], width: 96 },
      { kind: "band", from: [107, 15], to: [108, 128] },
      { kind: "band", from: [133, 15], to: [132, 128] },
      { kind: "band", from: [108, 128], to: [132, 128] },
    ],
    arrows: [{ from: [158, 78], to: [158, 54], bend: 0 }],
  },
};

/** From the front, low in the hips with a band above the knees; the arrow is the step aside. */
export const MONSTER_WALK: BuiltinExercise = {
  id: "monsterWalk",
  group: "legs",
  equipment: ["band"],
  dose: { kind: "reps", reps: 10, perSide: true, sets: 3, load: "light" },
  source: `Kadence's own for the side of the hip, with a band; ${SOURCES.youthStrength}`,
  pose: {
    joints: {
      head: [120, 24],
      neck: [120, 39],
      hip: [120, 70],
      elbowA: [104, 54],
      handA: [112, 68],
      elbowB: [136, 54],
      handB: [128, 68],
      kneeA: [102, 94],
      footA: [98, 118],
      kneeB: [138, 94],
      footB: [142, 118],
    },
    hidden: [],
    props: [
      { kind: "floor", y: 122 },
      { kind: "band", from: [107, 87], to: [133, 87] },
    ],
    arrows: [{ from: [158, 104], to: [186, 104], bend: 0 }],
  },
};

/** From the front, elbows at the sides and a band between the hands; the arrows open them. */
export const BAND_EXTERNAL_ROTATION: BuiltinExercise = {
  id: "bandExternalRotation",
  group: "upper",
  equipment: ["band"],
  dose: { kind: "reps", reps: 12, perSide: false, sets: 3, load: "light" },
  source: `Kadence's own for the back of the shoulder, with a band; ${SOURCES.youthStrength}`,
  pose: {
    joints: {
      head: [120, 22],
      neck: [120, 37],
      hip: [120, 68],
      elbowA: [112, 58],
      handA: [97, 44],
      elbowB: [128, 58],
      handB: [143, 44],
      kneeA: [116, 94],
      footA: [114, 118],
      kneeB: [124, 94],
      footB: [126, 118],
    },
    hidden: [],
    props: [
      { kind: "floor", y: 122 },
      { kind: "band", from: [97, 44], to: [143, 44] },
    ],
    arrows: [
      { from: [87, 44], to: [65, 44], bend: 0 },
      { from: [153, 44], to: [175, 44], bend: 0 },
    ],
  },
};

export const STRENGTH_STRAPS: readonly BuiltinExercise[] = [
  TRX_ROW,
  TRX_SPLIT_SQUAT,
  PULL_UP,
  BAND_PULL_UP,
  MONSTER_WALK,
  BAND_EXTERNAL_ROTATION,
];
