import { describe, expect, it } from "vitest";
import type { LayerSpecification } from "maplibre-gl";
import {
  DARK,
  LIGHT,
  basemapLayers,
  mapSources,
  mapStyle,
  routeBounds,
  routeLines,
} from "@/components/activities/map-style";

/** The map behind a route: a style over the Protomaps v4 layers, from one or two files, and the route as GeoJSON lines. */

const V4_LAYERS = new Set(["earth", "landcover", "landuse", "water", "roads", "buildings"]);

const DETAIL = "pmtiles://https://kadence.example/api/map/tiles?v=a-b";
const WORLD = "pmtiles://https://kadence.example/api/map/world?v=c-d";

const sourceOf = (layer: LayerSpecification) => (layer as { source?: string }).source;

describe("the map style", () => {
  for (const [name, palette] of [
    ["light", LIGHT],
    ["dark", DARK],
  ] as const)
    it(`reads only the basemap's own layers from Kadence's own tiles (${name})`, () => {
      const style = mapStyle({ detail: DETAIL, world: WORLD }, palette);
      expect(style.sources.basemap).toMatchObject({ type: "vector", url: DETAIL });
      expect(style.sources.world).toMatchObject({ type: "vector", url: WORLD });
      expect(JSON.stringify(style.sources)).toContain("OpenStreetMap");
      for (const layer of style.layers) {
        if (layer.type === "background") continue;
        expect(V4_LAYERS.has((layer as { "source-layer": string })["source-layer"])).toBe(true);
      }
      // No labels: nothing that needs font files from anywhere, and nothing to show twice.
      expect(style.layers.some((l) => l.type === "symbol")).toBe(false);
      expect(style).not.toHaveProperty("glyphs");
    });

  it("draws the detail alone exactly as before the world came (ADR 0099)", () => {
    const style = mapStyle({ detail: DETAIL, world: null }, LIGHT);
    expect(Object.keys(style.sources)).toEqual(["basemap"]);
    expect(style.layers.map((l) => l.id)).toEqual([
      "background",
      ...basemapLayers("basemap", "", LIGHT).map((l) => l.id),
    ]);
    expect(style.layers.some((l) => l.id === "earth")).toBe(false);
  });

  it("lays the world under the detail, and the detail's land over the world", () => {
    const style = mapStyle({ detail: DETAIL, world: WORLD }, LIGHT);
    const sources = style.layers.map(sourceOf);
    const lastWorld = sources.lastIndexOf("world");
    const firstDetail = sources.indexOf("basemap");
    expect(lastWorld).toBeGreaterThan(0);
    expect(firstDetail).toBeGreaterThan(lastWorld);
    expect(style.layers[firstDetail]).toMatchObject({
      id: "earth",
      "source-layer": "earth",
      paint: { "fill-color": LIGHT.earth },
    });
    // The same picture from both files, with ids that do not collide.
    const ids = style.layers.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    const world = style.layers.filter((l) => sourceOf(l) === "world");
    expect(world.map((l) => l.id.replace(/^world-/, ""))).toEqual(
      basemapLayers("basemap", "", LIGHT).map((l) => l.id),
    );
  });

  it("draws the world alone where an installation has only that", () => {
    const style = mapStyle({ world: WORLD }, DARK);
    expect(Object.keys(style.sources)).toEqual(["world"]);
    expect(style.layers.slice(1).every((l) => sourceOf(l) === "world")).toBe(true);
  });

  it("gives each file that is there its own address with its version", () => {
    expect(mapSources("https://kadence.example", { detail: "a-b", world: "c-d" })).toEqual({
      detail: DETAIL,
      world: WORLD,
    });
    expect(mapSources("https://kadence.example", { detail: "a-b", world: null })).toEqual({
      detail: DETAIL,
      world: null,
    });
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
