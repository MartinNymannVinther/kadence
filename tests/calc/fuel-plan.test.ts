import { describe, expect, it } from "vitest";
import { MAX_PER_LANE } from "@/modules/calc/fuel-check";
import {
  addItem,
  emptyPlan,
  isEmpty,
  moveItem,
  parseSlot,
  removeItem,
  slotKey,
} from "@/modules/calc/fuel-plan";

const shape = { before: 2, during: 2, after: 1 };

describe("changing a day's plan", () => {
  it("puts things in, moves them between phases and takes them out, leaving the old plan as it was", () => {
    const start = emptyPlan();
    const one = addItem(start, { phase: "before", index: 0 }, "whiteBread");
    expect(start.before[0]).toEqual([]);
    expect(one.before[0]).toEqual(["whiteBread"]);
    const two = addItem(one, { phase: "before", index: 0 }, "honey");
    const moved = moveItem(
      two,
      { phase: "before", index: 0, item: 0 },
      { phase: "after", index: 0 },
    );
    expect(moved.before[0]).toEqual(["honey"]);
    expect(moved.after[0]).toEqual(["whiteBread"]);
    expect(removeItem(moved, { phase: "after", index: 0, item: 0 }).after[0]).toEqual([]);
  });

  it("leaves a full slot, and a slot that does not exist, as it is", () => {
    let plan = emptyPlan();
    for (let i = 0; i < MAX_PER_LANE + 2; i++)
      plan = addItem(plan, { phase: "during", index: 1 }, "gel");
    expect(plan.during[1]).toHaveLength(MAX_PER_LANE);
    const other = addItem(plan, { phase: "during", index: 0 }, "water");
    expect(
      moveItem(other, { phase: "during", index: 0, item: 0 }, { phase: "during", index: 1 }),
    ).toBe(other);
    expect(addItem(other, { phase: "after", index: 9 }, "gel")).toBe(other);
  });

  it("is empty when the slots the day has are, whatever lies past them", () => {
    const plan = addItem(emptyPlan(), { phase: "during", index: 4 }, "gel");
    expect(isEmpty(plan, shape)).toBe(true);
    expect(isEmpty(plan, { ...shape, during: 5 })).toBe(false);
  });

  it("names a slot for the page and reads it back, refusing what is not one", () => {
    expect(parseSlot(slotKey({ phase: "after", index: 3 }))).toEqual({ phase: "after", index: 3 });
    expect(parseSlot("before:2")).toBeNull();
    expect(parseSlot("lunch:0")).toBeNull();
    expect(parseSlot("during:x")).toBeNull();
  });
});
