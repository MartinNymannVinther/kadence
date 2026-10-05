import { describe, expect, it } from "vitest";
import { RideEngine } from "@/components/rulle/ride/engine";
import { Race, type RaceLive } from "@/components/rulle/ride/race";
import { Sensors } from "@/components/rulle/ride/sensors";
import { buildCourse, challengeIn, challengerWatts, type RoutePoint } from "@/modules/rulle";

const T0 = Date.UTC(2026, 9, 4, 17, 0, 0);

/** A straight, flat road of five kilometres. */
const flat: RoutePoint[] = Array.from({ length: 51 }, (_, i) => ({
  lat: 55.7 + (5 / 111.2) * (i / 50),
  lon: 9.5,
  ele: 10,
}));
const course = buildCourse({ name: "Flad", points: flat });

/** A ride with no session, so the rider sets their own watts; what the race said each second. */
function setup(base: number) {
  const sensors = new Sensors();
  const engine = new RideEngine(null, course, sensors, {
    target: () => undefined,
    cue: () => undefined,
    finished: () => undefined,
  });
  const said: RaceLive[] = [];
  const ride = (from: number, to: number, watts = base) => {
    for (let s = from; s < to; s++) {
      for (const q of [0, 100, 200, 300, 400, 500, 600, 700, 800, 900]) {
        const at = T0 + s * 1000 + q;
        sensors.fromTrainer({ power: watts, cadence: 90 }, at);
        engine.tick(at);
      }
      said.push(engine.live(T0 + s * 1000 + 900).race);
    }
  };
  engine.start(T0);
  return { engine, ride, said };
}

/** Has him come up beside the rider `seconds` into the ride. */
function challenge(engine: RideEngine, seconds: number) {
  const at = T0 + seconds * 1000;
  engine.shown.race.begin(engine.positionAt(at).distance, engine.live(at).speed);
}

const over = (said: RaceLive[]) => said.find((r) => r?.phase === "over");

