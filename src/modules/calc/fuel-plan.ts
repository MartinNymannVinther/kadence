import { MAX_LANES, MAX_PER_LANE, type Plan } from "./fuel-check";
import type { FuelItemId } from "./fuel-items";

/**
 * Changing a race plan: putting a thing in an hour, moving it to another
 * and taking it out again. Each returns a new plan and leaves the old one
 * as it was, and an hour that is full stays as it is.
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

export type Place = { lane: number; index: number };

export const emptyPlan = (): Plan => Array.from({ length: MAX_LANES }, () => []);

export const isFull = (plan: Plan, lane: number) => (plan[lane]?.length ?? 0) >= MAX_PER_LANE;

export function addItem(plan: Plan, lane: number, item: FuelItemId): Plan {
  if (lane < 0 || lane >= plan.length || isFull(plan, lane)) return plan;
  return plan.map((items, i) => (i === lane ? [...items, item] : items));
}

export function removeItem(plan: Plan, from: Place): Plan {
  if (plan[from.lane]?.[from.index] === undefined) return plan;
  return plan.map((items, i) =>
    i === from.lane ? items.filter((_, j) => j !== from.index) : items,
  );
}

export function moveItem(plan: Plan, from: Place, lane: number): Plan {
  const item = plan[from.lane]?.[from.index];
  if (item === undefined || lane === from.lane || isFull(plan, lane)) return plan;
  return addItem(removeItem(plan, from), lane, item);
}

/** Nothing in the hours the race has; what lies past the finish does not count. */
export function isEmpty(plan: Plan, lanes: number): boolean {
  return plan.slice(0, lanes).every((items) => items.length === 0);
}

/** A plan of the full length, whatever length the plan given has. */
export function fullLength(plan: Plan): Plan {
  return Array.from({ length: MAX_LANES }, (_, i) => plan[i] ?? []);
}
