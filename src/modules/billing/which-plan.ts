import { ageInRaceYear, CLASS_AGES, seasonStartYear } from "@/modules/dcu/classes";

/**
 * Which price a workspace pays, and what that comes to (docs/adr/0090,
 * docs/plan-konto-og-priser.md §3.3 with Martin's yes of 12 October 2026).
 * Pure: the prices themselves are rows of price_plans (drizzle/0052), and
 * the database adds them up the same way in plan_yearly_dkk();
 * tests/billing keeps the two equal.
 *
 * - A club pays by the club's price whatever its riders' ages.
 * - A person alone pays the person's price, unless the rider is at most
 *   U19 in the season the day falls in, by DCU's own rule: the class goes
 *   by the age turned in the racing year the season leads into
 *   (src/modules/dcu/classes.ts, Sporstlige_regler_2025 ch. 7 § 1.6-1,
 *   p. 32: U19 turn 17 and 18). Then it is the young rider's plan, free.
 */

export type PlanState = "free" | "trial" | "paid" | "expired";
export const PLAN_STATES: readonly PlanState[] = ["free", "trial", "paid", "expired"];

export function isPlanState(value: unknown): value is PlanState {
  return typeof value === "string" && (PLAN_STATES as readonly string[]).includes(value);
}

/** The price plans the installation starts with; the owner may add others. */
export type PriceKey = "person" | "club" | "youth";

/** The oldest age turned in the racing year that still rides free alone: U19's last. */
export const YOUTH_MAX_AGE = CLASS_AGES.U19.to;

/** Whether a rider born in `birthYear` is at most U19 in the season `todayIso` falls in. */
export function isYouth(birthYear: number, todayIso: string): boolean {
  return ageInRaceYear(birthYear, seasonStartYear(todayIso)) <= YOUTH_MAX_AGE;
}

/** The price plan a new workspace starts on. */
export function whichPricePlan(input: {
  kind: "club" | "personal";
  /** The rider's birth year in a personal workspace; null when there is none. */
  birthYear: number | null;
  todayIso: string;
}): PriceKey {
  if (input.kind === "club") return "club";
  return input.birthYear !== null && isYouth(input.birthYear, input.todayIso) ? "youth" : "person";
}

/**
 * The last day a young rider alone rides free: 30 September, the end of
 * the last season in which they are U19 — the season that leads into the
 * racing year they turn 18.
 */
export function youthFreeThrough(birthYear: number): string {
  return `${birthYear + YOUTH_MAX_AGE}-09-30`;
}

/** The coming 30 September, the season's last day (classes.ts): today's, if it is today. */
export function seasonEndFrom(todayIso: string): string {
  const year = Number(todayIso.slice(0, 4));
  return todayIso.slice(5) <= "09-30" ? `${year}-09-30` : `${year + 1}-09-30`;
}

/** A price plan's numbers, as price_plans holds them. */
export type PricePlan = {
  key: string;
  priceYearDkk: number;
  /** Per rider beyond `includedRiders`, a year; null when the price does not grow. */
  perRiderDkk: number | null;
  includedRiders: number | null;
};

/** What a plan costs a year for this many riders, in whole kroner. */
export function yearlyPrice(plan: PricePlan, riders: number): number {
  if (plan.perRiderDkk === null) return plan.priceYearDkk;
  const beyond = Math.max(Math.max(0, Math.floor(riders)) - (plan.includedRiders ?? 0), 0);
  return plan.priceYearDkk + beyond * plan.perRiderDkk;
}

/** A yearly price as a month, whole kroner: 1.200 kr. is 100 kr., 290 kr. is 24 kr. */
export function monthlyPrice(yearlyDkk: number): number {
  return Math.round(yearlyDkk / 12);
}
