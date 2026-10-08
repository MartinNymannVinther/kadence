import { and, eq, inArray } from "drizzle-orm";
import { teamExercises } from "@/core/db/schema";
import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import type { Translate } from "./dose";
import { builtinExerciseView } from "./view";
import { parseRef, teamIdsOf } from "./refs";
import { getTeamProgram } from "./team-programs";
import { teamExerciseView } from "./team-exercises";
import {
  exerciseRefSchema,
  type ExerciseRef,
  type ExerciseView,
  type ProgramPart,
  type ProgramView,
} from "./types";

/**
 * A programme ready to show or download, whichever kind its exercises
 * are: Kadence's own in the reader's language, the team's as the coach
 * wrote them. Archived team exercises still resolve — archiving hides an
 * exercise from new choices, not from the programmes that have it.
 *
 * A reference that resolves to nothing — an exercise of another team, a
 * built-in one that has since been removed — is left out, and a part left
 * empty goes with it: the reader gets the programme that can be shown
 * rather than an error. Saving refuses such references (refs.ts), so this
 * is the reading side of the same rule.
 */

export type { Translate };

/** The views of the given team exercises, archived ones included, by reference. */
async function teamViews(ctx: OrgContext, ids: string[]): Promise<Map<ExerciseRef, ExerciseView>> {
  const views = new Map<ExerciseRef, ExerciseView>();
  if (ids.length === 0) return views;
  const rows = await withOrgContext(ctx, (tx) =>
    tx
      .select()
      .from(teamExercises)
      .where(and(eq(teamExercises.orgId, ctx.orgId), inArray(teamExercises.id, ids))),
  );
  for (const row of rows) {
    const view = teamExerciseView(row);
    if (view) views.set(view.ref, view);
  }
  return views;
}

/**
 * Resolves a programme's parts — a stored one's, or one a coach is
 * putting together and has not saved — with the title and description it
 * is shown under.
 */
export async function resolveProgram(
  ctx: OrgContext,
  parts: readonly ProgramPart[],
  t: Translate,
  heading: { title: string; description: string } = { title: "", description: "" },
): Promise<ProgramView> {
  const team = await teamViews(ctx, teamIdsOf(parts));
  const builtin = new Map<ExerciseRef, ExerciseView>();

  function view(ref: ExerciseRef): ExerciseView | undefined {
    const parsed = parseRef(ref);
    if (parsed.kind === "team") return team.get(ref);
    if (!builtin.has(ref)) {
      const view = builtinExerciseView(parsed.id, t);
      if (view) builtin.set(ref, view);
    }
    return builtin.get(ref);
  }

  const resolved = parts
    .map((part) => ({
      key: part.key,
      items: part.items.flatMap((item) => {
        const exercise = view(item.exercise);
        return exercise ? [{ exercise, dose: item.dose ?? exercise.dose }] : [];
      }),
    }))
    .filter((part) => part.items.length > 0);

  return { title: heading.title, description: heading.description, parts: resolved };
}

/**
 * The exercises a list of references names, by reference: Kadence's own
 * in the reader's language, the team's own as the coach wrote them,
 * archived ones included. A reference this reader cannot see — another
 * team's, one that was never there — is simply missing from the answer,
 * so a session that carries it shows the exercise's name as before.
 */
export async function resolveExercises(
  ctx: OrgContext,
  refs: readonly string[],
  t: Translate,
): Promise<Record<ExerciseRef, ExerciseView>> {
  const parsed = refs.flatMap((ref) =>
    exerciseRefSchema.safeParse(ref).success ? [parseRef(ref as ExerciseRef)] : [],
  );
  const teamIds = [...new Set(parsed.filter((r) => r.kind === "team").map((r) => r.id))];
  const out: Record<ExerciseRef, ExerciseView> = Object.fromEntries(await teamViews(ctx, teamIds));
  for (const ref of parsed) {
    if (ref.kind !== "builtin") continue;
    const view = builtinExerciseView(ref.id, t);
    if (view) out[view.ref] = view;
  }
  return out;
}

/** One of the team's programmes, archived or not, resolved; null when the team has none by that id. */
export async function teamProgramView(
  ctx: OrgContext,
  id: string,
  t: Translate,
): Promise<ProgramView | null> {
  const program = await getTeamProgram(ctx, id);
  if (!program) return null;
  return resolveProgram(ctx, program.parts, t, {
    title: program.name,
    description: program.description,
  });
}
