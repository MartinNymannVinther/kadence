import { describe, expect, it } from "vitest";
import { Cheat } from "@/components/rulle/ride/cheat";
import { RideEngine } from "@/components/rulle/ride/engine";
import { Sensors } from "@/components/rulle/ride/sensors";
import { WATT_DIAL, WattDial } from "@/components/rulle/ride/watt-dial";
import { buildCourse, steadySpeed, type RoutePoint } from "@/modules/rulle";

const T0 = Date.UTC(2026, 9, 2, 17, 0, 0);

/** A straight, flat road of five kilometres. */
const flat: RoutePoint[] = Array.from({ length: 51 }, (_, i) => ({
  lat: 55.7 + (5 / 111.2) * (i / 50),
  lon: 9.5,
  ele: 10,
}));
const course = buildCourse({ name: "Flad", points: flat });

/** `seconds` of the cheat, a tenth at a time, up `grade`, the rider truly riding `speed`. */
function run(cheat: Cheat, seconds: number, grade = 0, speed = 8) {
  let ridden = 0;
  for (let k = 0; k < seconds * 10; k++) {
    ridden += speed * 0.1;
    cheat.advance(speed, cheat.shown(ridden, speed), 0.1, grade);
  }
}

describe("the WATT dial", () => {
  it("steps ten watts at a time, between nothing and 1500", () => {
    const dial = new WattDial();
    dial.watts = 200;
    dial.step(1);
    expect(dial.watts).toBe(210);
    dial.watts = 1495;
    dial.step(1);
    expect(dial.watts).toBe(WATT_DIAL.most);
    dial.watts = 4;
    dial.step(-1);
    expect(dial.watts).toBe(0);
  });

  it("in W/kg, steps a tenth of a watt per kilo of the avatar, onto round tenths", () => {
    const dial = new WattDial();
    dial.kg = 60;
    dial.watts = 250;
    dial.toggleUnit();
    expect(dial.watts).toBe(250);
    dial.step(1);
    expect(dial.wkg).toBeCloseTo(4.3, 9);
    expect(dial.watts).toBeCloseTo(258, 9);
  });

  it("steps once when a key goes down, and when it is held, on and on after a moment", () => {
    const dial = new WattDial();
    dial.watts = 200;
    dial.hold(1);
    expect(dial.watts).toBe(210);
    for (let i = 0; i < 3; i++) dial.advance(0.1);
    expect(dial.watts).toBe(210);
    for (let i = 0; i < 7; i++) dial.advance(0.1);
    // Held a second: the steps at 0.4, 0.5 … 1.0 s.
    expect(dial.watts).toBe(280);
    dial.hold(1);
    expect(dial.watts).toBe(280);
    dial.hold(0);
    dial.advance(1);
    expect(dial.watts).toBe(280);
  });

  it("takes over at the watts that hold the speed it was going, and from a standstill gently", () => {
    const dial = new WattDial();
    dial.startFrom(steadySpeed(250, 0), 0);
    expect(dial.watts).toBe(250);
    dial.startFrom(0, 0);
    expect(dial.watts).toBe(WATT_DIAL.floor);
  });

  it("keeps the W/kg as the avatar's weight changes, or the watts in watts, within its bounds", () => {
    const dial = new WattDial();
    dial.watts = 280;
    dial.toggleUnit();
    dial.weigh(1);
    expect(dial.kg).toBe(71);
    expect(dial.watts).toBeCloseTo(284, 9);
    dial.toggleUnit();
    dial.weigh(-1);
    expect(dial.watts).toBeCloseTo(284, 9);
    for (let i = 0; i < 200; i++) dial.weigh(-1);
    expect(dial.kg).toBe(WATT_DIAL.kg.least);
    for (let i = 0; i < 200; i++) dial.weigh(1);
    expect(dial.kg).toBe(WATT_DIAL.kg.most);
  });
});

describe("the WATT cheat code's bike", () => {
  it("goes as fast as the dial's watts take it, settling at their steady speed", () => {
    const cheat = new Cheat();
    cheat.toggle(8, 0, "watts", 0);
    cheat.dial.watts = 300;
    run(cheat, 120);
    // The avatar's 70 kg and the bike are Rulle's own standard mass.
    expect(cheat.speed(8)).toBeCloseTo(steadySpeed(300, 0), 1);
  });

  it("climbs slower as a heavier avatar, at the same watts", () => {
    const light = new Cheat();
    const heavy = new Cheat();
    for (const [cheat, kg] of [
      [light, 50],
      [heavy, 90],
    ] as const) {
      cheat.toggle(5, 0, "watts", 0.06);
      cheat.dial.kg = kg;
      cheat.dial.watts = 300;
      run(cheat, 120, 0.06);
    }
    expect(light.speed(8)).toBeGreaterThan(heavy.speed(8) * 1.4);
  });

  it("goes over from SPURT at the bike's speed, and the same code again turns it off", () => {
    const cheat = new Cheat();
    cheat.toggle(8, 0);
    cheat.hold(1, 0);
    run(cheat, 2);
    const fast = cheat.speed(8);
    cheat.toggle(8, 0, "watts", 0);
    expect(cheat.state()?.mode).toBe("watts");
    expect(cheat.speed(8)).toBe(fast);
    expect(cheat.dial.watts).toBeGreaterThan(WATT_DIAL.floor);
    cheat.toggle(8, 0, "watts", 0);
    expect(cheat.on).toBe(false);
    expect(cheat.state()).toBeNull();
  });

  it("takes up and down as watts, not speed", () => {
    const cheat = new Cheat();
    cheat.toggle(8, 0, "watts", 0);
    const before = cheat.dial.watts;
    cheat.hold(1, 0);
    expect(cheat.dial.watts).toBe(before + 10);
    expect(cheat.state()).toEqual({ mode: "watts", watts: before + 10, kg: 70, unit: "w" });
  });
});

describe("the WATT cheat code in a ride", () => {
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

  it("moves what is shown at the avatar's watts, and records only what was ridden", () => {
    const plain = setup();
    plain.engine.start(T0);
    plain.ride(0, 60);
    const cheat = setup();
    cheat.engine.start(T0);
    cheat.ride(0, 5);
    cheat.engine.shown.cheat.toggle(cheat.engine.live(T0 + 5000).speed, 0, "watts", 0);
    cheat.engine.shown.cheat.dial.watts = 800;
    cheat.ride(5, 60);
    const at = T0 + 60_000;
    expect(cheat.engine.live(at).cheat?.watts).toBe(800);
    expect(cheat.engine.live(at).speed).toBeGreaterThan(plain.engine.live(at).speed * 1.4);
    expect(cheat.engine.positionAt(at).distance).toBeGreaterThan(
      plain.engine.positionAt(at).distance,
    );
    // The watts, the time and the distance recorded are the same as without it.
    const recorded = (e: RideEngine) => e.recording!.distance.at(-1)!;
    expect(recorded(cheat.engine)).toBeCloseTo(recorded(plain.engine), 6);
    expect(cheat.engine.recording!.power).toEqual(plain.engine.recording!.power);
  });
});
