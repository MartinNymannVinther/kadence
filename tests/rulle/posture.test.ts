import { describe, expect, it } from "vitest";
import { buildCourse, gradeHere, POSTURE, postureAt, type RoutePoint } from "@/modules/rulle";

/**
 * A road north: 2 km flat, then 1 km climbing at `climb`, then 1 km down
 * at `descent`, then flat home; ridden out and back.
 */
function road(climb: number, descent: number) {
  const points: RoutePoint[] = [];
  let ele = 20;
  for (let m = 0; m <= 6000; m += 50) {
    if (m > 2000 && m <= 3000) ele += climb * 50;
    else if (m > 3000 && m <= 4000) ele += descent * 50;
    points.push({ lat: 55.7 + m / 111_200, lon: 9.5, ele });
  }
  return buildCourse({ name: "Bakke", points });
}

const course = road(0.1, -0.06);
const on = (from: number, to: number, speed: number, cadence: number) => {
  const seen = new Map<string, number>();
  for (let d = from; d < to; d += 5) {
    const p = postureAt(course, d, speed, cadence);
    seen.set(p, (seen.get(p) ?? 0) + 1);
  }
  return seen;
};

describe("the rider's posture", () => {
  it("is in the saddle on the flat, whatever the speed", () => {
    expect([...on(200, 1800, 9, 90).keys()]).toEqual(["seated"]);
    expect([...on(200, 1800, 14, 100).keys()]).toEqual(["seated"]);
  });

  it("is out of the saddle in spells on a steep climb, and never without pedalling", () => {
    const climbing = on(2200, 2900, 4, 70);
    const standing = climbing.get("standing") ?? 0;
    const seated = climbing.get("seated") ?? 0;
    // Most of the time on a climb this steep, but not all of it.
    expect(standing / (standing + seated)).toBeGreaterThan(0.45);
    expect(seated).toBeGreaterThan(0);
    expect(climbing.has("tuck")).toBe(false);
    expect([...on(2200, 2900, 4, 0).keys()]).toEqual(["seated"]);
    // A spell lasts: the posture changes only where a spell ends.
    let changes = 0;
    for (let d = 2200; d < 2900; d += 5)
      if (postureAt(course, d, 4, 70) !== postureAt(course, d + 5, 4, 70)) {
        changes += 1;
        expect(Math.floor((d + 5) / POSTURE.spell) * POSTURE.spell).toBeGreaterThan(d);
      }
    expect(changes).toBeGreaterThan(0);
  });

  it("stands less on a gentler climb, and not at all on a drag", () => {
    const gentle = road(0.07, -0.06);
    const share = (c: typeof course) => {
      let standing = 0;
      for (let d = 2200; d < 2900; d += 5) if (postureAt(c, d, 5, 75) === "standing") standing++;
      return standing / 140;
    };
    expect(share(gentle)).toBeLessThan(share(course));
    expect(share(road(0.04, -0.06))).toBe(0);
  });

  it("tucks on a fast descent, and sits up when it is slow or the road flattens", () => {
    expect([...on(3200, 3900, 15, 90).keys()]).toEqual(["tuck"]);
    expect([...on(3200, 3900, 9, 90).keys()]).toEqual(["seated"]);
    expect(postureAt(course, 4600, 15, 90)).toBe("seated");
    expect(postureAt(road(0.1, -0.015), 3500, 15, 90)).toBe("seated");
  });

  it("holds a tuck through a moment's slowing, but does not tuck at that speed from sitting", () => {
    const slowing = POSTURE.tuckSpeed - POSTURE.tuckKeep / 2;
    expect(postureAt(course, 3500, slowing, 90, "tuck")).toBe("tuck");
    expect(postureAt(course, 3500, slowing, 90, "seated")).toBe("seated");
  });

  it("is the same every time for the same place", () => {
    for (let d = 2000; d < 4000; d += 37)
      expect(postureAt(course, d, 6, 80)).toBe(postureAt(course, d, 6, 80));
  });
});

describe("the road's percent where the rider is", () => {
  it("is the climb's on a climb, the descent's on a descent, and nothing on the flat", () => {
    expect(gradeHere(course, 2500)).toBeCloseTo(0.1, 2);
    expect(gradeHere(course, 3500)).toBeCloseTo(-0.06, 2);
    expect(Math.abs(gradeHere(course, 1000))).toBeLessThan(0.001);
  });

  it("reads a little ahead: the foot of a climb shows it before the wheel is on it", () => {
    expect(gradeHere(course, 1990)).toBeGreaterThan(0.03);
    expect(gradeHere(course, 1990)).toBeLessThan(0.1);
  });
});
