import { describe, expect, it } from "vitest";
import { Cheat, CHEAT } from "@/components/rulle/ride/cheat";
import { RideEngine } from "@/components/rulle/ride/engine";
import { Sensors } from "@/components/rulle/ride/sensors";
import { buildCourse, swayAt, type RoutePoint } from "@/modules/rulle";

const T0 = Date.UTC(2026, 9, 2, 17, 0, 0);

/** A straight, flat road of five kilometres. */
const flat: RoutePoint[] = Array.from({ length: 51 }, (_, i) => ({
  lat: 55.7 + (5 / 111.2) * (i / 50),
  lon: 9.5,
  ele: 10,
}));
const course = buildCourse({ name: "Flad", points: flat });

/** `seconds` of the cheat, a tenth at a time, the rider truly riding `speed` from `from`. */
function run(cheat: Cheat, seconds: number, speed = 8, from = 0) {
  let ridden = from;
  for (let k = 0; k < seconds * 10; k++) {
    ridden += speed * 0.1;
    cheat.advance(speed, cheat.shown(ridden, speed), 0.1);
  }
  return ridden;
}

describe("the cheat code's bike", () => {
  it("starts from the speed and the line the rider is shown at, and holds them with no key down", () => {
    const cheat = new Cheat();
    cheat.toggle(8, 100);
    expect(cheat.on).toBe(true);
    expect(cheat.speed(8)).toBe(8);
    expect(cheat.line).toBeCloseTo(swayAt(100), 9);
    run(cheat, 3);
    expect(cheat.speed(8)).toBe(8);
  });

  it("goes faster and slower under the keys, never past 120 km/h nor backwards", () => {
    const cheat = new Cheat();
    cheat.toggle(8, 0);
    cheat.throttle = 1;
    run(cheat, 2);
    expect(cheat.speed(8)).toBeCloseTo(8 + 2 * CHEAT.faster, 6);
    run(cheat, 30);
    expect(cheat.speed(8)).toBeCloseTo(120 / 3.6, 6);
    cheat.throttle = -1;
    run(cheat, 30);
    expect(cheat.speed(8)).toBe(0);
  });

  it("steers across the road, from kerb to kerb and no further, leaning into the turn", () => {
    const cheat = new Cheat();
    cheat.toggle(8, 0);
    cheat.steer = -1;
    run(cheat, 0.3);
    // Steering left, it leans left (positive).
    expect(cheat.lean).toBeGreaterThan(0.1);
    run(cheat, 5);
    expect(cheat.line).toBe(-CHEAT.edge);
    cheat.steer = 1;
    run(cheat, 5);
    expect(cheat.line).toBe(CHEAT.edge);
  });

  it("runs the shown place ahead of the ridden one, by what it rode faster", () => {
    const cheat = new Cheat();
    cheat.toggle(8, 0);
    cheat.throttle = 1;
    const ridden = run(cheat, 4);
    cheat.throttle = 0;
    // 4 s at 8 m/s ridden, 32 m; shown rising 5 m/s every second from 8: ½·5·4² = 40 m more,
    // give or take the tenths it is stepped in.
    expect(Math.abs(cheat.shown(ridden, 8) - ridden - 40)).toBeLessThan(1.5);
  });

  it("turned off, keeps the place it got to and glides back to the rider's own line", () => {
    const cheat = new Cheat();
    cheat.toggle(8, 0);
    cheat.steer = 1;
    let ridden = run(cheat, 2);
    const ahead = cheat.shown(ridden, 8) - ridden;
    cheat.toggle(8, cheat.shown(ridden, 8));
    expect(cheat.on).toBe(false);
    expect(cheat.speed(8)).toBe(8);
    ridden = run(cheat, 5, 8, ridden);
    expect(cheat.shown(ridden, 8) - ridden).toBeCloseTo(ahead, 6);
    expect(cheat.line).toBeNull();
    expect(Math.abs(cheat.lean)).toBeLessThan(0.01);
  });
});

describe("the cheat code in a ride", () => {
  function setup() {
    const sensors = new Sensors();
    const engine = new RideEngine(null, course, sensors, {
      target: () => undefined,
      cue: () => undefined,
      finished: () => undefined,
    });
    const ride = (from: number, to: number) => {
      for (let s = from; s < to; s++)
        for (const q of [0, 250, 500, 750]) {
          const at = T0 + s * 1000 + q;
          sensors.fromTrainer({ power: 200, cadence: 90 }, at);
          engine.tick(at);
        }
    };
    return { engine, ride };
  }

  it("moves what is shown, and records only what was ridden", () => {
    const plain = setup();
    plain.engine.start(T0);
    plain.ride(0, 40);
    const cheat = setup();
    cheat.engine.start(T0);
    cheat.ride(0, 5);
    cheat.engine.shown.cheat.toggle(cheat.engine.live(T0 + 5000).speed, 0);
    cheat.engine.shown.cheat.hold(1, 0);
    cheat.ride(5, 40);
    const at = T0 + 40_000;
    expect(cheat.engine.live(at).cheat).toBe(true);
    expect(cheat.engine.live(at).speed).toBeCloseTo(120 / 3.6, 3);
    expect(cheat.engine.positionAt(at).distance).toBeGreaterThan(
      2 * plain.engine.live(at).distance,
    );
    // The watts, the time and the distance recorded are the same as without it.
    const recorded = (e: RideEngine) => e.recording!.distance.at(-1)!;
    expect(recorded(cheat.engine)).toBeCloseTo(recorded(plain.engine), 6);
    expect(cheat.engine.recording!.power).toEqual(plain.engine.recording!.power);
  });
});
