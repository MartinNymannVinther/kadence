import type { OrgContext } from "@/core/db/tenant";
import { EXERCISE_GROUPS } from "@/modules/workouts/structure";
import { BUILTIN_EXERCISES, BUILTIN_PROGRAMS } from "./builtin";
import type { Translate } from "./dose";
import { programDoses, programMinutes } from "./program-session";
import { teamRef } from "./refs";
import { listTeamExercises, type TeamExercise } from "./team-exercises";
import { listTeamPrograms, type TeamProgram } from "./team-programs";
import type { ExerciseRef, ExerciseView, PartKey, ProgramPart } from "./types";
import { builtinExerciseView, programParts } from "./view";

/**
 * The library's "Øvelser og programmer" (docs/plan-ovelser-og-programmer.md):
 * Kadence's own beside the team's own, ready for the list, the
 * programme builder's picker and the programme page. Every member reads
 * it (drizzle/0032); archived ones come along marked, for a coach who
 * wants to see them and for the programmes that still have them.
 */

/** An exercise as the library lists it. */
export type LibraryExercise = ExerciseView & { team: boolean; archived: boolean };

/** A programme as the library lists it, with what it holds and about how long it takes. */
export type LibraryProgram = {
  ref: ExerciseRef;
  name: string;
  description: string;
  team: boolean;
  archived: boolean;
  parts: PartKey[];
  exercises: number;
  minutes: number;
};

/** A team exercise trimmed to what is shown: no dates, no row bookkeeping. */
function teamView(exercise: TeamExercise): LibraryExercise {
  const { id: _id, createdAt: _c, updatedAt: _u, archived, ...view } = exercise;
  return { ...view, team: true, archived };
}

const groupOrder = (view: ExerciseView) => EXERCISE_GROUPS.indexOf(view.group);

/** Kadence's own exercises in the reader's language, by group and then by name. */
export function builtinExercises(t: Translate, locale: string): LibraryExercise[] {
  return BUILTIN_EXERCISES.flatMap((e) => {
    const view = builtinExerciseView(e.id, t);
    return view ? [{ ...view, team: false, archived: false }] : [];
  }).sort((a, b) => groupOrder(a) - groupOrder(b) || a.name.localeCompare(b.name, locale));
}

/** What a programme holds, read through the exercises the library knows. */
function summary(parts: readonly ProgramPart[], known: ReadonlyMap<ExerciseRef, ExerciseView>) {
  const resolved = programParts(parts, (ref) => known.get(ref) ?? null);
  return {
    parts: resolved.map((part) => part.key),
    exercises: resolved.reduce((sum, part) => sum + part.items.length, 0),
    minutes: programMinutes(programDoses({ parts: resolved })),
  };
}

export type LibraryCatalogue = {
  /** Every exercise, the team's first; archived ones marked. */
  exercises: LibraryExercise[];
  /** Every programme, the team's first; archived ones only when asked for. */
  programs: LibraryProgram[];
  /** The team's programmes as stored, for the builder and the programme page. */
  teamPrograms: TeamProgram[];
};

export async function libraryCatalogue(
  ctx: OrgContext,
  t: Translate,
  locale: string,
  options: { includeArchived?: boolean } = {},
): Promise<LibraryCatalogue> {
  const [team, teamPrograms] = await Promise.all([
    listTeamExercises(ctx, { includeArchived: true }),
    listTeamPrograms(ctx, { includeArchived: options.includeArchived }),
  ]);
  const exercises = [...team.map(teamView), ...builtinExercises(t, locale)];
  const known = new Map<ExerciseRef, ExerciseView>(exercises.map((e) => [e.ref, e]));
  const programs: LibraryProgram[] = [
    ...teamPrograms.map((p) => ({
      ref: teamRef(p.id),
      name: p.name,
      description: p.description,
      team: true,
      archived: p.archived,
      ...summary(p.parts, known),
    })),
    ...BUILTIN_PROGRAMS.map((p) => ({
      ref: `builtin:${p.id}` as ExerciseRef,
      name: t(`programs.${p.id}.name`),
      description: t(`programs.${p.id}.description`),
      team: false,
      archived: false,
      ...summary(p.parts, known),
    })),
  ];
  return { exercises, programs, teamPrograms };
}
