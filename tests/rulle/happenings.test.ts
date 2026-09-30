import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildCourse,
  chalkOf,
  drinksIn,
  flagsOf,
  herdsOf,
  pauseStage,
  readRouteGpx,
  riseOver,
  stopKind,
  visitsOnLap,
  type RoutePoint,
} from "@/modules/rulle";

const vejle = buildCourse(
  readRouteGpx(readFileSync("public/rulle/routes/vejle-munkebjerg.gpx", "utf8")),
);

/** Ten flat kilometres north from Vejle, ridden out and back. */
const flatPoints: RoutePoint[] = Array.from({ length: 51 }, (_, i) => ({
  lat: 55.7 + (10 / 111.2) * (i / 50),
  lon: 9.5,
  ele: 10,
}));
const flat = buildCourse({ name: "Flat", points: flatPoints });

const LAPS = Array.from({ length: 24 }, (_, lap) => lap);

describe("the climb with the chalk", () => {
  it("is Kiddesvej on the Vejle route: the steepest 400 m, about ten per cent", () => {
    const chalk = chalkOf(vejle)!;
    expect(chalk.from).toBeGreaterThan(15_200);
    expect(chalk.from).toBeLessThan(15_600);
    expect(chalk.grade).toBeGreaterThan(0.08);
    for (const at of [chalk.name, chalk.bell, chalk.top]) {
      expect(at).toBeGreaterThan(chalk.from);
      expect(at).toBeLessThan(chalk.to);
    }
    expect(chalk.name).toBeLessThan(chalk.bell);
    expect(chalk.bell).toBeLessThan(chalk.top);
  });

  it("is nowhere on a flat route", () => {
    expect(chalkOf(flat)).toBeNull();
  });
});

describe("what passes on the way", () => {
  it("is the same for the same route and lap, and something else a lap later", () => {
    expect(visitsOnLap(vejle, 3)).toEqual(visitsOnLap(vejle, 3));
    const laps = LAPS.map((lap) => JSON.stringify(visitsOnLap(vejle, lap)));
    expect(new Set(laps).size).toBeGreaterThan(LAPS.length / 2);
  });

  it("is rare: a few things a lap, more than a kilometre apart", () => {
    const perLap = LAPS.map((lap) => visitsOnLap(vejle, lap).length);
    // About one every eight or nine minutes at a steady pace.
    expect(perLap.reduce((s, n) => s + n, 0) / LAPS.length).toBeLessThanOrEqual(4.5);
    for (const lap of LAPS) {
      const visits = visitsOnLap(vejle, lap);
      expect(visits.length).toBeGreaterThanOrEqual(1);
      expect(visits.length).toBeLessThanOrEqual(6);
      for (let i = 1; i < visits.length; i++)
        expect(visits[i]!.at - visits[i - 1]!.at).toBeGreaterThan(1000);
      for (const visit of visits) {
        expect(visit.at).toBeGreaterThan(0);
        expect(visit.at).toBeLessThan(vejle.length);
      }
    }
  });

  it("leaves the chalk climb to the chalk", () => {
    const chalk = chalkOf(vejle)!;
    for (const lap of LAPS)
      for (const visit of visitsOnLap(vejle, lap))
        expect(visit.at < chalk.from - 500 || visit.at > chalk.to + 150).toBe(true);
  });

  it("has the cargo bike only where the road climbs, and up Munkebjerg on the first lap", () => {
    // Munkebjerg climbs from the fjord at six kilometres to the plateau at seven.
    expect(
      visitsOnLap(vejle, 0).some((v) => v.kind === "cargo" && v.at > 5_900 && v.at < 7_000),
    ).toBe(true);
    for (const lap of LAPS)
      for (const visit of visitsOnLap(vejle, lap))
        if (visit.kind === "cargo") expect(riseOver(vejle, visit.at, 200)).toBeGreaterThan(0.03);
  });

  it("never has the same thing twice in a row on the flat", () => {
    for (const lap of LAPS) {
      const visits = visitsOnLap(flat, lap);
      for (let i = 1; i < visits.length; i++) expect(visits[i]!.kind).not.toBe(visits[i - 1]!.kind);
    }
  });

  it("on a flat route has no cargo bike, but still something now and then", () => {
    const all = LAPS.flatMap((lap) => visitsOnLap(flat, lap));
    expect(all.some((v) => v.kind === "cargo")).toBe(false);
    for (const kind of ["car", "scooter", "dog"])
      expect(all.some((v) => v.kind === kind)).toBe(true);
  });
});

describe("by the road", () => {
  it("has a few herds and flags, the same every time, apart from each other and the chalk", () => {
    const herds = herdsOf(vejle);
    const flags = flagsOf(vejle);
    expect(herdsOf(vejle)).toEqual(herds);
    expect(herds.length).toBeGreaterThanOrEqual(2);
    expect(herds.length).toBeLessThanOrEqual(5);
    expect(flags.length).toBeGreaterThanOrEqual(1);
    expect(flags.length).toBeLessThanOrEqual(4);
    const chalk = chalkOf(vejle)!;
    for (const herd of herds) {
      expect(herd.cows).toBeGreaterThanOrEqual(4);
      expect(herd.cows).toBeLessThanOrEqual(8);
      expect(herd.at + herd.length < chalk.from || herd.at > chalk.to).toBe(true);
      for (const flag of flags)
        expect(flag.at < herd.at - 150 || flag.at > herd.at + herd.length + 150).toBe(true);
    }
  });
});

describe("a pause", () => {
  it("is a drink from the bottle, then the café, a second cup, and sleep", () => {
    expect(pauseStage(0)).toBe("bottle");
    expect(pauseStage(14.9)).toBe("bottle");
    expect(pauseStage(15)).toBe("cafe");
    expect(pauseStage(179)).toBe("cafe");
    expect(pauseStage(180)).toBe("second");
    expect(pauseStage(599)).toBe("second");
    expect(pauseStage(600)).toBe("asleep");
  });

  it("comes to no cup at the bottle, one at the café, two after three minutes", () => {
    expect(drinksIn(10)).toBe(0);
    expect(drinksIn(60)).toBe(1);
    expect(drinksIn(200)).toBe(2);
    expect(drinksIn(3600)).toBe(2);
  });

  it("is at the café the first time, and the same stop every time for the same pause", () => {
    expect(stopKind(0)).toBe("cafe");
    const kinds = Array.from({ length: 30 }, (_, i) => stopKind(i));
    expect(kinds).toEqual(Array.from({ length: 30 }, (_, i) => stopKind(i)));
    expect(kinds).toContain("stand");
    expect(kinds.filter((k) => k === "cafe").length).toBeGreaterThan(10);
  });
});
