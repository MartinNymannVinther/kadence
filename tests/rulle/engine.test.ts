import { describe, expect, it } from "vitest";
import { RideEngine } from "@/components/rulle/ride/engine";
import { Sensors } from "@/components/rulle/ride/sensors";
import { Warp } from "@/components/rulle/ride/warp";
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

describe("the small things in a session", () => {
  const hard: BikeStructure = {
    kind: "bike",
    steps: [
      { kind: "step", intent: "warmup", seconds: 60, target: { kind: "zone", zone: 2 } },
      {
        kind: "step",
        intent: "work",
        seconds: 60,
        target: { kind: "ftp_pct", low: 100, high: 100 },
      },
      { kind: "step", intent: "recover", seconds: 60, target: { kind: "zone", zone: 1 } },
    ],
  };

  it("rings a cowbell ten, eight and six seconds before a hard block ends, and not in an easy one", () => {
    const { engine, cues, ride } = setup(hard);
    engine.start(T0);
    ride(0, 125);
    expect(cues).toEqual([
      ...["count", "count", "count", "change"],
      ...["cheer", "cheer", "cheer", "count", "count", "count", "change"],
    ]);
  });

  it("says the session was ridden on target when every block with watts was", () => {
    const { engine, ride } = setup(hard);
    engine.start(T0);
    // Each block at its own watts: zone 2 for the warm-up, FTP, zone 1.
    ride(0, 60, 163);
    ride(60, 120, 250);
    ride(120, 185, 125);
    expect(engine.status).toBe("finished");
    expect(engine.allOnTarget()).toBe(true);
  });

  it("does not, when a block was ridden under, or skipped", () => {
    const under = setup(hard);
    under.engine.start(T0);
    under.ride(0, 60, 163);
    under.ride(60, 120, 180);
    under.ride(120, 185, 125);
    expect(under.engine.allOnTarget()).toBe(false);

    const skipped = setup(hard);
    skipped.engine.start(T0);
    skipped.ride(0, 60, 163);
    skipped.engine.skip(T0 + 60_000);
    skipped.ride(60, 125, 125);
    expect(skipped.engine.allOnTarget()).toBe(false);
  });

  it("cannot say, when nothing measured the watts", () => {
    const { engine, ride } = setup(hard);
    engine.start(T0);
    ride(0, 185, null);
    expect(engine.allOnTarget()).toBeNull();
  });
});

describe("the warp, only under development", () => {
  it("runs the shown place faster, or backwards, from where the rider is", () => {
    const warp = new Warp();
    warp.advance(10, 1);
    expect(warp.shown(10, 10)).toBe(10);
    warp.factor = 4;
    warp.advance(10, 1);
    // Ridden 10 m more, shown 40 m more.
    expect(warp.shown(20, 10)).toBe(50);
    // Between two steps it runs on at four times the speed too.
    expect(warp.shown(20 + 5, 10, 0.5)).toBe(50 + 20);
    warp.factor = -2;
    warp.advance(10, 1);
    // Ridden 10 m more, shown 20 m back.
    expect(warp.shown(30, 10)).toBe(30);
    // Standing still, it still runs.
    warp.factor = 20;
    const before = warp.shown(30, 0);
    warp.advance(0, 1);
    expect(warp.shown(30, 0) - before).toBeGreaterThan(100);
  });

  it("moves what is shown, and records only what was ridden", () => {
    const plain = setup(null);
    plain.engine.start(T0);
    plain.ride(0, 30);
    const fast = setup(null);
    fast.engine.shown.warp.factor = 8;
    fast.engine.start(T0);
    fast.ride(0, 30);
    const at = T0 + 30_000;
    const ridden = plain.engine.live(at).distance;
    expect(ridden).toBeGreaterThan(150);
    expect(fast.engine.live(at).distance / ridden).toBeGreaterThan(7.5);
    expect(fast.engine.positionAt(at).distance).toBeGreaterThan(7.5 * ridden);
    expect(fast.engine.recording!.distance.at(-1)).toBeCloseTo(
      plain.engine.recording!.distance.at(-1)!,
      6,
    );
  });
});
