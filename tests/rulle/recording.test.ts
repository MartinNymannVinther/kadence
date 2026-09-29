import { describe, expect, it } from "vitest";
import {
  closeLap,
  endRecording,
  pauseRecording,
  readRecording,
  record,
  resumeRecording,
  startRecording,
  totals,
  type Reading,
} from "@/modules/rulle";

const START = Date.UTC(2026, 9, 5, 16, 0, 0);
const at = (second: number) => START + second * 1000;
const reading = (power: number | null, extra: Partial<Reading> = {}): Reading => ({
  power,
  cadence: power === null ? null : 90,
  hr: 140,
  speed: 9,
  distance: null,
  altitude: 20,
  ...extra,
});

describe("a recorded ride", () => {
  const rec = startRecording(at(0) + 400);
  for (let s = 0; s < 60; s++) record(rec, at(s), reading(200, { distance: s * 9 }));
  pauseRecording(rec, at(60));
  resumeRecording(rec, at(90));
  closeLap(rec, at(90), "warmup");
  for (let s = 90; s < 150; s++)
    record(
      rec,
      at(s),
      reading(300, { distance: 540 + (s - 90) * 10, altitude: 20 + (s - 90) / 6 }),
    );
  endRecording(rec, at(150), "work");

  it("starts on a whole second and has one sample for each second ridden", () => {
    expect(rec.startedAt).toBe(at(0));
    expect(rec.t).toHaveLength(120);
    expect(rec.t.slice(58, 62)).toEqual([58, 59, 90, 91]);
  });

  it("closes a lap for each block and keeps the pause", () => {
    expect(rec.laps).toEqual([
      { from: 0, to: 90, intent: "warmup" },
      { from: 90, to: 150, intent: "work" },
    ]);
    expect(rec.pauses).toEqual([{ from: 60, to: 90 }]);
    expect(rec.endedAt).toBe(150);
  });

  it("adds up to the ride: time without the pause, the averages, the work and the climb", () => {
    expect(totals(rec)).toEqual({
      elapsedSeconds: 150,
      timerSeconds: 120,
      distanceM: 1_130,
      ascentM: 10,
      avgPower: 250,
      maxPower: 300,
      avgHr: 140,
      maxHr: 140,
      avgCadence: 90,
      workKj: 30,
      measured: true,
    });
  });
});

describe("the clock it keeps", () => {
  it("takes the newer reading for a second it has, and drops one from the past", () => {
    const rec = startRecording(at(0));
    record(rec, at(0), reading(100));
    record(rec, at(1), reading(150));
    record(rec, at(1) + 500, reading(160, { hr: null }));
    record(rec, at(0) + 200, reading(999));
    expect(rec.t).toEqual([0, 1]);
    expect(rec.power).toEqual([100, 160]);
    expect(rec.hr).toEqual([140, 140]);
  });

  it("records nothing after the end, and a pause twice is one pause", () => {
    const rec = startRecording(at(0));
    record(rec, at(0), reading(100));
    pauseRecording(rec, at(5));
    pauseRecording(rec, at(6));
    endRecording(rec, at(10), "work");
    record(rec, at(11), reading(100));
    expect(rec.pauses).toEqual([{ from: 5, to: 10 }]);
    expect(rec.t).toEqual([0]);
  });

  it("says when nothing was measured: a clock without sensors is not a ride", () => {
    const rec = startRecording(at(0));
    for (let s = 0; s < 30; s++)
      record(rec, at(s), {
        power: null,
        cadence: null,
        hr: null,
        speed: null,
        distance: null,
        altitude: null,
      });
    endRecording(rec, at(30), "work");
    expect(totals(rec)).toMatchObject({ timerSeconds: 30, measured: false, avgPower: null });
  });
});

describe("a recording put aside", () => {
  it("comes back as it went", () => {
    const rec = startRecording(at(0));
    record(rec, at(0), reading(100));
    expect(readRecording(JSON.parse(JSON.stringify(rec)))).toEqual(rec);
  });

  it("is not trusted when its channels disagree or it is not a recording at all", () => {
    const rec = startRecording(at(0));
    record(rec, at(0), reading(100));
    expect(readRecording({ ...rec, power: [] })).toBeNull();
    expect(readRecording("hello")).toBeNull();
    expect(readRecording(null)).toBeNull();
  });
});
