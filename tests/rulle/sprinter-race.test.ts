import { describe, expect, it } from "vitest";
import { RideEngine } from "@/components/rulle/ride/engine";
import { Race, type RaceLive } from "@/components/rulle/ride/race";
import { Sensors } from "@/components/rulle/ride/sensors";
import { buildCourse, type ChallengerAt, type RoutePoint } from "@/modules/rulle";

const T0 = Date.UTC(2026, 9, 5, 17, 0, 0);

/** A straight road of `km` kilometres, flat or climbing `grade` all the way. */
function road(km: number, grade: number) {
  const points: RoutePoint[] = Array.from({ length: km * 10 + 1 }, (_, i) => ({
    lat: 55.7 + (0.1 / 111.2) * i,
    lon: 9.5,
    ele: 10 + 100 * grade * i,
  }));
  return buildCourse({ name: "Vej", points });
}

/** A free ride on `watts`; the sprinter called after five seconds; how he rode, each tenth of a second. */
function race(km: number, grade: number, watts: number, seconds: number) {
  const sensors = new Sensors();
  const engine = new RideEngine(null, road(km, grade), sensors, {
    target: () => undefined,
    cue: () => undefined,
    finished: () => undefined,
  });
  engine.start(T0);
  const seen: { at: ChallengerAt | null; gap: number | null; live: RaceLive }[] = [];
  for (let tick = 0; tick < seconds * 10; tick++) {
    const at = T0 + tick * 100;
    sensors.fromTrainer({ power: watts, cadence: 90 }, at);
    engine.tick(at);
    if (tick === 50) engine.shown.race.call("sprinter");
    const live = engine.live(at).race;
    seen.push({
      at: engine.shown.race.at(0),
      gap: live?.phase === "racing" ? live.gap : null,
      live,
    });
  }
  return { seen, result: seen.map((s) => s.live).find((live) => live?.phase === "over") };
}

describe("the sprinter's race (ADR 0075)", () => {
  it("comes only when called by TURBO on a free ride, never into a session", () => {
    const session = new Race(road(5, 0));
    session.advance(100, 10, 250, 0.1, false);
    session.call("sprinter");
    expect(session.live()).toBeNull();
    const free = new Race(road(5, 0));
    free.advance(100, 10, 250, 0.1, true);
    free.call("sprinter");
    expect(free.live()).toMatchObject({ phase: "countdown", who: "sprinter" });
  });

  it("sits on the wheel on the flat whatever the rider rides, sprints from 200 m, throws his bike in the air and wins", () => {
    const { seen, result } = race(5, 0, 330, 260);
    const racing = seen.filter((s) => s.gap !== null && s.at!.effort === "steady");
    // A wheel's length behind, once he has dropped back from beside the rider.
    const settled = racing.slice(60);
    expect(settled.length).toBeGreaterThan(1000);
    for (const { gap } of settled) expect(gap).toBeGreaterThan(1.5);
    for (const { gap } of settled) expect(gap).toBeLessThan(2.5);
    const efforts = new Set(seen.map((s) => s.at?.effort));
    expect(efforts).toContain("sprint");
    expect(efforts).toContain("throw");
    expect(Math.max(...seen.map((s) => s.at?.jump ?? 0))).toBeGreaterThan(0.5);
    expect(result).toMatchObject({ phase: "over", won: false });
  });

  it("can be ridden tired up a long climb: dropped, he has no sprint left, and the rider wins", () => {
    const { seen, result } = race(8, 0.06, 560, 260);
    const efforts = new Set(seen.map((s) => s.at?.effort));
    expect(efforts).not.toContain("sprint");
    expect(result).toMatchObject({ phase: "over", won: true });
    expect(result?.phase === "over" && result.margin).toBeGreaterThan(50);
  });
});
