import type { LibraryExercise } from "../library";
import type { Dose, ExerciseRef } from "../types";

/**
 * The library as the model reads it (ADR 0071): one line per exercise the
 * team may use — its reference, name, group, equipment and the dose it
 * comes with — so a proposal can only point at exercises that exist.
 * Archived exercises are left out; the names are the coach's own words
 * for the team's and Kadence's translations for the rest, and both go in
 * fenced as data by the prompt. No rider's data is anywhere near this.
 *
 * Pure.
 */

/** More than Kadence's own and a busy team's together; past it the newest of the team's are left out. */
export const MAX_CATALOGUE_LINES = 200;

/** A dose as the model reads and writes it: the contract's shape, minus the defaults. */
export function doseCode(dose: Dose): string {
  const amount = dose.kind === "time" ? `${dose.seconds}s` : `${dose.reps}x`;
  const sets = dose.sets > 1 ? ` ×${dose.sets}` : "";
  const side = dose.perSide ? " per side" : "";
  const load = dose.load ? ` ${dose.load}` : "";
  return `${amount}${sets}${side}${load}`;
}

export function catalogueLines(exercises: readonly LibraryExercise[]): string[] {
  return exercises
    .filter((e) => !e.archived)
    .slice(0, MAX_CATALOGUE_LINES)
    .map(
      (e) =>
        `${e.ref} | ${e.name} | ${e.group} | ${e.equipment.length ? e.equipment.join(",") : "none"} | ${doseCode(e.dose)}`,
    );
}

/** What an exercise in a proposal is looked up by: the reference, or what a model writes instead. */
export type RefLookup = (written: string) => ExerciseRef | null;

/**
 * The references a proposal may use. A model asked for `builtin:plank`
 * writes `plank` or "Planke" often enough that both are taken too — the
 * bare id and the name as listed, case aside — as long as they name one
 * exercise the team may use. Anything else is nothing.
 */
export function refLookup(exercises: readonly LibraryExercise[]): RefLookup {
  const byKey = new Map<string, ExerciseRef>();
  const claim = (key: string, ref: ExerciseRef) => {
    if (!byKey.has(key)) byKey.set(key, ref);
  };
  for (const e of exercises) {
    if (e.archived) continue;
    claim(e.ref, e.ref);
    claim(e.ref.slice(e.ref.indexOf(":") + 1), e.ref);
    claim(e.name.trim().toLowerCase(), e.ref);
  }
  return (written) => {
    const key = written.trim();
    return byKey.get(key) ?? byKey.get(key.toLowerCase()) ?? null;
  };
}
