import { describe, expect, it } from "vitest";
import {
  areaKind,
  buildingKind,
  colourOf,
  levelsOf,
  metres,
  roofShape,
} from "../../scripts/rulle-land/tags";

describe("what the map's tags say, in the land's kinds", () => {
  it("reads a height in metres, and nothing where it says nothing that reads", () => {
    expect(metres("105.6")).toBe(105.6);
    expect(metres("35 m")).toBe(35);
    expect(metres("12,5")).toBe(12.5);
    expect(metres("tall")).toBe(0);
    expect(metres(undefined)).toBe(0);
  });

  it("reads storeys, leaving them unsaid (0) where the map does", () => {
    expect(levelsOf({ "building:levels": "5" })).toBe(5);
    expect(levelsOf({ "building:levels": "120" })).toBe(40);
    expect(levelsOf({})).toBe(0);
  });

  it("reads a roof's colour by name or number, and a copper spire as green", () => {
    expect(colourOf("#aa3322")).toBe(0xaa3322);
    expect(colourOf("#a32")).toBe(0xaa3322);
    expect(colourOf("green")).toBe(colourOf("copper"));
    expect(colourOf("Dark Grey")).toBe(colourOf("darkgrey"));
    expect(colourOf("mauve-ish")).toBe(-1);
    expect(colourOf(undefined)).toBe(-1);
  });

  it("knows a roof's shape, and a building from its part", () => {
    expect(roofShape({ "roof:shape": "cone" })).toBe("pyramidal");
    expect(roofShape({ "roof:shape": "onion" })).toBe("dome");
    expect(roofShape({ "roof:shape": "half-hipped" })).toBe("gabled");
    expect(roofShape({})).toBe("unsaid");
    expect(buildingKind({ "building:part": "yes" })).toBe("part");
    expect(buildingKind({ building: "church" })).toBe("church");
    expect(buildingKind({ building: "apartments" })).toBe("block");
    expect(buildingKind({ building: "yes" })).toBe("house");
  });

  it("covers a cemetery and a park, and leaves the rest to the land", () => {
    expect(areaKind({ landuse: "cemetery" })).toBe("cemetery");
    expect(areaKind({ amenity: "grave_yard" })).toBe("cemetery");
    expect(areaKind({ leisure: "park" })).toBe("meadow");
    expect(areaKind({ leisure: "garden" })).toBe("meadow");
    expect(areaKind({ natural: "wood", leaf_type: "needleleaved" })).toBe("conifer");
    expect(areaKind({ highway: "residential" })).toBeNull();
  });
});
