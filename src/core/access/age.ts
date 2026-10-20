/**
 * How old a person must be to create a personal workspace on their own
 * (docs/adr/0080). Pure: imports nothing.
 *
 * Kadence is an information society service, and a person's own account
 * rests on their own consent. In Denmark a child may give that consent
 * from the age of 15: databeskyttelsesloven § 6, stk. 2 and 3, as amended
 * by lov nr. 1783 af 28. december 2023 (in force 1 January 2024, which
 * raised it from 13), using the room GDPR art. 8(1) gives each member
 * state to set the age anywhere from 13 to 16
 * (https://www.retsinformation.dk/eli/lta/2023/1783). Kadence also holds
 * health data about the rider (GDPR art. 9: sleep, pain, pulse), so below
 * 15 it is a parent who creates the workspace and adds the child as its
 * rider.
 *
 * The age is the one the person reaches in the current Copenhagen year,
 * from the birth year alone: Kadence asks for a year, never a birthday,
 * as the rider form does (src/modules/team/birth-year.ts) and as DCU's
 * classes do (src/modules/dcu/classes.ts). A child born in 2011 may apply
 * from 1 January 2026, some months early at most, which is the price of
 * not asking for a date of birth.
 */

/** Databeskyttelsesloven § 6, stk. 2 and 3 (lov nr. 1783 af 28.12.2023; GDPR art. 8(1) allows 13 to 16). */
export const SELF_CONSENT_AGE = 15;

/** The age a person born in `birthYear` reaches in `thisYear`. */
export function ageInYear(birthYear: number, thisYear: number): number {
  return thisYear - birthYear;
}

/** Whether a person born in `birthYear` may create a workspace of their own this year. */
export function mayApplyForThemselves(birthYear: number, thisYear: number): boolean {
  return Number.isInteger(birthYear) && ageInYear(birthYear, thisYear) >= SELF_CONSENT_AGE;
}
