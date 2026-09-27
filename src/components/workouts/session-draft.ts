import {
  readStructure,
  structureMinutes,
  structureSchema,
  type Structure,
} from "@/modules/workouts/structure";
import { emptyStructure } from "./defaults";

/**
 * A session or template being written: its title, sport and words, and a
 * structure per sport, so switching from bike to strength and back does
 * not throw the steps away. Checked with the same zod schema the server
 * uses (src/modules/workouts/structure.ts) before anything is sent.
 */

export const SPORTS = ["bike", "strength", "other"] as const;
export type Sport = (typeof SPORTS)[number];

export type SessionDraft = {
  sport: Sport;
  title: string;
  description: string;
  structures: Record<Sport, Structure>;
  plannedKm: number | null;
};

const asSport = (value: string): Sport => SPORTS.find((s) => s === value) ?? "bike";

export function newDraft(from?: {
  sport: string;
  title: string;
  description: string;
  structure: unknown;
  plannedKm?: number | null;
}): SessionDraft {
  const sport = asSport(from?.sport ?? "bike");
  const structures = {
    bike: emptyStructure("bike"),
    strength: emptyStructure("strength"),
    other: emptyStructure("other"),
  };
  if (from) structures[sport] = readStructure(from.structure, sport);
  return {
    sport,
    title: from?.title ?? "",
    description: from?.description ?? "",
    structures,
    plannedKm: from?.plannedKm ?? null,
  };
}

export type DraftProblem = { kind: "title" } | { kind: "structure"; path: readonly PropertyKey[] };

export type DraftValue = {
  sport: Sport;
  title: string;
  description: string;
  structure: Structure;
  plannedMinutes: number;
  plannedKm: number | null;
};

export function checkDraft(
  draft: SessionDraft,
): { ok: true; value: DraftValue } | { ok: false; problem: DraftProblem } {
  if (!draft.title.trim()) return { ok: false, problem: { kind: "title" } };
  const parsed = structureSchema.safeParse(draft.structures[draft.sport]);
  if (!parsed.success) {
    return { ok: false, problem: { kind: "structure", path: parsed.error.issues[0]?.path ?? [] } };
  }
  return {
    ok: true,
    value: {
      sport: draft.sport,
      title: draft.title.trim(),
      description: draft.description.trim(),
      structure: parsed.data,
      plannedMinutes: structureMinutes(parsed.data),
      plannedKm: draft.sport === "bike" ? draft.plannedKm : null,
    },
  };
}
