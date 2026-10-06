import type { OrgContext } from "@/core/db/tenant";
import { refFromParam } from "./library-paths";
import { parseRef } from "./refs";
import type { Translate } from "./resolve";
import { getTeamExercise } from "./team-exercises";
import type { ExerciseRef, ExerciseView } from "./types";
import { builtinExerciseView } from "./view";

/** One exercise for its page in the library. */

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
