import { and, eq, inArray } from "drizzle-orm";
import type { z } from "zod";
import { Refused } from "@/core/action";
import { teamExercises } from "@/core/db/schema";
import type { AppTransaction, OrgContext } from "@/core/db/tenant";
import { builtinExercise } from "./builtin";
import type { ExerciseRef, ProgramPart } from "./types";

/**
 * What a programme may name. `builtin:<id>` must be one of Kadence's own;
 * `team:<uuid>` must be an exercise of the active team that is not
 * archived — unless the programme already had it, so a coach can still
 * save a programme after archiving one of its exercises. The database
 * cannot check this itself: the references live inside the programme's
 * JSON, where no foreign key reaches.
 */

export type ParsedRef = { kind: "builtin"; id: string } | { kind: "team"; id: string };

export function parseRef(ref: ExerciseRef): ParsedRef {
  const at = ref.indexOf(":");
  const kind = ref.slice(0, at);
  const id = ref.slice(at + 1);
  return kind === "builtin" ? { kind: "builtin", id } : { kind: "team", id };
}

export const teamRef = (id: string): ExerciseRef => `team:${id}`;

/** Every exercise a programme names, once each. */
export function refsOf(parts: readonly ProgramPart[]): ExerciseRef[] {
  return [...new Set(parts.flatMap((part) => part.items.map((item) => item.exercise)))];
}

/** The team exercise ids among a programme's references. */
export function teamIdsOf(parts: readonly ProgramPart[]): string[] {
  return refsOf(parts)
    .map(parseRef)
    .filter((ref) => ref.kind === "team")
    .map((ref) => ref.id);
}

/**
 * Throws `invalid` unless every reference may be used: `exerciseUnknown`
 * when it names nothing this team can see, `exerciseArchived` when it
 * names an archived exercise the programme did not already have (`kept`).
 */
export async function checkProgramRefs(
  tx: AppTransaction,
  ctx: OrgContext,
  parts: readonly ProgramPart[],
  kept: ReadonlySet<ExerciseRef> = new Set(),
): Promise<void> {
  const refs = refsOf(parts).map((ref) => ({ ref, parsed: parseRef(ref) }));
  for (const { parsed } of refs) {
    if (parsed.kind === "builtin" && !builtinExercise(parsed.id)) {
      throw new Refused("invalid", "exerciseUnknown");
    }
  }
  const teamIds = refs.filter((r) => r.parsed.kind === "team").map((r) => r.parsed.id);
  if (teamIds.length === 0) return;
  // RLS already hides other teams' rows; the org filter says so out loud.
  const rows = await tx
    .select({ id: teamExercises.id, archived: teamExercises.archived })
    .from(teamExercises)
    .where(and(eq(teamExercises.orgId, ctx.orgId), inArray(teamExercises.id, teamIds)));
  const found = new Map(rows.map((row) => [row.id, row.archived]));
  for (const id of teamIds) {
    const archived = found.get(id);
    if (archived === undefined) throw new Refused("invalid", "exerciseUnknown");
    if (archived && !kept.has(teamRef(id))) throw new Refused("invalid", "exerciseArchived");
  }
}

/** The contract's schema, applied again inside the service; a mismatch is `invalid`. */
export function parseOrRefuse<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new Refused("invalid");
  return parsed.data as z.infer<S>;
}
