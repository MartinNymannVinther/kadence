"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { runAction } from "@/core/action";
import { routing } from "@/i18n/routing";
import { RepeatInput } from "@/modules/training/recurrence";
import { TimePlaceFields } from "@/modules/training/time-place";
import { id, isoDate } from "@/modules/training/vocabulary";
import { programRefSchema } from "./ref";
import type { Translate } from "./resolve";
import { scheduleProgram } from "./schedule";
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
/** Where a programme laid in shows. */
const CALENDAR = ["/calendar", "/today"];

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

/**
 * "Læg i kalenderen": a programme into riders' calendars as a strength
 * session. The exercises are named in the language of the coach who lays
 * it in, as the rest of a session is; `locale` says which.
 */
export async function scheduleProgramAction(raw: unknown) {
  return runAction(
    raw,
    z.object({
      program: programRefSchema,
      riderIds: z.array(id).min(1).max(60),
      onDate: isoDate,
      repeat: RepeatInput.optional(),
      locale: z.enum(routing.locales).default(routing.defaultLocale),
      ...TimePlaceFields,
    }),
    async (ctx, { locale, ...input }) => {
      const t = (await getTranslations({ locale, namespace: "exercises" })) as Translate;
      return scheduleProgram(ctx, input, t);
    },
    CALENDAR,
  );
}
