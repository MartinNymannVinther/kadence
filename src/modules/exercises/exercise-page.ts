import type { OrgContext } from "@/core/db/tenant";
import { basePose } from "./base-poses";
import { refFromParam } from "./library-paths";
import { parseRef } from "./refs";
import type { Translate } from "./resolve";
import { getTeamExercise } from "./team-exercises";
import type { Dose, Equipment, ExerciseGroup, ExerciseRef, ExerciseView, Pose } from "./types";
import { builtinExerciseView } from "./view";

/**
 * One exercise for its page in the library, and the draft the editor
 * starts from: a new one from a base pose, a copy of any exercise, or the
 * team's own to change.
 */

export type LoadedExercise = {
  ref: ExerciseRef;
  team: boolean;
  archived: boolean;
  view: ExerciseView;
};

/** The exercise a path's id names — archived ones too — or null when this team has none by it. */
export async function loadExercise(
  ctx: OrgContext,
  param: string,
  t: Translate,
): Promise<LoadedExercise | null> {
  const ref = refFromParam(param);
  if (!ref) return null;
  const parsed = parseRef(ref);
  if (parsed.kind === "builtin") {
    const view = builtinExerciseView(parsed.id, t);
    return view ? { ref, team: false, archived: false, view } : null;
  }
  const exercise = await getTeamExercise(ctx, parsed.id);
  if (!exercise) return null;
  const { id: _id, createdAt: _c, updatedAt: _u, archived, ...view } = exercise;
  return { ref, team: true, archived, view };
}

/** What the editor's form holds (src/components/exercises/editor/exercise-form.tsx). */
export type ExerciseDraftData = {
  id: string | null;
  archived: boolean;
  name: string;
  group: ExerciseGroup;
  equipment: Equipment[];
  how: string;
  why: string;
  dose: Dose;
  pose: Pose;
};

/** A new exercise: standing, ten times, nothing written yet. */
export function blankDraft(): ExerciseDraftData {
  return {
    id: null,
    archived: false,
    name: "",
    group: "core",
    equipment: [],
    how: "",
    why: "",
    dose: { kind: "reps", reps: 10, perSide: false, sets: 1 },
    pose: basePose("standing"),
  };
}

/** The draft for an exercise: the team's own to change, or any other as a copy under `name`. */
export function draftOf(loaded: LoadedExercise, copyName?: string): ExerciseDraftData {
  const { view } = loaded;
  const copy = copyName !== undefined;
  return {
    id: copy || !loaded.team ? null : view.ref.slice("team:".length),
    archived: copy ? false : loaded.archived,
    name: (copy ? copyName : view.name).slice(0, 60),
    group: view.group,
    equipment: [...view.equipment],
    how: view.how.slice(0, 500),
    why: view.why.slice(0, 300),
    dose: view.dose,
    pose: structuredClone(view.pose),
  };
}
