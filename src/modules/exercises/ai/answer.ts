import { asString, list, rec } from "@/modules/ai/sanitize-helpers";
import type { DraftPart } from "../program-draft";
import { MAX_ITEMS } from "../program-draft";
import { doseSchema, PART_KEYS, type PartKey } from "../types";
import type { RefLookup } from "./catalogue";

/**
 * The model's answer to a turn of "Byg med AI" for a programme (ADR
 * 0071), read field by field into the builder's own shape: a word back to
 * the coach, and — when the turn changed anything — the whole programme
 * as it should now stand. An exercise the library does not have is
 * dropped, a dose that does not read is left out so the exercise's own
 * applies, a part key used twice or unknown is dropped, and the caps are
 * the contract's. A programme with nothing left in it is no programme,
 * and the coach gets the words alone.
 *
 * Pure.
 */

/** Enough for a few sentences to the coach; the model is asked for two or three. */
export const MAX_REPLY_CHARS = 600;

/** A turn as the panel keeps it and the prompt is reminded of: who spoke, and what was said. */
export type Turn = { role: "coach" | "ai"; text: string };

export type ProgramProposal = {
  reply: string;
  program: { name?: string; description?: string; parts: DraftPart[] } | null;
};

function readParts(value: unknown, lookup: RefLookup): DraftPart[] {
  const seen = new Set<PartKey>();
  const parts: DraftPart[] = [];
  for (const raw of list(value).slice(0, PART_KEYS.length)) {
    const key = asString(raw.key, "", 20) as PartKey;
    if (!PART_KEYS.includes(key) || seen.has(key)) continue;
    const items: DraftPart["items"] = [];
    for (const item of list(raw.items).slice(0, MAX_ITEMS)) {
      const exercise = lookup(asString(item.exercise, "", 120));
      if (!exercise) continue;
      const dose =
        item.dose === undefined || item.dose === null ? null : doseSchema.safeParse(item.dose);
      items.push(dose?.success ? { exercise, dose: dose.data } : { exercise });
    }
    if (items.length === 0) continue;
    seen.add(key);
    parts.push({ key, items });
  }
  return parts;
}

export function readProgramAnswer(data: unknown, lookup: RefLookup): ProgramProposal | null {
  const answer = rec(data);
  const reply = asString(answer.reply, "", MAX_REPLY_CHARS);
  const program =
    answer.program === undefined || answer.program === null ? null : rec(answer.program);
  const parts = program ? readParts(program.parts, lookup) : [];
  if (!reply && parts.length === 0) return null;
  if (parts.length === 0) return { reply, program: null };
  const name = program ? asString(program.name, "", 60) : "";
  const description = program ? asString(program.description, "", 300) : "";
  return {
    reply,
    program: {
      ...(name ? { name } : {}),
      ...(description ? { description } : {}),
      parts,
    },
  };
}
