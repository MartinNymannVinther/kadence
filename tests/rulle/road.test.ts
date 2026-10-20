import { describe, expect, it } from "vitest";
import { ROAD, roadGrade } from "@/modules/rulle";

describe("the road given to the trainer (docs/adr/0107)", () => {
  it("is the route's slope at half strength, as the riding apps default to", () => {
    expect(ROAD.difficulty).toBe(0.5);
    expect(roadGrade(0.1)).toBe(0.05);
    expect(roadGrade(-0.06)).toBe(-0.03);
  });

  it("moves in steps of half a per cent, so the trainer is not written to every second", () => {
    expect(roadGrade(0.021)).toBe(0.01);
    expect(roadGrade(0.024)).toBe(0.01);
    expect(roadGrade(0.026)).toBe(0.015);
    expect(roadGrade(0.0)).toBe(0);
    expect(Object.is(roadGrade(-0.001), -0)).toBe(false);
  });

  it("is never steeper than a trainer can be asked for, and nothing for a slope that is no number", () => {
    expect(roadGrade(0.8)).toBe(ROAD.most);
    expect(roadGrade(-0.8)).toBe(-ROAD.most);
    expect(roadGrade(Number.NaN)).toBe(0);
  });

  it("takes another difficulty, for a later setting", () => {
    expect(roadGrade(0.1, 1)).toBe(0.1);
    expect(roadGrade(0.1, 0)).toBe(0);
  });
});
