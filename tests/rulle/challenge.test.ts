import { describe, expect, it } from "vitest";
import {
  buildCourse,
  CHALLENGE,
  challengeIn,
  challengerWatts,
  courseAt,
  draft,
  type RoutePoint,
} from "@/modules/rulle";

/** A straight road of `km` kilometres, ridden there and back: flat, or climbing 6 % over its middle. */
function road(km: number, hill: boolean, name = "Vej") {
  const n = Math.round(km * 10);
  let ele = 10;
  const points: RoutePoint[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    if (hill && i > 0 && f > 0.3 && f <= 0.7) ele += 100 * 0.06;
    points.push({ lat: 55.7 + (km / 111.2) * f, lon: 9.5, ele });
  }
  return buildCourse({ name, points });
}

describe("where the challenger turns up", () => {
  it("in about one stretch in ten on a flat road, somewhere in it, with room for the race", () => {
    const course = road(5, false);
    const starts = Array.from({ length: 3000 }, (_, k) => challengeIn(course, k));
    const found = starts.filter((s) => s !== null);
    expect(found.length / starts.length).toBeGreaterThan(0.08);
    expect(found.length / starts.length).toBeLessThan(0.12);
    starts.forEach((s, k) => {
      if (!s) return;
      expect(s.hill).toBe(false);
      expect(s.at).toBeGreaterThanOrEqual(k * CHALLENGE.every + CHALLENGE.margin);
      expect(s.at + CHALLENGE.length).toBeLessThanOrEqual((k + 1) * CHALLENGE.every);
    });
  });

  it("in about one in five where the stretch has a climb, just before its foot", () => {
    // A lap of about three kilometres: every stretch has a climb in it.
    const course = road(1.5, true, "Bakke");
    const starts = Array.from({ length: 3000 }, (_, k) => challengeIn(course, k));
    const found = starts.filter((s) => s !== null);
    expect(found.length / starts.length).toBeGreaterThan(0.17);
    expect(found.length / starts.length).toBeLessThan(0.23);
    for (const s of found) {
      expect(s.hill).toBe(true);
      // The race goes up it: its first kilometre tops out well above where it begins.
      const top = Math.max(
        ...Array.from({ length: 21 }, (_, i) => courseAt(course, s.at + i * 50).ele),
      );
      expect(top - courseAt(course, s.at).ele).toBeGreaterThan(15);
    }
  });

  it("in the same places on the same route, ride after ride", () => {
    const course = road(5, false);
    const once = Array.from({ length: 200 }, (_, k) => challengeIn(course, k));
    const again = Array.from({ length: 200 }, (_, k) => challengeIn(course, k));
    expect(again).toEqual(once);
  });
});

describe("the challenger's watts and his wheel", () => {
  it("rides 900 W for 7 s, 460 W for a minute, 360 W, and 800 W for the last 200 m", () => {
    expect(challengerWatts(0, 2000)).toBe(900);
    expect(challengerWatts(6.9, 1950)).toBe(900);
    expect(challengerWatts(7, 1900)).toBe(460);
    expect(challengerWatts(66.9, 1200)).toBe(460);
    expect(challengerWatts(67, 1100)).toBe(360);
    expect(challengerWatts(150, 201)).toBe(360);
    expect(challengerWatts(150, 200)).toBe(800);
    expect(challengerWatts(5, 150)).toBe(800);
  });

  it("is about 7 W/kg for the minute at his weight", () => {
    expect(460 / (CHALLENGE.massKg - 8)).toBeGreaterThan(6.8);
    expect(460 / (CHALLENGE.massKg - 8)).toBeLessThan(7.2);
  });

  it("takes a third of the air off a wheel's length behind, and none alongside or far back", () => {
    expect(draft(0)).toBe(1);
    expect(draft(-2)).toBe(1);
    expect(draft(1)).toBeCloseTo(0.67, 9);
    expect(draft(3)).toBeCloseTo(0.67, 9);
    expect(draft(5.5)).toBeGreaterThan(0.67);
    expect(draft(5.5)).toBeLessThan(1);
    expect(draft(8)).toBe(1);
  });
});
