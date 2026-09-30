import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildCourse,
  punctureOnLap,
  readRouteGpx,
  riseOver,
  ridersOnLap,
  visitsOnLap,
} from "@/modules/rulle";

const course = (file: string) =>
  buildCourse(readRouteGpx(readFileSync(`public/rulle/routes/${file}`, "utf8")));
const vejle = course("vejle-munkebjerg.gpx");
const dm = course("bu-dm-2026-vejle.gpx");
const LAPS = Array.from({ length: 30 }, (_, lap) => lap);

describe("other riders on the road", () => {
  it("are the same for the same lap, and others a lap later", () => {
    expect(ridersOnLap(vejle, 4)).toEqual(ridersOnLap(vejle, 4));
    const laps = new Set(LAPS.map((lap) => JSON.stringify(ridersOnLap(vejle, lap))));
    expect(laps.size).toBeGreaterThan(LAPS.length - 3);
  });

  it("are met about once a minute and a half at a steady pace, some each way", () => {
    for (const c of [vejle, dm]) {
      const all = LAPS.flatMap((lap) => ridersOnLap(c, lap));
      const perKm = all.length / ((c.length / 1000) * LAPS.length);
      // At 9 m/s a kilometre is under two minutes: about one encounter every 1.2-1.5 km or less.
      expect(perKm).toBeGreaterThan(0.6);
      expect(perKm).toBeLessThan(1.1);
      for (const kind of ["oncoming", "ahead", "behind"] as const)
        expect(all.some((r) => r.kind === kind)).toBe(true);
    }
  });

  it("are slower ahead and faster behind than a steady rider, and sometimes a few together", () => {
    const all = LAPS.flatMap((lap) => ridersOnLap(vejle, lap));
    for (const r of all) {
      expect(r.count).toBeGreaterThanOrEqual(1);
      expect(r.count).toBeLessThanOrEqual(4);
      if (r.kind === "ahead") expect(r.speed).toBeLessThan(6.5);
      if (r.kind === "behind") expect(r.speed).toBeGreaterThan(10.9);
    }
    expect(all.some((r) => r.count > 1)).toBe(true);
    expect(all.some((r) => r.greets)).toBe(true);
  });

  it("never come the other way where a car or a scooter overtakes", () => {
    for (const lap of LAPS) {
      const busy = visitsOnLap(vejle, lap).filter((v) => v.kind === "car" || v.kind === "scooter");
      for (const r of ridersOnLap(vejle, lap))
        if (r.kind === "oncoming")
          for (const v of busy) expect(Math.abs(v.at - r.at)).toBeGreaterThanOrEqual(250);
    }
  });
});

describe("a puncture at the roadside", () => {
  it("is on about one lap in three, on a flat stretch", () => {
    const found = LAPS.map((lap) => punctureOnLap(vejle, lap)).filter((p) => p !== null);
    expect(found.length).toBeGreaterThan(4);
    expect(found.length).toBeLessThan(18);
    for (const p of found) expect(Math.abs(riseOver(vejle, p!.at - 50, 100))).toBeLessThan(0.02);
    expect(punctureOnLap(vejle, 7)).toEqual(punctureOnLap(vejle, 7));
  });
});
