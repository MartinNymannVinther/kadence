import type { OrgContext } from "@/core/db/tenant";
import { builtinProgram } from "./builtin";
import { refFromParam } from "./library-paths";
import { programDoses, programMinutes } from "./program-session";
import { parseRef } from "./refs";
import { resolveProgram, type Translate } from "./resolve";
import { getTeamProgram } from "./team-programs";
import {
  EQUIPMENT,
  type Equipment,
  type ExerciseRef,
  type ProgramPart,
  type ProgramView,
} from "./types";

/**
 * One programme for its page in the library and for the builder that
 * copies or changes it: Kadence's own by its id, the team's own by its
 * row id — archived ones too, for whoever has the link — resolved in the
 * reader's language, with what it holds and needs.
 */

export type LoadedProgram = {
  ref: ExerciseRef;
  team: boolean;
  archived: boolean;
  /** As stored: what the builder starts from. */
  name: string;
  description: string;
  parts: ProgramPart[];
  /** As shown. */
  view: ProgramView;
  exercises: number;
  minutes: number;
  /** Everything its exercises need besides a floor, in the contract's order. */
  equipment: Equipment[];
  /** Only stretches and mobility. */
  mobilityOnly: boolean;
};

/** The programme a path's id names, or null when this team has none by it. */
export async function loadProgram(
  ctx: OrgContext,
  param: string,
  t: Translate,
): Promise<LoadedProgram | null> {
  const ref = refFromParam(param);
  return ref ? loadProgramByRef(ctx, ref, t) : null;
}

export async function loadProgramByRef(
  ctx: OrgContext,
  ref: ExerciseRef,
  t: Translate,
): Promise<LoadedProgram | null> {
  const parsed = parseRef(ref);
  let stored: { name: string; description: string; parts: ProgramPart[]; archived: boolean };
  if (parsed.kind === "builtin") {
    const program = builtinProgram(parsed.id);
    if (!program) return null;
    stored = {
      name: t(`programs.${program.id}.name`),
      description: t(`programs.${program.id}.description`),
      parts: program.parts,
      archived: false,
    };
  } else {
    const program = await getTeamProgram(ctx, parsed.id);
    if (!program) return null;
    stored = program;
  }
  const view = await resolveProgram(ctx, stored.parts, t, {
    title: stored.name,
    description: stored.description,
  });
  const exercises = view.parts.flatMap((part) => part.items.map((item) => item.exercise));
  return {
    ref,
    team: parsed.kind === "team",
    archived: stored.archived,
    name: stored.name,
    description: stored.description,
    parts: stored.parts,
    view,
    exercises: exercises.length,
    minutes: programMinutes(programDoses(view)),
    equipment: EQUIPMENT.filter((item) => exercises.some((e) => e.equipment.includes(item))),
    mobilityOnly: exercises.length > 0 && exercises.every((e) => e.group === "mobility"),
  };
}
