/**
 * Session RPE on the Borg CR10 scale, with the Danish words for the steps
 * the scale names: 1 meget, meget let, 2 let, 3 moderat, 4 noget hårdt,
 * 5 hårdt, 7 meget hårdt, 9 ekstremt hårdt, 10 maksimalt. The steps in
 * between (6, 8) are numbers only, as on the printed scale.
 */
export const RPE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const RPE_NAMED = new Set<number>([1, 2, 3, 4, 5, 7, 9, 10]);

type Translate = (key: string) => string;

/** "7 · meget hårdt", or "6" for a step the scale does not name. `t` reads `training.rpe`. */
export function rpeText(value: number, t: Translate): string {
  return RPE_NAMED.has(value) ? `${value} · ${t(String(value))}` : String(value);
}
