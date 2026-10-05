import { MAX_LANES, MAX_PER_LANE } from "./fuel-check";
import type { FuelItemId } from "./fuel-items";

/**
 * A day's plan as the rider builds it — the meals before, the hours on
 * the bike, and the meals after — and the ways to change it: put a thing
 * in a slot, move it to another, take it out. Each change returns a new
 * plan and leaves the old one as it was; a full slot stays as it is.
 *
 * Pure: imports nothing from the database, and runs in the browser.
 */

export type Phase = "before" | "during" | "after";
export type Slot = { phase: Phase; index: number };
export type Place = Slot & { item: number };

export type DayPlan = Record<Phase, FuelItemId[][]>;

/** The main meal and a snack before; up to six hours on the bike; up to four hours after. */
export const SLOTS: Record<Phase, number> = { before: 2, during: MAX_LANES, after: 4 };

export const emptyPlan = (): DayPlan => ({
  before: Array.from({ length: SLOTS.before }, () => []),
  during: Array.from({ length: SLOTS.during }, () => []),
  after: Array.from({ length: SLOTS.after }, () => []),
});

const itemsAt = (plan: DayPlan, slot: Slot) => plan[slot.phase][slot.index];

export const isFull = (plan: DayPlan, slot: Slot) =>
  (itemsAt(plan, slot)?.length ?? 0) >= MAX_PER_LANE;

const withSlot = (plan: DayPlan, slot: Slot, items: FuelItemId[]): DayPlan => ({
  ...plan,
  [slot.phase]: plan[slot.phase].map((list, i) => (i === slot.index ? items : list)),
});

export function addItem(plan: DayPlan, slot: Slot, item: FuelItemId): DayPlan {
  const items = itemsAt(plan, slot);
  if (items === undefined || isFull(plan, slot)) return plan;
  return withSlot(plan, slot, [...items, item]);
}

export function removeItem(plan: DayPlan, from: Place): DayPlan {
  const items = itemsAt(plan, from);
  if (items?.[from.item] === undefined) return plan;
  return withSlot(
    plan,
    from,
    items.filter((_, j) => j !== from.item),
  );
}

export function moveItem(plan: DayPlan, from: Place, to: Slot): DayPlan {
  const item = itemsAt(plan, from)?.[from.item];
  const same = from.phase === to.phase && from.index === to.index;
  if (item === undefined || same || itemsAt(plan, to) === undefined || isFull(plan, to))
    return plan;
  return addItem(removeItem(plan, from), to, item);
}

/** How many slots of each phase the day has: the race's hours, and four after only with a session within 8 hours. */
export type Shape = Record<Phase, number>;

/** Nothing in the slots the day has; what lies past them does not count. */
export function isEmpty(plan: DayPlan, shape: Shape): boolean {
  return (Object.keys(shape) as Phase[]).every((phase) =>
    plan[phase].slice(0, shape[phase]).every((items) => items.length === 0),
  );
}

export const slotKey = (slot: Slot) => `${slot.phase}:${slot.index}`;

export function parseSlot(key: string): Slot | null {
  const [phase, index] = key.split(":");
  if (phase !== "before" && phase !== "during" && phase !== "after") return null;
  const i = Number(index);
  return Number.isInteger(i) && i >= 0 && i < SLOTS[phase] ? { phase, index: i } : null;
}
