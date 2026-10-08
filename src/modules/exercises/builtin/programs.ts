import type { BuiltinProgram, Dose } from "../types";
import { STRENGTH_ROOM_PROGRAMS } from "./programs-strength";
import { SOURCES } from "./sources";

/**
 * Kadence's own programmes. A part's items name built-in exercises; a dose
 * here overrides the exercise's own for this programme only.
 */

const hold = (seconds: number, perSide = true, sets = 1): Dose => ({
  kind: "time",
  seconds,
  perSide,
  sets,
});
const reps = (n: number, perSide = false, sets = 1): Dose => ({
  kind: "reps",
  reps: n,
  perSide,
  sets,
});

/** Short stretches through the day, about five minutes a part, as in the reference drawing. */
export const MOBILITY_DAY: BuiltinProgram = {
  id: "mobilityDay",
  source: `Kadence's own programme; ${SOURCES.acsmStretch}`,
  parts: [
    {
      key: "morning",
      items: [
        { exercise: "builtin:catCow" },
        { exercise: "builtin:gluteBridge", dose: reps(10) },
        { exercise: "builtin:hamstringStretch" },
        { exercise: "builtin:hipFlexor" },
        { exercise: "builtin:chinTuck" },
      ],
    },
    {
      key: "midday",
      items: [
        { exercise: "builtin:chinTuck" },
        { exercise: "builtin:figureFour" },
        { exercise: "builtin:calfStretch" },
        { exercise: "builtin:thoracicOpener", dose: hold(30, false) },
      ],
    },
    {
      key: "evening",
      items: [
        { exercise: "builtin:catCow" },
        { exercise: "builtin:quadStretch" },
        { exercise: "builtin:figureFour" },
        { exercise: "builtin:hamstringStretch" },
      ],
    },
  ],
};

/** Six stretches in about ten minutes, at home and still warm. */
export const AFTER_RIDE: BuiltinProgram = {
  id: "afterRide",
  source: `Kadence's own programme; DCU's compendia advise stretching after strength training (U17 p. 18, U19 p. 23), and after a ride is Kadence's suggestion; ${SOURCES.acsmStretch}`,
  parts: [
    {
      key: "after",
      items: [
        { exercise: "builtin:calfStretch" },
        { exercise: "builtin:quadStretch" },
        { exercise: "builtin:hipFlexor" },
        { exercise: "builtin:hamstringStretch" },
        { exercise: "builtin:figureFour" },
        { exercise: "builtin:thoracicOpener" },
      ],
    },
  ],
};

/** Stomach, back and buttocks on a mat, about fifteen minutes. */
export const CORE_NO_EQUIPMENT: BuiltinProgram = {
  id: "coreNoEquipment",
  source: `Kadence's own programme; DCU's programmes train stomach and back in 3 sets of 15–20 (DCU_U17/U19/U23_styrketraening.pdf); ${SOURCES.youthStrength}`,
  parts: [
    {
      key: "any",
      items: [
        { exercise: "builtin:deadBug" },
        { exercise: "builtin:birdDog" },
        { exercise: "builtin:plank" },
        { exercise: "builtin:sidePlank" },
        { exercise: "builtin:superman" },
        { exercise: "builtin:gluteBridge" },
      ],
    },
  ],
};

/** DCU's frame for a strength session, with exercises a rider can do without machines. */
export const STRENGTH_NO_MACHINES: BuiltinProgram = {
  id: "strengthNoMachines",
  source: `${SOURCES.dcuStrength}; the exercises and doses without machines are Kadence's own; ${SOURCES.youthStrength}`,
  parts: [
    {
      key: "before",
      items: [{ exercise: "builtin:squat", dose: reps(20) }, { exercise: "builtin:catCow" }],
    },
    {
      key: "any",
      items: [
        { exercise: "builtin:gobletSquat" },
        { exercise: "builtin:splitSquat" },
        { exercise: "builtin:romanianDeadlift" },
        { exercise: "builtin:stepUp" },
        { exercise: "builtin:calfRaise" },
        { exercise: "builtin:pushUp" },
        { exercise: "builtin:bandRow" },
      ],
    },
    {
      key: "after",
      items: [
        { exercise: "builtin:quadStretch" },
        { exercise: "builtin:hamstringStretch" },
        { exercise: "builtin:hipFlexor" },
      ],
    },
  ],
};

export const PROGRAMS: readonly BuiltinProgram[] = [
  MOBILITY_DAY,
  AFTER_RIDE,
  CORE_NO_EQUIPMENT,
  STRENGTH_NO_MACHINES,
  ...STRENGTH_ROOM_PROGRAMS,
];
