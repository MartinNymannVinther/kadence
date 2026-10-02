import { describe, expect, it } from "vitest";
import { offRoute, roadOf } from "../../scripts/rulle-land/roads";

describe("the roads round a route, as the land script reads them (ADR 0046)", () => {
  it("knows a road's kind and whether it is paved, from the map's tags", () => {
    expect(roadOf({ highway: "secondary" })).toEqual({ kind: "main", unpaved: false });
    expect(roadOf({ highway: "residential" })).toEqual({ kind: "minor", unpaved: false });
    expect(roadOf({ highway: "service", service: "driveway" })).toEqual({
      kind: "service",
      unpaved: false,
    });
    // A farm track is gravel unless it says otherwise; a path is earth, a pavement is not.
    expect(roadOf({ highway: "track" })).toEqual({ kind: "track", unpaved: true });
    expect(roadOf({ highway: "track", tracktype: "grade1" })?.unpaved).toBe(false);
    expect(roadOf({ highway: "track", surface: "asphalt" })?.unpaved).toBe(false);
    expect(roadOf({ highway: "path" })).toEqual({ kind: "foot", unpaved: true });
    expect(roadOf({ highway: "footway" })).toEqual({ kind: "foot", unpaved: false });
    expect(roadOf({ highway: "cycleway", surface: "fine_gravel" })).toEqual({
      kind: "cycle",
      unpaved: true,
    });
  });

  it("leaves out what is no road on the land", () => {
    for (const highway of ["steps", "platform", "proposed", "construction", "raceway"])
      expect(roadOf({ highway })).toBeNull();
    expect(roadOf({ highway: "pedestrian", area: "yes" })).toBeNull();
    expect(roadOf({ highway: "residential", tunnel: "yes" })).toBeNull();
    expect(roadOf({ highway: "footway", indoor: "yes" })).toBeNull();
    // Through a building's passage it is still the street.
    expect(roadOf({ highway: "residential", tunnel: "building_passage" })?.kind).toBe("minor");
    expect(roadOf({ building: "yes" })).toBeNull();
  });

  it("keeps the pieces of a road the route does not run along, each meeting it", () => {
    const p = (x: number) => ({ x, y: 0 });
    const line = [p(0), p(10), p(20), p(30), p(40), p(50)];
    // The route runs along it from 20 to 40.
    const isRoute = (a: { x: number }, b: { x: number }) => a.x >= 20 && b.x <= 40;
    expect(offRoute(line, isRoute)).toEqual([
      [p(0), p(10), p(20)],
      [p(40), p(50)],
    ]);
    expect(offRoute(line, () => true)).toEqual([]);
    expect(offRoute(line, () => false)).toEqual([line]);
  });
});
