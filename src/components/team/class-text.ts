import { classFor, isClassBasis, seasonStartYear } from "@/modules/dcu";

/**
 * A rider's class in words: "U17 · 2. år", "Senior". DCU's module decides
 * the class from the birth year and the season (src/modules/dcu/classes.ts);
 * a coach's override wins, and "senior" is simply senior.
 */
type Translate = (key: string, values?: Record<string, string | number>) => string;

export function classText(
  rider: { birthYear: number; categoryOverride: string | null },
  today: string,
  t: Translate,
): string {
  if (rider.categoryOverride === "senior") return t("senior");
  const override = isClassBasis(rider.categoryOverride) ? rider.categoryOverride : null;
  const c = classFor(rider.birthYear, seasonStartYear(today), override);
  if (c.category === "youth") return t("youth");
  if (c.category === "senior") return t("senior");
  return t("withYear", { category: c.category, year: c.yearInClass ?? 1 });
}
