import { describe, expect, it } from "vitest";
import { RideEngine } from "@/components/rulle/ride/engine";
import { Sensors } from "@/components/rulle/ride/sensors";
import { buildCourse, buildTimeline, totals, type RoutePoint } from "@/modules/rulle";
import type { BikeStructure } from "@/modules/workouts/structure";

const T0 = Date.UTC(2026, 10, 3, 17, 0, 0);

/** A straight, flat road of five kilometres, ridden out and back. */
const flat: RoutePoint[] = Array.from({ length: 51 }, (_, i) => ({
  lat: 55.7 + (5 / 111.2) * (i / 50),
  lon: 9.5,
  ele: 10,
}));
const course = buildCourse({ name: "Flad", points: flat });

const short: BikeStructure = {
  kind: "bike",
  steps: [
    { kind: "step", intent: "warmup", seconds: 60, target: { kind: "zone", zone: 2 } },
    { kind: "step", intent: "work", seconds: 30, target: { kind: "zone", zone: 4 } },
    { kind: "step", intent: "work", seconds: 20, target: { kind: "open" } },
    { kind: "step", intent: "cooldown", seconds: 30, target: { kind: "zone", zone: 1 } },
  ],
};
const timeline = buildTimeline(short, { ftp: 250, thresholdHr: 170 });

function setup(structure: BikeStructure | null = short) {
  const sensors = new Sensors();
  const targets: (number | null)[] = [];
  const cues: string[] = [];
  let finished = 0;
  const engine = new RideEngine(
    structure ? buildTimeline(structure, { ftp: 250, thresholdHr: 170 }) : null,
    course,
    sensors,
    {
      target: (watts) => targets.push(watts),
      cue: (kind) => cues.push(kind),
      finished: () => finished++,
    },
  );
  /** Rides from second `from` to `to`, a reading and four ticks a second. */
  const ride = (from: number, to: number, watts: number | null = 200, cadence = 90) => {
    for (let s = from; s < to; s++)
      for (const q of [0, 250, 500, 750]) {
        const at = T0 + s * 1000 + q;
        if (watts !== null) sensors.fromTrainer({ power: watts, cadence }, at);
        engine.tick(at);
      }
  };
  return { engine, sensors, targets, cues, ride, finished: () => finished };
}

describe("a session on the trainer", () => {
  it("sets each block's watts as it begins, and a flat road for the free one", () => {
    const { engine, targets, ride } = setup();
    engine.start(T0);
    ride(0, 141);
    // Zone 2, zone 4, open (free), zone 1 — then the end lets go.
    expect(targets).toEqual([163, 245, null, 125, null]);
  });

  it("closes a lap for every block, with its intent, and ends when the plan does", () => {
    const { engine, ride, finished } = setup();
    engine.start(T0);
    ride(0, 145);
    expect(engine.status).toBe("finished");
    expect(finished()).toBe(1);
    expect(engine.recording!.laps.map((l) => [l.from, l.to, l.intent])).toEqual([
      [0, 60, "warmup"],
      [60, 90, "work"],
      [90, 110, "work"],
      [110, 140, "cooldown"],
    ]);
    expect(totals(engine.recording!)).toMatchObject({ timerSeconds: 140, avgPower: 200 });
  });

  it("counts down the last three seconds of each block, and marks each change", () => {
    const { engine, cues, ride } = setup();
    engine.start(T0);
    ride(0, 61);
    expect(cues).toEqual(["count", "count", "count", "change"]);
  });

  it("moves the rider along the course at the speed the watts make", () => {
    const { engine, ride } = setup();
    engine.start(T0);
    ride(0, 60);
    const live = engine.live(T0 + 60_000);
    // 200 W on the flat settles near 33 km/h, from a standstill.
    expect(live.speed * 3.6).toBeGreaterThan(30);
    expect(live.distance).toBeGreaterThan(400);
    expect(engine.recording!.distance.at(-1)).toBeGreaterThan(400);
  });
});

describe("the rider in charge", () => {
  it("pauses by itself when the legs stop, and goes on when they start", () => {
    const { engine, targets, ride } = setup();
    engine.start(T0);
    ride(0, 20);
    ride(20, 30, 0, 0);
    expect(engine.status).toBe("paused");
    expect(engine.autoPaused).toBe(true);
    expect(targets.at(-1)).toBeNull();
    const pausedAt = engine.live(T0 + 29_000).second;
    ride(30, 40);
    expect(engine.status).toBe("riding");
    expect(targets.at(-1)).toBe(163);
    // The plan stood still through the pause.
    expect(engine.live(T0 + 40_000).second).toBeLessThan(pausedAt + 11);
    expect(engine.recording!.pauses).toHaveLength(1);
  });

  it("stays paused, when the rider paused, until the rider goes on", () => {
    const { engine, ride } = setup();
    engine.start(T0);
    ride(0, 10);
    engine.pause(T0 + 10_000);
    ride(10, 20);
    expect(engine.status).toBe("paused");
    engine.resume(T0 + 20_000);
    expect(engine.status).toBe("riding");
  });

  it("skips to the next block, closing the lap of the one left", () => {
    const { engine, targets, ride } = setup();
    engine.start(T0);
    ride(0, 10);
    engine.skip(T0 + 10_000);
    expect(targets.at(-1)).toBe(245);
    expect(engine.recording!.laps).toEqual([{ from: 0, to: 10, intent: "warmup" }]);
    expect(engine.live(T0 + 10_000).block?.index).toBe(1);
  });

  it("turns the watts down and up in five per cent steps, and ERG off and on", () => {
    const { engine, targets, ride } = setup();
    engine.start(T0);
    ride(0, 5);
    engine.setIntensity(0.9);
    engine.setIntensity(0.3);
    engine.setErg(false);
    engine.setErg(true);
    expect(targets).toEqual([163, 147, 82, null, 82]);
    expect(engine.intensity).toBe(0.5);
  });
});

describe("a ride without a power source", () => {
  it("moves the landscape at the block's watts, and records no speed or distance", () => {
    const { engine, sensors, ride } = setup();
    for (let s = 0; s < 30; s++) sensors.fromStrap(140, T0 + s * 1000);
    engine.start(T0);
    ride(0, 30, null);
    expect(engine.status).toBe("riding");
    expect(engine.live(T0 + 30_000).distance).toBeGreaterThan(100);
    expect(engine.recording!.distance.every((d) => d === null)).toBe(true);
    expect(engine.recording!.hr.every((h) => h === 140)).toBe(true);
  });
});

describe("a ride without a session", () => {
  it("has no targets, and ends when the rider says so", () => {
    const { engine, targets, ride } = setup(null);
    engine.start(T0);
    ride(0, 300);
    expect(engine.status).toBe("riding");
    engine.finish(T0 + 300_000);
    expect(engine.status).toBe("finished");
    expect(targets.every((t) => t === null)).toBe(true);
    expect(engine.recording!.laps).toEqual([{ from: 0, to: 300, intent: "steady" }]);
    expect(timeline.seconds).toBe(140);
  });
});
