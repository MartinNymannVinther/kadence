import { describe, expect, it } from "vitest";
import { decodeFit, summarizeActivity, type FitLap, type FitRecord } from "@/modules/fit";
import { metresAlong } from "@/modules/fit/along";
import { findClimbs } from "@/modules/fit/climbs";
import { summarizeLaps } from "@/modules/fit/laps";
import { buildTimeline } from "@/modules/fit/timeline";
import { encodeRide, START_MS, steadyHour } from "./fixtures";

/**
 * What the activity page shows beyond the totals: the route, the laps and
 * the climbs, read from the one-second timeline.
 */

const record = (s: number, extra: Partial<FitRecord> = {}): FitRecord => ({
  t: START_MS + s * 1000,
  power: 200,
  hr: 150,
  cadence: 90,
  speed: 10,
  distance: s * 10,
  altitude: 100,
  ...extra,
});

describe("the route", () => {
  it("keeps the GPS in the streams, to five decimals", () => {
    const summary = summarizeActivity(decodeFit(encodeRide(steadyHour())));
    expect(summary.streams.lat.length).toBe(summary.streams.t.length);
    expect(summary.streams.lat[0]).toBeCloseTo(55.6761, 4);
    expect(summary.streams.lon[0]).toBeCloseTo(12.5683, 4);
    expect(summary.streams.lat.at(-1)!).toBeGreaterThan(summary.streams.lat[0]!);
  });

  it("treats 0°, 0° as no fix", () => {
    const line = buildTimeline([record(0, { lat: 0, lon: 0 }), record(1, { lat: 55, lon: 12 })]);
    expect(line.lat).toEqual([null, 55]);
    expect(line.lon).toEqual([null, 12]);
  });

  it("keeps the fastest second", () => {
    const records = Array.from({ length: 60 }, (_, s) => record(s, { speed: s === 30 ? 16 : 10 }));
    const fit = decodeFit(
      encodeRide(records.map((r) => ({ s: (r.t - START_MS) / 1000, speed: r.speed }))),
    );
    expect(summarizeActivity(fit).maxSpeed).toBe(16);
  });
});

describe("distance along the ride", () => {
  it("counts from the device's first distance and never goes back", () => {
    expect(metresAlong({ distance: [500, 510, null, 505, 530], speed: [] as null[] })).toEqual([
      0, 10, 10, 10, 30,
    ]);
  });

  it("sums the speed when the device wrote no distance", () => {
    expect(metresAlong({ distance: [null, null, null], speed: [5, null, 7] })).toEqual([5, 5, 12]);
  });
});

describe("laps", () => {
  const line = buildTimeline(
    Array.from({ length: 600 }, (_, s) => record(s, { power: s < 300 ? 150 : 250 })),
  );
  const along = metresAlong(line);
  const lap = (from: number, to: number, extra: Partial<FitLap> = {}): FitLap => ({
    startTime: START_MS + from * 1000,
    t: START_MS + to * 1000,
    ...extra,
  });

  it("measures each lap on the ride's own seconds", () => {
    const laps = summarizeLaps([lap(0, 300), lap(300, 600)], line, along);
    expect(laps).toHaveLength(2);
    expect(laps[0]).toMatchObject({
      startS: 0,
      elapsedSeconds: 300,
      avgPower: 150,
      avgHr: 150,
      avgCadence: 90,
    });
    expect(laps[1]).toMatchObject({
      startS: 300,
      elapsedSeconds: 300,
      avgPower: 250,
      maxPower: 250,
    });
    expect(laps[0]!.distanceM).toBe(2990);
    expect(laps[0]!.avgSpeed).toBeCloseTo(2990 / 300, 1);
  });

  it("believes the device's own lap distance when it is plausible", () => {
    const laps = summarizeLaps([lap(0, 300, { distanceM: 3000 }), lap(300, 600)], line, along);
    expect(laps[0]!.distanceM).toBe(3000);
  });

  it("gives nothing for a ride of one lap", () => {
    expect(summarizeLaps([lap(0, 600)], line, along)).toEqual([]);
  });

  it("stops a lap where the next begins and drops laps outside the ride", () => {
    const laps = summarizeLaps(
      [lap(300, 600), lap(0, 400), lap(-100, -50), lap(700, 800)],
      line,
      along,
    );
    expect(laps.map((l) => [l.startS, l.elapsedSeconds])).toEqual([
      [0, 300],
      [300, 300],
    ]);
  });
});

describe("climbs", () => {
  /** Flat for `flat` m, up `gain` m over `length` m, then flat again, at 5 m/s. */
  function hill(flat: number, length: number, gain: number) {
    const total = flat * 2 + length;
    return buildTimeline(
      Array.from({ length: total / 5 }, (_, s) => {
        const m = s * 5;
        const up = Math.min(Math.max(m - flat, 0), length);
        return record(s, { speed: 5, distance: m, altitude: 20 + (up / length) * gain });
      }),
    );
  }

  it("finds a Danish hill: 1.5 km at 6 %", () => {
    const line = hill(2000, 1500, 90);
    const [climb, ...rest] = findClimbs(line, metresAlong(line));
    expect(rest).toEqual([]);
    expect(climb!.gainM).toBeGreaterThanOrEqual(85);
    expect(climb!.gainM).toBeLessThanOrEqual(90);
    expect(climb!.distanceM).toBeGreaterThan(1300);
    expect(climb!.distanceM).toBeLessThan(1700);
    expect(climb!.gradePct).toBeGreaterThan(5.5);
    expect(climb!.gradePct).toBeLessThan(6.5);
    expect(climb!.atM).toBeGreaterThan(1800);
    expect(climb!.atM).toBeLessThan(2200);
    expect(climb!.avgPower).toBe(200);
  });

  it("ignores a rise too small or too gentle to name", () => {
    const bump = hill(1000, 200, 10);
    expect(findClimbs(bump, metresAlong(bump))).toEqual([]);
    const drag = hill(1000, 3000, 60);
    expect(findClimbs(drag, metresAlong(drag))).toEqual([]);
  });

  it("finds nothing without altitude", () => {
    const line = buildTimeline(
      Array.from({ length: 600 }, (_, s) => record(s, { altitude: undefined })),
    );
    expect(findClimbs(line, metresAlong(line))).toEqual([]);
  });
});

describe("the demo's sample ride", () => {
  it("reads back with its laps, climbs and route", async () => {
    const { sampleRideFit } = await import("@/modules/demo/sample-ride");
    const summary = summarizeActivity(decodeFit(sampleRideFit(START_MS)));
    expect(summary.laps).toHaveLength(8);
    expect(summary.climbs).toHaveLength(5);
    expect(summary.distanceM).toBeGreaterThan(71_000);
    expect(summary.elapsedSeconds - summary.movingSeconds).toBeGreaterThanOrEqual(200);
    // Only the four-minute stop has no position.
    const gaps = summary.streams.lat.filter((v) => v === null).length;
    expect(gaps).toBeGreaterThan(0);
    expect(gaps).toBeLessThanOrEqual(240 / 5);
  });
});
