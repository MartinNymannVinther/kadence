import { STRENGTH_PROGRAMMES } from "@/modules/dcu/strength";
import type { ExerciseGroup } from "./structure";

/**
 * The exercises the strength builder suggests while a name is typed
 * (ADR 0044): DCU's own, from its programmes (src/modules/dcu/strength.ts)
 * with their sets and reps, and a short list of Kadence's own for a
 * session without machines — body weight, an elastic, a kettlebell — each
 * with a starting point to change. DCU's names stay DCU's Danish words;
 * Kadence's are named in the reader's language from `workouts.catalogue`.
 *
 * Pure: imports nothing from the database.
 */

export type CatalogueEntry = {
  /** A message key for Kadence's own; DCU's carry their name instead. */
  key: string | null;
  name: string | null;
  group: ExerciseGroup;
  sets: number;
  reps: string;
  /** DCU's load as the programme writes it ("RM"). */
  load: string;
  /** Kadence's own load, named in the reader's language: body weight or an elastic. */
  loadKey?: "bodyweight" | "band";
};

const OWN: ReadonlyArray<Omit<CatalogueEntry, "name">> = [
  { key: "plank", group: "core", sets: 3, reps: "30 s", load: "", loadKey: "bodyweight" },
  { key: "sidePlank", group: "core", sets: 3, reps: "20 s", load: "", loadKey: "bodyweight" },
  { key: "deadBug", group: "core", sets: 3, reps: "10", load: "", loadKey: "bodyweight" },
  { key: "birdDog", group: "core", sets: 3, reps: "10", load: "", loadKey: "bodyweight" },
  { key: "gluteBridge", group: "legs", sets: 3, reps: "12", load: "", loadKey: "bodyweight" },
  { key: "lunge", group: "legs", sets: 3, reps: "10", load: "", loadKey: "bodyweight" },
  { key: "stepUp", group: "legs", sets: 3, reps: "10", load: "", loadKey: "bodyweight" },
  { key: "splitSquat", group: "legs", sets: 3, reps: "8", load: "", loadKey: "bodyweight" },
  { key: "gobletSquat", group: "legs", sets: 3, reps: "10", load: "" },
  { key: "romanianDeadlift", group: "legs", sets: 3, reps: "10", load: "" },
  { key: "pushUp", group: "upper", sets: 3, reps: "10", load: "", loadKey: "bodyweight" },
  { key: "bandRow", group: "upper", sets: 3, reps: "12", load: "", loadKey: "band" },
  { key: "hipFlexor", group: "mobility", sets: 2, reps: "30 s", load: "" },
  { key: "catCow", group: "mobility", sets: 2, reps: "10", load: "" },
];

/** DCU's exercises once each, as the programme that first names them does them. */
function dcuExercises(): CatalogueEntry[] {
  const seen = new Set<string>();
  const out: CatalogueEntry[] = [];
  for (const programme of Object.values(STRENGTH_PROGRAMMES))
    for (const e of programme.structure.exercises) {
      if (seen.has(e.name)) continue;
      seen.add(e.name);
      out.push({
        key: null,
        name: e.name,
        group: e.group,
        sets: e.sets,
        reps: e.reps,
        load: e.load,
      });
    }
  return out;
}

export const EXERCISE_CATALOGUE: readonly CatalogueEntry[] = [
  ...dcuExercises(),
  ...OWN.map((e) => ({ ...e, name: null })),
];
