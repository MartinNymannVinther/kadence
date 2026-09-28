import { describe, expect, it } from "vitest";
import { DARK, LIGHT, mapStyle, routeBounds, routeLines } from "@/components/activities/map-style";

/** The map behind a route: a style over the Protomaps v4 layers, and the route as GeoJSON lines. */

const V4_LAYERS = new Set(["earth", "landcover", "landuse", "water", "roads", "buildings"]);

describe("the map style", () => {
  for (const [name, palette] of [
    ["light", LIGHT],
    ["dark", DARK],
  ] as const)
    it(`reads only the basemap's own layers from Kadence's own tiles (${name})`, () => {
      const style = mapStyle("pmtiles://https://kadence.example/api/map/tiles", palette);
      expect(style.sources.basemap).toMatchObject({
        type: "vector",
        url: "pmtiles://https://kadence.example/api/map/tiles",
      });
      expect(JSON.stringify(style.sources)).toContain("OpenStreetMap");
      for (const layer of style.layers) {
        if (layer.type === "background") continue;
        expect(V4_LAYERS.has((layer as { "source-layer": string })["source-layer"])).toBe(true);
      }
      // No labels: nothing that needs font files from anywhere.
      expect(style.layers.some((l) => l.type === "symbol")).toBe(false);
      expect(style).not.toHaveProperty("glyphs");
    });
});

describe("the route as lines", () => {
  it("pairs longitude with latitude and breaks where the GPS had no fix", () => {
    const lines = routeLines(
      [55.1, 55.2, null, 55.3, 55.4, 55.5],
      [12.1, 12.2, null, 12.3, 12.4, 12.5],
    );
    expect(lines).toEqual([
      [
        [12.1, 55.1],
        [12.2, 55.2],
      ],
      [
        [12.3, 55.3],
        [12.4, 55.4],
        [12.5, 55.5],
      ],
    ]);
    expect(routeBounds(lines)).toEqual([
      [12.1, 55.1],
      [12.5, 55.5],
    ]);
  });

  it("drops a lone point and has no bounds without a line", () => {
    expect(routeLines([55, null, 56], [12, null, 13])).toEqual([]);
    expect(routeBounds([])).toBeNull();
  });
});
