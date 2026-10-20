import { describe, expect, it } from "vitest";
import { courseAt, FLAT_LAP_M, flatCourse, steadySpeed } from "@/modules/rulle";

/**
 * The road under a session ridden alone (docs/adr/0057): a flat loop made
 * in memory, so the engine turns watts into speed exactly as on a route,
 * with no hill to change it and nothing fetched.
 */

describe("the flat road", () => {
  const course = flatCourse();

  it("is one 20 km lap with no height and no slope anywhere", () => {
    expect(course.length).toBe(FLAT_LAP_M);
    expect(course.x).toHaveLength(course.grade.length);
    expect(course.step * course.x.length).toBeCloseTo(FLAT_LAP_M, 6);
    expect(course.grade.every((g) => g === 0)).toBe(true);
    expect(course.ele.every((e) => e === 0)).toBe(true);
    expect([course.ascent, course.minEle, course.maxEle]).toEqual([0, 0, 0]);
    expect(course.marks).toEqual([]);
  });

  it("goes round, its last metre meeting its first", () => {
    const start = courseAt(course, 0);
    const lapLater = courseAt(course, FLAT_LAP_M + 0.001);
    expect(lapLater.lap).toBe(1);
    expect(lapLater.x).toBeCloseTo(start.x, 1);
    expect(lapLater.y).toBeCloseTo(start.y, 1);
    expect(courseAt(course, 12_345).grade).toBe(0);
  });

  it("rides at the flat road's speed for the watts", () => {
    expect(steadySpeed(200, courseAt(course, 5_000).grade)).toBe(steadySpeed(200, 0));
  });

  it("carries the name it is given, and none by default", () => {
    expect(course.name).toBe("");
    expect(flatCourse("Fri tur").name).toBe("Fri tur");
  });
});
