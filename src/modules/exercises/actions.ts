"use server";

import { z } from "zod";
import { runAction } from "@/core/action";
import { archiveTeamExercise, createTeamExercise, updateTeamExercise } from "./team-exercises";
import { archiveTeamProgram, createTeamProgram, updateTeamProgram } from "./team-programs";
import { teamExerciseInputSchema, teamProgramInputSchema } from "./types";

/**
 * The team's own exercises and programmes, kept by its coaches. Each
 * action resolves the caller's team and validates at the boundary
 * (src/core/action.ts); the service decides who may, checks again that
 * every id and every exercise a programme names is this team's, and the
 * database's policies have the last word (drizzle/0032).
 */

const PATHS = ["/library"];

/** A row id of the team's own: what `team:<uuid>` carries. */
const rowId = z.string().regex(/^[0-9a-f-]{36}$/);
const archivedFlag = z.boolean().default(true);

export async function createTeamExerciseAction(raw: unknown) {
  return runAction(raw, teamExerciseInputSchema, createTeamExercise, PATHS);
}

export async function updateTeamExerciseAction(raw: unknown) {
  return runAction(
    raw,
    teamExerciseInputSchema.extend({ exerciseId: rowId }),
    (ctx, { exerciseId, ...input }) => updateTeamExercise(ctx, exerciseId, input),
    PATHS,
  );
}

export async function archiveTeamExerciseAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ exerciseId: rowId, archived: archivedFlag }),
    (ctx, input) => archiveTeamExercise(ctx, input.exerciseId, input.archived),
    PATHS,
  );
}

export async function createTeamProgramAction(raw: unknown) {
  return runAction(raw, teamProgramInputSchema, createTeamProgram, PATHS);
}

export async function updateTeamProgramAction(raw: unknown) {
  return runAction(
    raw,
    teamProgramInputSchema.extend({ programId: rowId }),
    (ctx, { programId, ...input }) => updateTeamProgram(ctx, programId, input),
    PATHS,
  );
}

export async function archiveTeamProgramAction(raw: unknown) {
  return runAction(
    raw,
    z.object({ programId: rowId, archived: archivedFlag }),
    (ctx, input) => archiveTeamProgram(ctx, input.programId, input.archived),
    PATHS,
  );
}
