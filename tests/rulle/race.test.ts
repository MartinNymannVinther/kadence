import { describe, expect, it } from "vitest";
import { RideEngine } from "@/components/rulle/ride/engine";
import { Race, type RaceLive } from "@/components/rulle/ride/race";
import { Sensors } from "@/components/rulle/ride/sensors";
import { buildCourse, challengeIn, type RoutePoint } from "@/modules/rulle";

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
  it("only comes to a rider who sets their own watts", () => {
    const k = Array.from({ length: 50 }, (_, i) => i).find((i) => challengeIn(course, i))!;
    const start = challengeIn(course, k)!.at;
    const held = new Race(course);
    const free = new Race(course);
    for (let at = start - 50; at < start + 50; at++) {
      held.advance(at, 10, 250, 0.1, false);
      free.advance(at, 10, 250, 0.1, true);
    }
    expect(held.live()).toBeNull();
    expect(free.live()?.phase).toBe("racing");
  });

  it("rides away from a rider on 200 W and wins, and what is recorded is what was ridden", () => {
    const plain = setup(200);
    plain.ride(0, 260);
    const raced = setup(200);
    raced.ride(0, 5);
    challenge(raced.engine, 5);
    raced.ride(5, 260);
    const result = over(raced.said);
    expect(result).toMatchObject({ phase: "over", won: false });
    expect(result?.phase === "over" && result.margin).toBeGreaterThan(50);
    const recorded = (e: RideEngine) => e.recording!.distance.at(-1)!;
    expect(recorded(raced.engine)).toBeCloseTo(recorded(plain.engine), 6);
    expect(raced.engine.recording!.power).toEqual(plain.engine.recording!.power);
  });

  it("attacks a strong rider, who works back up to him in his slipstream", () => {
    const raced = setup(480);
    raced.ride(0, 5);
    challenge(raced.engine, 5);
    raced.ride(5, 125);
    const gapAt = (second: number) => {
      const r = raced.said[second];
      return r?.phase === "racing" ? r.gap : NaN;
    };
    // His 900 W and his minute put him well clear; the rider on 480 W comes back.
    expect(gapAt(40)).toBeLessThan(-20);
    expect(Math.abs(gapAt(124))).toBeLessThan(4);
  });

  it("holds the wheel of a rider who attacks him, and comes round in the sprint", () => {
    const raced = setup(480);
    raced.ride(0, 5);
    challenge(raced.engine, 5);
    raced.ride(5, 125);
    raced.ride(125, 200, 700);
    const attack = raced.said
      .slice(126)
      .filter((r) => r?.phase === "racing" && r.left > 250)
      .map((r) => (r?.phase === "racing" ? r.gap : 0));
    expect(attack.length).toBeGreaterThan(5);
    for (const gap of attack) expect(Math.abs(gap)).toBeLessThan(2.5);
    expect(over(raced.said)).toMatchObject({ phase: "over", won: false });
  });

  it("is beaten by a rider who sprints from his wheel far harder than his 800 W", () => {
    const raced = setup(480);
    raced.ride(0, 5);
    challenge(raced.engine, 5);
    raced.ride(5, 130);
    raced.ride(130, 200, 1500);
    const result = over(raced.said);
    expect(result).toMatchObject({ phase: "over", won: true });
    expect(result?.phase === "over" && result.margin).toBeGreaterThan(5);
  });
});
