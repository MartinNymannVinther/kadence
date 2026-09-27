import { describe, expect, it } from "vitest";
import { decodeFit, FitWriter, MESG, SPORT, summarizeActivity } from "@/modules/fit";
import {
  encodeRide,
  fitErrorCode,
  START_MS,
  steadyHour,
  writeFileId,
  type RideSample,
} from "./fixtures";

const summarize = (samples: RideSample[], session?: Parameters<typeof encodeRide>[1]) =>
  summarizeActivity(decodeFit(encodeRide(samples, session)));

describe("an hour at a steady 200 W", () => {
  const summary = summarize(steadyHour(), {
    elapsedSeconds: 3600,
    timerSeconds: 3600,
    distanceM: 36_000,
    ascentM: 0,
  });

  it("is an hour of riding, all of it moving", () => {
    expect(summary.startedAt).toEqual(new Date(START_MS));
    expect(summary.sport).toBe("bike");
    expect(summary.elapsedSeconds).toBe(3600);
    expect(summary.movingSeconds).toBe(3600);
  });

  it("has the averages, the distance and the work", () => {
    expect(summary.distanceM).toBe(36_000);
    expect(summary.avgPower).toBe(200);
    expect(summary.maxPower).toBe(200);
    expect(summary.avgHr).toBe(150);
    expect(summary.maxHr).toBe(150);
    expect(summary.avgCadence).toBe(90);
    expect(summary.workKj).toBe(720);
  });

  it("has one power and heart rate a second, and streams one value per five seconds", () => {
    expect(summary.power1hz).toHaveLength(3600);
    expect(summary.hr1hz.every((hr) => hr === 150)).toBe(true);
    expect(summary.streams.t).toHaveLength(720);
    expect(summary.streams.t.slice(0, 3)).toEqual([0, 5, 10]);
    expect(summary.streams.power.every((p) => p === 200)).toBe(true);
    expect(summary.streams.speed.every((v) => v === 10)).toBe(true);
    expect(summary.streams.alt.every((a) => a === 100)).toBe(true);
  });
});

describe("pauses", () => {
  it("does not count a three-minute gap in the records as moving", () => {
    const ride = steadyHour().map((sample) =>
      sample.s < 1800 ? sample : { ...sample, s: sample.s + 180 },
    );
    const summary = summarize(ride);
    expect(summary.elapsedSeconds).toBe(3780);
    expect(summary.movingSeconds).toBe(3600);
    expect(summary.power1hz[1799]).toBe(200);
    expect(summary.power1hz.slice(1800, 1980).every((p) => p === null)).toBe(true);
    expect(summary.power1hz[1980]).toBe(200);
    expect(summary.workKj).toBe(720);
    expect(summary.avgPower).toBe(200);
  });

  it("does not count three minutes standing still as moving", () => {
    const ride = steadyHour().map((sample) =>
      sample.s >= 1800 && sample.s < 1980
        ? { ...sample, power: 0, cadence: 0, speed: 0, distance: 18_000 }
        : sample,
    );
    const summary = summarize(ride);
    expect(summary.movingSeconds).toBe(3420);
    expect(summary.elapsedSeconds).toBe(3600);
    expect(summary.avgCadence).toBe(90);
    expect(summary.avgPower).toBe(190);
  });

  it("holds a record through a short gap, as smart recording writes them", () => {
    const ride = steadyHour().filter((sample) => sample.s % 5 === 0);
    const summary = summarize(ride);
    expect(summary.movingSeconds).toBe(3596);
    expect(summary.workKj).toBeCloseTo(719.2, 1);
    expect(summary.power1hz.every((p) => p === 200)).toBe(true);
  });

  it("counts a heart-rate-only ride as moving where there is a heart rate", () => {
    const ride = steadyHour().map(({ s, hr }) => ({ s, hr }));
    const summary = summarize(ride);
    expect(summary.movingSeconds).toBe(3600);
    expect(summary.avgPower).toBeUndefined();
    expect(summary.workKj).toBeUndefined();
    expect(summary.distanceM).toBeUndefined();
  });
});

describe("totals the device did not write", () => {
  it("takes the distance from the records, then from the speed", () => {
    expect(summarize(steadyHour()).distanceM).toBe(35_990);
    const noDistance = steadyHour().map((sample) => ({ ...sample, distance: null }));
    expect(summarize(noDistance).distanceM).toBe(36_000);
  });

  it("climbs from the altitude, ignoring a metre of wander", () => {
    const climb = steadyHour().map((sample) => ({
      ...sample,
      altitude: (sample.s < 1000 ? sample.s * 0.1 : 100) + (sample.s % 2 === 0 ? 0.6 : -0.6),
    }));
    const ascent = summarize(climb).ascentM ?? 0;
    expect(ascent).toBeGreaterThan(96);
    expect(ascent).toBeLessThan(101);

    const flat = steadyHour().map((sample) => ({
      ...sample,
      altitude: 50 + (sample.s % 7) * 0.2,
    }));
    expect(summarize(flat).ascentM).toBe(0);
  });

  it("prefers the session's own totals", () => {
    const summary = summarize(steadyHour(), {
      elapsedSeconds: 3700,
      distanceM: 36_100,
      ascentM: 420,
    });
    expect(summary.elapsedSeconds).toBe(3700);
    expect(summary.distanceM).toBe(36_100);
    expect(summary.ascentM).toBe(420);
  });
});

describe("the rest", () => {
  it("calls anything but cycling other, and indoor cycling a bike", () => {
    const short = steadyHour().slice(0, 60);
    expect(summarize(short, { sport: SPORT.running }).sport).toBe("other");
    expect(summarize(short, { sport: 4, subSport: 6 }).sport).toBe("bike");
    expect(summarize(short).sport).toBe("other");
  });

  it("averages each stream window", () => {
    const ride = steadyHour()
      .slice(0, 10)
      .map((sample) => ({ ...sample, power: sample.s % 2 === 0 ? 100 : 300 }));
    const summary = summarize(ride);
    expect(summary.streams.power).toEqual([180, 220]);
  });

  it("drops samples no rider produces", () => {
    const ride = steadyHour()
      .slice(0, 60)
      .map((sample) => (sample.s === 30 ? { ...sample, power: 65_000 } : sample));
    const summary = summarize(ride);
    expect(summary.maxPower).toBe(200);
    expect(summary.power1hz[30]).toBeNull();
  });

  it("refuses a file with no records", () => {
    const fit = decodeFit(writeFileId(new FitWriter()).finish());
    expect(fitErrorCode(() => summarizeActivity(fit))).toBe("empty");
  });

  it("refuses a ride that claims to last for days", () => {
    const writer = writeFileId(new FitWriter()).define(1, MESG.record, [
      { num: 253, type: "uint32" },
    ]);
    const t0 = Math.round((START_MS - Date.UTC(1989, 11, 31)) / 1000);
    writer.write(1, { 253: t0 }).write(1, { 253: t0 + 3 * 86_400 });
    expect(fitErrorCode(() => summarizeActivity(decodeFit(writer.finish())))).toBe("too_large");
  });
});
