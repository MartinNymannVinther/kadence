import { describe, expect, it } from "vitest";
import { MAX_PER_LANE } from "@/modules/calc/fuel-check";
import { addItem, emptyPlan, isEmpty, moveItem, removeItem } from "@/modules/calc/fuel-plan";

describe("changing a plan", () => {
  it("puts things in, moves them and takes them out, leaving the old plan as it was", () => {
    const start = emptyPlan();
    const one = addItem(start, 0, "gel");
    expect(start[0]).toEqual([]);
    expect(one[0]).toEqual(["gel"]);
    const two = addItem(one, 0, "drink");
    const moved = moveItem(two, { lane: 0, index: 0 }, 2);
    expect(moved.slice(0, 3)).toEqual([["drink"], [], ["gel"]]);
    expect(removeItem(moved, { lane: 2, index: 0 })[2]).toEqual([]);
  });

  it("leaves a full hour as it is", () => {
    let plan = emptyPlan();
    for (let i = 0; i < MAX_PER_LANE + 2; i++) plan = addItem(plan, 1, "gel");
    expect(plan[1]).toHaveLength(MAX_PER_LANE);
    const other = addItem(plan, 0, "water");
    expect(moveItem(other, { lane: 0, index: 0 }, 1)).toBe(other);
  });

  it("is empty when the hours of the race are, whatever lies after the finish", () => {
    const plan = addItem(emptyPlan(), 4, "gel");
    expect(isEmpty(plan, 2)).toBe(true);
    expect(isEmpty(plan, 5)).toBe(false);
  });
});
