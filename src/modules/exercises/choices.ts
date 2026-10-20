import type { OrgContext } from "@/core/db/tenant";
import type { ExerciseChoice } from "@/modules/workouts/exercise-choice";
import type { Translate } from "./dose";
import { libraryCatalogue } from "./library";
import { programStructure } from "./program-session";

/**
 * The library's exercises as the strength builder offers them: Kadence's
 * own in the reader's language and the team's own, archived ones left
 * out, each with the dose a session starts it at — the same words a
 * programme laid in writes ("30 sek pr. side", "kropsvægt"). Every member
 * reads the library (drizzle/0032), so this asks for no role.
 */
export async function exerciseChoices(
  ctx: OrgContext,
  t: Translate,
  locale: string,
): Promise<ExerciseChoice[]> {
  const { exercises } = await libraryCatalogue(ctx, t, locale);
  const items = exercises
    .filter((exercise) => !exercise.archived)
    .map((exercise) => ({ exercise, dose: exercise.dose }));
  return programStructure({ parts: [{ key: "any", items }] }, t).exercises.map(
    ({ name, group, sets, reps, load, ref }) => ({ name, group, sets, reps, load, ref }),
  );
}
