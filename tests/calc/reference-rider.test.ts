import { describe, expect, it } from "vitest";
import { referenceKg, RIDER_CLASSES } from "@/modules/calc/reference-rider";

describe("the reference rider for a class", () => {
  it("is the mean of NNR 2023's weights for the class's years", () => {
    // Table 7: 13 y 47.0/48.0, 14 y 53.2/52.3 … 17 y 67.8/58.8; Table 10, Denmark 18–24: 74.9/64.5.
    expect(referenceKg("U15", "male")).toBe(50.1);
    expect(referenceKg("U15", "female")).toBe(50.2);
    expect(referenceKg("U17", "male")).toBe(61.8);
    expect(referenceKg("U17", "female")).toBe(56.4);
    expect(referenceKg("U19", "male")).toBe(71.4);
    expect(referenceKg("U19", "female")).toBe(61.7);
    expect(referenceKg("U23", "male")).toBe(74.9);
    expect(referenceKg("U23", "female")).toBe(64.5);
  });

  it("grows with the class, so a big rider can choose the class above", () => {
    for (const sex of ["female", "male"] as const)
      for (let i = 1; i < RIDER_CLASSES.length; i++)
        expect(referenceKg(RIDER_CLASSES[i]!, sex)).toBeGreaterThan(
          referenceKg(RIDER_CLASSES[i - 1]!, sex),
        );
  });
});
