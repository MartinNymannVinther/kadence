import type { Exercise, StrengthStructure } from "@/modules/workouts/structure";
import { loadWord, type Translate } from "./dose";
import type { Dose, ProgramView } from "./types";

/**
 * A programme as a session in the calendar ("Læg i kalenderen"): a
 * strength session whose exercises are the programme's, in its order,
 * each with its dose written the way the strength builder writes sets and
 * reps ("3 × 30 sek", "3 × 10 pr. side"), its load in a word ("moderat")
 * and a reference to the exercise in the library, so the session can show
 * its figure and how-to.
 *
 * Pure: the words come through the translator it is handed (the
 * `exercises` namespace), in the language of the coach who lays it in —
 * as every other session's title and exercises are.
 */

/** A strength session holds at most this many exercises (src/modules/workouts/structure.ts). */
export const MAX_SESSION_EXERCISES = 30;
/** And takes at most this many minutes. */
const MAX_MINUTES = 300;
/** The strength builder's limits on a name and on reps. */
const MAX_NAME = 80;
const MAX_REPS = 20;

/**
 * How long the minutes estimate takes things to be. Kadence's own
 * assumptions, not a source's: no source in docs/research times a
 * repetition or the change between exercises, and the estimate only
 * places the session in the calendar and in the load — the rider does
 * the programme at their own pace.
 */
export const PACE = {
  /** One slow, controlled repetition: about two seconds down and two up. */
  secondsPerRep: 4,
  /** Between two sets of the same exercise. */
  restBetweenSets: 30,
  /** From one exercise to the next: lie down, find the band. */
  changeOver: 15,
} as const;

/** One exercise at its dose, both sides and the rest between sets included, in seconds. */
export function doseSeconds(dose: Dose): number {
  const sides = dose.perSide ? 2 : 1;
  const sets = dose.sets ?? 1;
  const work = dose.kind === "time" ? dose.seconds : dose.reps * PACE.secondsPerRep;
  return work * sides * sets + PACE.restBetweenSets * (sets - 1);
}

/** Whole minutes for a list of doses, a change-over after each; at least one when there is any. */
export function programMinutes(doses: readonly Dose[]): number {
  if (doses.length === 0) return 0;
  const seconds = doses.reduce((sum, dose) => sum + doseSeconds(dose) + PACE.changeOver, 0);
  return Math.min(MAX_MINUTES, Math.max(1, Math.ceil(seconds / 60)));
}

/**
 * A dose's amount without its sets, as the strength session writes reps:
 * "10", "30 sek", "2 min", "10 pr. side". The sets have their own field.
 */
export function doseAmount(dose: Dose, t: Translate): string {
  let amount: string;
  if (dose.kind === "time") {
    amount =
      dose.seconds >= 60 && dose.seconds % 60 === 0
        ? t("dose.minutes", { minutes: dose.seconds / 60 })
        : t("dose.seconds", { seconds: dose.seconds });
  } else amount = String(dose.reps);
  if (dose.perSide) amount = t("dose.perSide", { amount });
  return amount.slice(0, MAX_REPS);
}

/** Every dose of a resolved programme, in order. */
export function programDoses(program: Pick<ProgramView, "parts">): Dose[] {
  return program.parts.flatMap((part) => part.items.map((item) => item.dose));
}

/**
 * The strength session a resolved programme becomes. When the programme
 * has more than one part, each exercise's note names its part ("Morgen",
 * "Før"), so the rider sees which belong together; the warm-up stays the
 * coach's to write.
 */
export function programStructure(
  program: Pick<ProgramView, "parts">,
  t: Translate,
): StrengthStructure {
  const named = program.parts.length > 1;
  const exercises: Exercise[] = program.parts.flatMap((part) =>
    part.items.map(({ exercise, dose }) => ({
      name: exercise.name.slice(0, MAX_NAME),
      group: exercise.group,
      sets: dose.sets ?? 1,
      reps: doseAmount(dose, t),
      load: loadWord(dose, t),
      note: named ? t(`parts.${part.key}`) : "",
      ref: exercise.ref,
    })),
  );
  return {
    kind: "strength",
    warmup: "",
    exercises,
    progression: [],
    minutes: programMinutes(programDoses(program)),
  };
}

/** The references a strength session's exercises carry, each once. */
export function refsInStructure(structure: Pick<StrengthStructure, "exercises">): string[] {
  return [
    ...new Set(structure.exercises.flatMap((exercise) => (exercise.ref ? [exercise.ref] : []))),
  ];
}
