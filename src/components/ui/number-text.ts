/**
 * A number field's text while a person types it, and the number it
 * stands for. Pure.
 *
 * The field keeps the text as typed — empty, "1," on the way to "1,5",
 * "3" on the way to "30" — and hands on the number that text settles to,
 * held within the field's bounds. Fed straight back as the field's value,
 * that number would overwrite what is being typed: an emptied field would
 * snap back to its floor, and its first digit could never be deleted.
 * A comma and a point are both a decimal mark, as Danish and English
 * keyboards type them.
 */

export type NumberBounds = {
  min: number;
  max: number;
  /** Whether a fractional part may be typed. */
  decimals: boolean;
  /** What an empty field stands for: null clears it, a number is its floor. */
  empty: number | null;
};

const WHOLE = /^\d*$/;
const DECIMAL = /^\d*([.,]\d*)?$/;

/** The number `text` says, or null when it says none yet: "" or a lone mark. */
export function readNumber(text: string): number | null {
  const plain = text.replace(",", ".");
  if (plain === "" || plain === ".") return null;
  const n = Number(plain);
  return Number.isFinite(n) ? n : null;
}

/** A number as the field shows it: "1,5" in Danish, "1.5" in English, empty for none. */
export function numberText(value: number | null | undefined, locale: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  return locale === "en" ? String(value) : String(value).replace(".", ",");
}

/**
 * What typing `raw` does: the text the field keeps and the number it
 * hands on, or null to refuse the keystroke (a letter, a second mark, a
 * mark in a whole-number field). Below the floor the text stays, since
 * another digit may lift it; past the ceiling the field shows the ceiling.
 */
export function typeNumber(
  raw: string,
  bounds: NumberBounds,
  locale: string,
): { text: string; value: number | null } | null {
  const text = raw.replace(/\s/g, "");
  if (!(bounds.decimals ? DECIMAL : WHOLE).test(text)) return null;
  const said = readNumber(text);
  if (said === null) return { text, value: bounds.empty };
  if (said > bounds.max) return { text: numberText(bounds.max, locale), value: bounds.max };
  return { text, value: Math.max(bounds.min, said) };
}

/** One arrow key's step from `value`, held within the bounds and free of float dust. */
export function stepNumber(
  value: number | null,
  by: number,
  bounds: Pick<NumberBounds, "min" | "max">,
): number {
  const next = value === null ? bounds.min : Number((value + by).toFixed(9));
  return Math.min(bounds.max, Math.max(bounds.min, next));
}
