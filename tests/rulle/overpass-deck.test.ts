import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ground } from "@/components/rulle/scene/ground";
import { deckLines, SPAN, type DeckLine } from "@/components/rulle/scene/overpass-deck";
import { arcAt } from "@/components/rulle/scene/overpass-line";
import { railsAcross } from "@/components/rulle/scene/overpasses";
import { roadPoint } from "@/components/rulle/scene/road-point";
import { buildCourse, readLand, readRouteGpx, structuresOn } from "@/modules/rulle";

// Vejle–Munkebjerg passes under the railway at the station, under Vejlefjordbroen and under the line to Fredericia.
const course = buildCourse(
  readRouteGpx(readFileSync("public/rulle/routes/vejle-munkebjerg.gpx", "utf8")),
);
const land = readLand(
  JSON.parse(readFileSync("public/rulle/routes/vejle-munkebjerg.land.json", "utf8")),
  course,
)!;
const found = structuresOn(course, land.structures);
const ground = new Ground(course, land, null, found.decks);
const decks = deckLines(course, ground, found.overpasses);

/** Metres the deck climbs a metre along, at `s`. */
const slope = (d: DeckLine, s: number) => d.top(s + 0.5) - d.top(s - 0.5);
/** The land's own slope under a deck: what it has over the road, where it only lies level. */
const landSlope = (d: DeckLine) => {
  const l = d.lifts[0]!;
  return (d.top(l.s + l.hold / 2) - d.top(l.s - l.hold / 2)) / l.hold;
};
const along = (d: DeckLine, from: number, to: number, step: number) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, k) => from + k * step);

describe("the decks of what passes over the road", () => {
  it("are the railway twice and the motorway once on Vejle–Munkebjerg", () => {
    expect(decks.map((d) => d.kind).sort()).toEqual(["motorway", "rail", "rail"]);
  });

  it("leave the room over the road they should, wherever it passes under", () => {
    for (const o of found.overpasses) {
      const road = roadPoint(course, o.along, 0);
      const gap = (d: DeckLine) =>
        Math.min(...d.line.map((p) => Math.hypot(p.x - road.x, p.z - road.z)));
      const deck = [...decks].sort((a, b) => gap(a) - gap(b))[0]!;
      const s = arcAt(deck.line, deck.arc, road.x, road.z);
      expect(deck.top(s) - deck.thick - road.y).toBeGreaterThan(SPAN[deck.kind].clear - 0.05);
    }
  });

  it("lie level over the road, between the walls either side of it", () => {
    for (const d of decks)
      for (const l of d.lifts)
        for (const x of [1, l.hold / 2, l.hold]) {
          // Level, that is, but for the land's own slope from one end to the other.
          const bend = d.top(l.s + x) + d.top(l.s - x) - 2 * d.top(l.s);
          expect(Math.abs(bend)).toBeLessThan(1e-6);
        }
  });

  it("ease down to the land never steeper than what they carry climbs", () => {
    for (const d of decks) {
      const own = landSlope(d);
      for (const s of along(d, 1, d.length - 1, 2))
        expect(Math.abs(slope(d, s) - own)).toBeLessThan(SPAN[d.kind].ramp + 0.002);
    }
  });

  it("bend so gently over the road that a train's carriages hardly kink", () => {
    for (const d of decks.filter((x) => x.kind === "rail"))
      for (const s of along(d, 11, d.length - 11, 3))
        // Less than two degrees between one carriage and the next.
        expect(Math.abs(slope(d, s + 10.4) - slope(d, s - 10.4))).toBeLessThan(0.035);
  });

  it("reach far past the road where a train or a motorway's traffic is to be seen coming", () => {
    // From the road's middle, which lies a few metres off a line drawn along one track of several.
    for (const d of decks) expect(d.length).toBeGreaterThan(2 * (SPAN[d.kind].reach - 10));
  });
});

describe("a railway deck's tracks", () => {
  it("are a pair of rails each, a track to every four and a half metres", () => {
    expect(railsAcross(6)).toEqual([-0.72, 0.72]);
    const two = [-2.97, -1.53, 1.53, 2.97];
    railsAcross(9).forEach((rail, k) => expect(rail).toBeCloseTo(two[k]!, 6));
    expect(railsAcross(16)).toHaveLength(8);
  });
});