describe("the challenger's race", () => {
  it("only comes to a free ride, of himself or called by name, never into a session", () => {
    const k = Array.from({ length: 50 }, (_, i) => i).find((i) => challengeIn(course, i))!;
    const start = challengeIn(course, k)!.at;
    const session = new Race(course);
    const free = new Race(course);
    for (let at = start - 50; at < start + 50; at++) {
      session.advance(at, 10, 250, 0.1, false);
      free.advance(at, 10, 250, 0.1, true);
    }
    expect(session.live()).toBeNull();
    expect(free.live()?.phase).toBe("countdown");
    session.call();
    expect(session.live()).toBeNull();
    const called = new Race(course);
    called.advance(100, 10, 250, 0.1, true);
    called.call();
    expect(called.live()?.phase).toBe("countdown");
  });

  it("counts down from ten alongside at the rider's speed, then starts level", () => {
    const raced = setup(300);
    raced.ride(0, 5);
    challenge(raced.engine, 5);
    raced.ride(5, 16);
    const counts = raced.said.slice(5, 15).map((r) => (r?.phase === "countdown" ? r.count : 0));
    expect(counts).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    const start = raced.said[15];
    expect(start?.phase).toBe("racing");
    expect(Math.abs(start?.phase === "racing" ? start.gap : 99)).toBeLessThan(1);
  });

  it("sprints out of the saddle on his 800 W: his first seconds and his last 200 metres, not between", () => {
    const raced = setup(480);
    raced.ride(0, 5);
    challenge(raced.engine, 5);
    const race = raced.engine.shown.race;
    const sprinting = () => race.at(0)?.effort === "sprint";
    raced.ride(5, 15);
    expect(sprinting()).toBe(false);
    raced.ride(15, 19);
    expect(sprinting()).toBe(true);
    raced.ride(19, 30);
    expect(sprinting()).toBe(false);
    const left = () => {
      const live = race.live();
      return live?.phase === "racing" ? live.left : Infinity;
    };
    for (let s = 30; left() > 150 && s < 400; s++) raced.ride(s, s + 1);
    expect(sprinting()).toBe(true);
  });

  it("rides away from a rider on 200 W and wins, and what is recorded is what was ridden", () => {
    const plain = setup(200);
    plain.ride(0, 280);
    const raced = setup(200);
    raced.ride(0, 5);
    challenge(raced.engine, 5);
    raced.ride(5, 280);
    const result = over(raced.said);
    expect(result).toMatchObject({ phase: "over", won: false });
    expect(result?.phase === "over" && result.margin).toBeGreaterThan(50);
    const recorded = (e: RideEngine) => e.recording!.distance.at(-1)!;
    expect(recorded(raced.engine)).toBeCloseTo(recorded(plain.engine), 6);
    expect(raced.engine.recording!.power).toEqual(plain.engine.recording!.power);
  });

  it("goes wheel to wheel with a rider on 480 W, each in the other's slipstream, and wins the sprint", () => {
    const raced = setup(480);
    raced.ride(0, 5);
    challenge(raced.engine, 5);
    raced.ride(5, 200);
    const together = raced.said
      .slice(45)
      .filter((r) => r?.phase === "racing" && r.left > 250)
      .map((r) => (r?.phase === "racing" ? r.gap : 0));
    expect(together.length).toBeGreaterThan(30);
    for (const gap of together) expect(Math.abs(gap)).toBeLessThan(3);
    expect(over(raced.said)).toMatchObject({ phase: "over", won: false });
  });

  it("rides his own watts whatever the rider does: an attack he does not answer wins", () => {
    const raced = setup(480);
    raced.ride(0, 5);
    challenge(raced.engine, 5);
    raced.ride(5, 125);
    raced.ride(125, 200, 1000);
    const result = over(raced.said);
    expect(result).toMatchObject({ phase: "over", won: true });
    expect(result?.phase === "over" && result.margin).toBeGreaterThan(50);
  });

  it("runs on under the developer's warp as the rider does, forwards and back, beside them", () => {
    for (const factor of [8, -4]) {
      const raced = setup(300);
      raced.engine.shown.warp.factor = 4;
      raced.ride(0, 30);
      raced.engine.shown.warp.factor = factor;
      challenge(raced.engine, 30);
      raced.ride(30, 40);
      // The last of the countdown: still beside the rider, however far the warp took them.
      const race = raced.engine.shown.race;
      const rider = raced.engine.positionAt(T0 + 39_900).distance;
      expect(Math.abs(rider - race.at(0)!.distance)).toBeLessThan(1);
      // Then the race, on his own speed at the warp's pace: eight times it, or four back.
      raced.ride(40, 43);
      expect(raced.said[42]?.phase).toBe("racing");
      const now = race.at(0)!;
      expect(race.at(0.5)!.distance - now.distance).toBeCloseTo(0.5 * factor * now.speed, 6);
    }
  });

  it("gives the WATT avatar the slipstream on its own watts and weight, whatever the trainer reads", () => {
    /** The avatar at his weight and, after a second eased off the back, his very watts. */
    const gaps = (trainer: number) => {
      const raced = setup(trainer);
      raced.ride(0, 1);
      raced.engine.shown.cheat.toggle(raced.engine.live(T0 + 1000).speed, 0, "watts", 0);
      const dial = raced.engine.shown.cheat.dial;
      dial.kg = 66;
      dial.watts = 360;
      raced.ride(1, 40);
      challenge(raced.engine, 40);
      for (let s = 40; s < 110; s++) {
        const since = s - 50;
        dial.watts = since < 0 ? 360 : since < 1 ? 200 : challengerWatts(since, 9999);
        raced.ride(s, s + 1);
      }
      return raced.said.slice(50).map((r) => (r?.phase === "racing" ? r.gap : NaN));
    };
    const low = gaps(150);
    // The same race to the centimetre: only rounding tells the two apart.
    gaps(450).forEach((gap, i) => expect(gap).toBeCloseTo(low[i]!, 2));
    // A metre and more down after easing off, and back in his wheel by his slipstream.
    expect(Math.min(...low.slice(0, 8))).toBeLessThan(-1);
    for (const gap of low.slice(20)) expect(Math.abs(gap)).toBeLessThan(1.5);
  });
});
