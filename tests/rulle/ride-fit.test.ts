import { describe, expect, it } from "vitest";
import { activityFromFit } from "@/modules/devices/from-fit";
import { decodeFit, SPORT, SUB_SPORT, summarizeActivity } from "@/modules/fit";
import {
  closeLap,
  endRecording,
  nextSpeed,
  pauseRecording,
  record,
  resumeRecording,
  rideToFit,
  startRecording,
  type Recording,
} from "@/modules/rulle";

const START = Date.UTC(2026, 10, 12, 16, 30, 0);
const at = (second: number) => START + second * 1000;

/** Ten minutes' warm-up at 160 W, a pause, then two times five minutes at 250 W and two at 150. */
function session(options: { power: boolean; hr: boolean }): Recording {
  const rec = startRecording(at(0));
  let second = 0;
  let speed = 0;
  let distance = 0;
  const ride = (seconds: number, watts: number, intent: string) => {
    for (let i = 0; i < seconds; i++, second++) {
      speed = nextSpeed(speed, watts, 0.01, 1);
      distance += speed;
      record(rec, at(second), {
        power: options.power ? watts : null,
        cadence: options.power ? 90 : null,
        hr: options.hr ? 120 + Math.round(watts / 10) : null,
        speed: options.power ? speed : null,
        distance: options.power ? distance : null,
        altitude: options.power ? 20 + distance * 0.01 : null,
      });
    }
    closeLap(rec, at(second), intent);
  };
  ride(600, 160, "warmup");
  pauseRecording(rec, at(second));
  second += 45;
  resumeRecording(rec, at(second));
  for (let r = 0; r < 2; r++) {
    ride(300, 250, "work");
    ride(120, 150, "recover");
  }
  endRecording(rec, at(second), "cooldown");
  return rec;
}

describe("a ride from Rulle, read back by Kadence's own decoder", () => {
  const rec = session({ power: true, hr: true });
  const bytes = rideToFit(rec, { localOffsetSeconds: 3600 });
  const fit = decodeFit(bytes, { strictCrc: true });

  it("is a valid activity file: indoor cycling, by Kadence Rulle", () => {
    expect(fit.crcOk).toBe(true);
    expect(fit.manufacturer).toBe(255);
    expect(fit.sport).toBe(SPORT.cycling);
    expect(fit.subSport).toBe(SUB_SPORT.indoorCycling);
  });

  it("has a record for every second ridden and no position in any of them", () => {
    expect(fit.records).toHaveLength(rec.t.length);
    expect(fit.records.every((r) => r.lat === undefined && r.lon === undefined)).toBe(true);
    expect(fit.records[0]).toMatchObject({ t: START, power: 160, cadence: 90, hr: 136 });
  });

  it("has a lap per block, and the session's totals", () => {
    expect(fit.laps).toHaveLength(5);
    expect(fit.laps[1]).toMatchObject({ avgPower: 250, timerSeconds: 300 });
    const [s] = fit.sessions;
    // 600 s at 160 W, 600 at 250 and 240 at 150: 282 kJ over 1440 s.
    expect(s).toMatchObject({ elapsedSeconds: 1485, timerSeconds: 1440, avgPower: 196 });
  });

  it("marks the pause with the timer, so the gap is a pause and not riding", () => {
    const timer = fit.events.filter((e) => e.event === 0).map((e) => [e.eventType, e.t]);
    expect(timer).toEqual([
      [0, START],
      [4, at(600)],
      [0, at(645)],
      [4, at(1485)],
    ]);
    const summary = summarizeActivity(fit);
    expect(summary.movingSeconds).toBe(1440);
    expect(summary.elapsedSeconds).toBe(1485);
  });

  it("comes into Kadence like any ride: a bike ride with its load from the watts", () => {
    const values = activityFromFit(bytes, { ftp: 250, thresholdHr: 170 });
    expect(values.sport).toBe("bike");
    expect(values.loadMethod).toBe("power");
    expect(values.load).toBeGreaterThan(20);
    expect(values.movingSeconds).toBe(1440);
    expect(values.avgPower).toBe(196);
    expect(values.laps).toHaveLength(5);
    expect(values.distanceM).toBeGreaterThan(10_000);
  });
});

describe("a ride with a heart-rate strap and nothing else", () => {
  const bytes = rideToFit(session({ power: false, hr: true }));

  it("comes in with its load from the pulse", () => {
    const values = activityFromFit(bytes, { ftp: 250, thresholdHr: 170 });
    expect(values.loadMethod).toBe("hr");
    expect(values.avgPower).toBeNull();
    expect(values.movingSeconds).toBe(1440);
  });
});
