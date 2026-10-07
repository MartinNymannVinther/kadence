import {
  PART_KEYS,
  teamProgramInputSchema,
  type Dose,
  type ExerciseRef,
  type PartKey,
  type ProgramPart,
  type TeamProgramInput,
} from "./types";

/**
 * A programme while a coach puts it together (the programme builder,
 * src/components/exercises/builder): parts that may still be empty, items
 * that keep the exercise's own dose until the coach gives one. What is
 * saved is the contract's `teamProgramInputSchema`, checked here before
 * it is sent and again on the server.
 *
 * Pure.
 */

export type DraftItem = { exercise: ExerciseRef; dose?: Dose };
export type DraftPart = { key: PartKey; items: DraftItem[] };
export type ProgramDraft = { name: string; description: string; parts: DraftPart[] };

/** The contract's limit on a part (`programPartSchema`). */
export const MAX_ITEMS = 20;

/** The part keys not yet used, in the contract's order. */
export function unusedKeys(parts: readonly DraftPart[]): PartKey[] {
  return PART_KEYS.filter((key) => !parts.some((part) => part.key === key));
}

/** A new, empty part under the first key not yet used; none when all six are. */
export function addPart(parts: readonly DraftPart[]): DraftPart[] {
  const key = unusedKeys(parts)[0];
  return key ? [...parts, { key, items: [] }] : [...parts];
}

/** A part under another key; refused when another part has that key. */
export function setPartKey(parts: readonly DraftPart[], index: number, key: PartKey): DraftPart[] {
  if (parts.some((part, i) => i !== index && part.key === key)) return [...parts];
  return parts.map((part, i) => (i === index ? { ...part, key } : part));
}

export function removePart(parts: readonly DraftPart[], index: number): DraftPart[] {
  return parts.filter((_, i) => i !== index);
}

function withItems(
  parts: readonly DraftPart[],
  index: number,
  change: (items: DraftItem[]) => DraftItem[],
): DraftPart[] {
  return parts.map((part, i) => (i === index ? { ...part, items: change(part.items) } : part));
}

/** An exercise at the end of a part, while it has room. */
export function addItem(parts: readonly DraftPart[], index: number, ref: ExerciseRef): DraftPart[] {
  return withItems(parts, index, (items) =>
    items.length >= MAX_ITEMS ? items : [...items, { exercise: ref }],
  );
}

export function removeItem(parts: readonly DraftPart[], index: number, item: number): DraftPart[] {
  return withItems(parts, index, (items) => items.filter((_, i) => i !== item));
}

/** Up or down by one within its part. */
export function moveItem(
  parts: readonly DraftPart[],
  index: number,
  item: number,
  by: -1 | 1,
): DraftPart[] {
  return withItems(parts, index, (items) => {
    const to = item + by;
    if (item < 0 || item >= items.length || to < 0 || to >= items.length) return items;
    const next = [...items];
    const [moved] = next.splice(item, 1);
    next.splice(to, 0, moved!);
    return next;
  });
}

/** The programme's own dose for an item, or — with none — the exercise's again. */
export function setItemDose(
  parts: readonly DraftPart[],
  index: number,
  item: number,
  dose: Dose | undefined,
): DraftPart[] {
  return withItems(parts, index, (items) =>
    items.map((it, i) => (i === item ? (dose ? { ...it, dose } : { exercise: it.exercise }) : it)),
  );
}

/** A stored programme's parts as a draft. */
export function draftParts(parts: readonly ProgramPart[]): DraftPart[] {
  return parts.map((part) => ({
    key: part.key,
    items: part.items.map((item) =>
      item.dose ? { exercise: item.exercise, dose: item.dose } : { exercise: item.exercise },
    ),
  }));
}

/** The draft as the contract has it, or null while it would not save. */
export function programInput(draft: ProgramDraft): TeamProgramInput | null {
  const parsed = teamProgramInputSchema.safeParse(draft);
  return parsed.success ? parsed.data : null;
}
