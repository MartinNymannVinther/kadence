import type { BuiltinProgram, Dose, Load } from "../types";
import { SOURCES } from "./sources";

/**
 * Kadence's programmes for a club's strength room (backlog Ø-06), in DCU's
 * frame for a strength session: warm up with 8 minutes on the bike and
 * 1 × 20 squats at a low load, the exercises, then stretches; at least
 * 48 hours between two sessions (`SOURCES.dcuStrength`). The bike is the
 * description's, since a programme holds exercises only. A dose here
 * overrides the exercise's own for this programme only.
 */

const reps = (n: number, perSide = false, sets = 1, load?: Load): Dose => ({
  kind: "reps",
  reps: n,
  perSide,
  sets,
  ...(load ? { load } : {}),
});

/** DCU's stretches after a strength session (U17 compendium p. 18, U19 p. 23). */
const AFTER = [
  { exercise: "builtin:quadStretch" },
  { exercise: "builtin:hamstringStretch" },
  { exercise: "builtin:hipFlexor" },
] as const;

/** The whole body with a barbell and dumbbells: DCU's start-up, 3 × 12 and not to exhaustion. */
export const STRENGTH_ROOM: BuiltinProgram = {
  id: "strengthRoom",
  source: `${SOURCES.dcuStrength}; ${SOURCES.dcuStartUp}, which 3 × 12 at a moderate load follows for the legs; the warm-up's 1 × 20 is ${SOURCES.dcuSquat}; the exercises with a barbell and dumbbells are Kadence's own; ${SOURCES.freeWeights}`,
  parts: [
    {
      key: "before",
      items: [{ exercise: "builtin:backSquat", dose: reps(20, false, 1, "light") }],
    },
    {
      key: "any",
      items: [
        { exercise: "builtin:backSquat", dose: reps(12, false, 3, "moderate") },
        { exercise: "builtin:barbellRdl", dose: reps(12, false, 3, "moderate") },
        { exercise: "builtin:dumbbellLunge", dose: reps(8, true, 3, "moderate") },
        { exercise: "builtin:overheadPress" },
        { exercise: "builtin:dumbbellRow" },
        { exercise: "builtin:superman" },
        { exercise: "builtin:deadBug" },
      ],
    },
    { key: "after", items: [...AFTER] },
  ],
};

/** The rider's own weight in the straps and on the bar, and the trunk on the floor. */
export const TRX_BODYWEIGHT: BuiltinProgram = {
  id: "trxBodyweight",
  source: `Kadence's own programme in ${SOURCES.dcuStrength}; ${SOURCES.youthStrength}`,
  parts: [
    {
      key: "before",
      items: [{ exercise: "builtin:squat", dose: reps(20) }, { exercise: "builtin:catCow" }],
    },
    {
      key: "any",
      items: [
        { exercise: "builtin:trxRow" },
        { exercise: "builtin:trxSplitSquat" },
        { exercise: "builtin:pushUp" },
        { exercise: "builtin:bandPullUp" },
        { exercise: "builtin:plank" },
        { exercise: "builtin:sidePlank" },
      ],
    },
    {
      key: "after",
      items: [
        { exercise: "builtin:hipFlexor" },
        { exercise: "builtin:quadStretch" },
        { exercise: "builtin:thoracicOpener" },
      ],
    },
  ],
};

/** The hip's quick push with a kettlebell, and the hip and shoulder with bands. */
export const BANDS_KETTLEBELL: BuiltinProgram = {
  id: "bandsKettlebell",
  source: `Kadence's own programme in ${SOURCES.dcuStrength}; ${SOURCES.youthStrength}; ${SOURCES.freeWeights}`,
  parts: [
    {
      key: "before",
      items: [{ exercise: "builtin:squat", dose: reps(20) }, { exercise: "builtin:catCow" }],
    },
    {
      key: "any",
      items: [
        { exercise: "builtin:kettlebellSwing" },
        { exercise: "builtin:gobletSquat", dose: reps(10, false, 3, "moderate") },
        { exercise: "builtin:romanianDeadlift", dose: reps(10, false, 3, "moderate") },
        { exercise: "builtin:monsterWalk" },
        { exercise: "builtin:bandRow", dose: reps(12, false, 3, "light") },
        { exercise: "builtin:bandExternalRotation" },
      ],
    },
    {
      key: "after",
      items: [
        { exercise: "builtin:hipFlexor" },
        { exercise: "builtin:hamstringStretch" },
        { exercise: "builtin:figureFour" },
      ],
    },
  ],
};

export const STRENGTH_ROOM_PROGRAMS: readonly BuiltinProgram[] = [
  STRENGTH_ROOM,
  TRX_BODYWEIGHT,
  BANDS_KETTLEBELL,
];
