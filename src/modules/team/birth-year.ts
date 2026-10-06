/**
 * The birth years a rider may have on a team: from 1940, and at least
 * eight years before this one. One rule for the rider form and for a
 * pasted list (bulk-parse.ts), so a year the one takes the other takes.
 * Pure: imports nothing.
 */

export const BIRTH_YEAR_MIN = 1940;

export function birthYearMax(thisYear: number): number {
  return thisYear - 8;
}

export function isBirthYear(year: number, thisYear: number): boolean {
  return Number.isInteger(year) && year >= BIRTH_YEAR_MIN && year <= birthYearMax(thisYear);
}
