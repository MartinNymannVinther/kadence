import { describe, expect, it } from "vitest";
import { DEFAULT_DAY, type Day } from "@/modules/calc/fuel-day";
import { checkAfter, checkBefore } from "@/modules/calc/meal-check";

const DAY: Day = { ...DEFAULT_DAY, riderClass: "U17", sex: "male" };

describe("the meals before and after", () => {
  it("counts the main meal and the snack together before the start", () => {
    // 2 × bread 49 + honey 16 + juice 20 + banana 25 = 159 g; juice 0.2 l + water bottle 0.75 l.
    const check = checkBefore(DAY, [["whiteBread", "whiteBread", "honey", "juice"], ["banana"]]);
    expect(check.total.content.carbs).toBe(159);
    expect(check.total.carbs.state).toBe("ok");
    expect(check.total.fluid.state).toBe("ok"); // 0.2 l against 0.31–0.62 l, within ¼ l
    expect(checkBefore(DAY, [["juice"], []]).total.carbs.state).toBe("under");
    expect(
      checkBefore(DAY, [["pasta", "pasta", "pasta", "rice", "rice"], []]).total.carbs.state,
    ).toBe("over");
  });

  it("says when the snack an hour before has much fibre or fat", () => {
    expect(checkBefore(DAY, [[], ["banana"]]).notes).toEqual([]);
    expect(checkBefore(DAY, [[], ["oats"]]).notes).toEqual(["beforeFibre"]);
    expect(checkBefore(DAY, [["oats"], []]).notes).toEqual([]);
  });

  it("checks carbohydrate, protein and fluid straight after", () => {
    const check = checkAfter(DAY, [["cocoaMilk", "cocoaMilk", "juice"]], 1.5);
    expect(check.slots[0]).toMatchObject({ onTarget: true });
    expect(check.slots[0]!.content).toMatchObject({ carbs: 66, protein: 19 });
    const short = checkAfter(DAY, [["banana"]], 1.5).slots[0]!;
    expect([short.carbs.state, short.protein?.state, short.fluid.state]).toEqual([
      "under",
      "under",
      "under",
    ]);
    expect(check.plate).toBe("elite");
  });

  it("asks for four hours of carbohydrate with another hard session within 8 hours", () => {
    const soon = checkAfter({ ...DAY, next: "soon" }, [["cocoaMilk", "cocoaMilk", "juice"]], 1.5);
    expect(soon.slots).toHaveLength(4);
    expect(soon.onTarget).toBe(1);
    expect(soon.slots[1]!.protein).toBeNull();
  });
});
