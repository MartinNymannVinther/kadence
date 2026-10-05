import type { Sex } from "./energy";

/**
 * The rider the meals before and after are worked out for, chosen by
 * class and sex instead of a weight (Martin, 5 October 2026: riders and
 * parents should not have to think of weight as a number). The weight
 * behind each class is a reference, never shown: a rider who is big or
 * small for their age picks the class above or below.
 *
 * The references are the Nordic Nutrition Recommendations 2023's
 * (Food & Nutrition Research 2023;67:10233, "Energy – a scoping review",
 * doi 10.29219/fnr.v67.10233): Table 7 for 13–17-year-olds, weight from
 * measured height and the WHO 2007 median BMI for age, and Table 10's
 * Danish column for 18–24-year-olds, weight for height at BMI 23. A
 * class is the mean of the years it covers, by DCU's ages
 * (src/modules/dcu/classes.ts, gearing.ts).
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

export const RIDER_CLASSES = ["U15", "U17", "U19", "U23"] as const;
export type RiderClass = (typeof RIDER_CLASSES)[number];

/** NNR 2023 Table 7, weight (kg) by age. */
const NNR_CHILD_KG: Record<number, Record<Sex, number>> = {
  13: { male: 47.0, female: 48.0 },
  14: { male: 53.2, female: 52.3 },
  15: { male: 59.4, female: 55.3 },
  16: { male: 64.2, female: 57.5 },
  17: { male: 67.8, female: 58.8 },
};

/** NNR 2023 Table 10, Denmark, 18–24 years, at BMI 23. */
const NNR_DENMARK_18_24_KG: Record<Sex, number> = { male: 74.9, female: 64.5 };

/** The ages a class covers: U15 13–14, U17 15–16, U19 17–18, U23 19–22 (DCU). */
export const CLASS_AGES: Record<RiderClass, readonly number[]> = {
  U15: [13, 14],
  U17: [15, 16],
  U19: [17, 18],
  U23: [19, 20, 21, 22],
};

const kgAt = (age: number, sex: Sex) =>
  age >= 18 ? NNR_DENMARK_18_24_KG[sex] : NNR_CHILD_KG[age]![sex];

/** The reference weight for a class and sex, in kg, to one decimal. */
export function referenceKg(riderClass: RiderClass, sex: Sex): number {
  const ages = CLASS_AGES[riderClass];
  const mean = ages.reduce((sum, age) => sum + kgAt(age, sex), 0) / ages.length;
  return Math.round(mean * 10) / 10;
}

/** The age in the middle of a class, for the heart rate formula. */
export function referenceAge(riderClass: RiderClass): number {
  const ages = CLASS_AGES[riderClass];
  return Math.round((ages[0]! + ages.at(-1)!) / 2);
}
