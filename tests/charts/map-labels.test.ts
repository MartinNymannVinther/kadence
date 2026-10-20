import { describe, expect, it } from "vitest";
import type { LayerSpecification } from "maplibre-gl";
import { DETAIL_REFS_FROM, REFS_FROM } from "@/components/activities/map-road-labels";
import { DARK, LIGHT, mapSources, mapStyle } from "@/components/activities/map-style";
import { GLYPHS_PATH } from "@/components/activities/map-text";
import { routeLayers } from "@/components/activities/route-layers";

/** The names on the map (ADR 0100): from Kadence's own glyphs, from both files, once each, under the route. */

const ORIGIN = "https://kadence.example";
const BOTH = mapSources(ORIGIN, { detail: "a-b", world: "c-d" });

const sourceOf = (layer: LayerSpecification) => (layer as { source?: string }).source;
const sourceLayer = (layer: LayerSpecification) =>
  (layer as { "source-layer"?: string })["source-layer"];
const symbols = (layers: LayerSpecification[]) => layers.filter((l) => l.type === "symbol");

describe("the map's names", () => {
  it("reads its glyphs from Kadence's own origin, and from nowhere else", () => {
    expect(BOTH.glyphs).toBe(`${ORIGIN}${GLYPHS_PATH}`);
    const style = mapStyle(BOTH, LIGHT);
    expect(style.glyphs).toBe(`${ORIGIN}/map/fonts/{fontstack}/{range}.pbf`);
    expect(new URL(style.glyphs!.replace(/[{}]/g, "")).origin).toBe(ORIGIN);
    // No sprite: road numbers are text, not shields, so nothing else is fetched.
    expect(style).not.toHaveProperty("sprite");
  });

  for (const [name, palette] of [
    ["light", LIGHT],
    ["dark", DARK],
  ] as const)
    it(`names places and roads from each file (${name})`, () => {
      const labels = symbols(mapStyle(BOTH, palette).layers);
      for (const source of ["world", "basemap"]) {
        const own = labels.filter((l) => sourceOf(l) === source);
        expect(own.some((l) => sourceLayer(l) === "places")).toBe(true);
        expect(own.some((l) => sourceLayer(l) === "roads")).toBe(true);
      }
      for (const layer of labels)
        expect(layer.paint).toMatchObject({ "text-halo-color": palette.earth });
    });

  it("names roads only from the detail, and numbers them from one file at a time", () => {
    const labels = symbols(mapStyle(BOTH, LIGHT).layers);
    const roads = labels.filter((l) => sourceLayer(l) === "roads");
    const world = roads.filter((l) => sourceOf(l) === "world");
    // The world's roads carry no names: only its numbers, and only below the detail's.
    expect(world.map((l) => l.id)).toEqual(["world-label-road-ref"]);
    expect(world[0]).toMatchObject({ minzoom: REFS_FROM, maxzoom: DETAIL_REFS_FROM });
    const detailRefs = roads.find((l) => l.id === "label-road-ref");
    expect(detailRefs).toMatchObject({ minzoom: DETAIL_REFS_FROM });
  });

  it("places the detail's names first, and roads after places", () => {
    // MapLibre places the topmost symbol layer first; the ones under it give way.
    const ids = mapStyle(BOTH, LIGHT).layers.map((l) => l.id);
    expect(ids.indexOf("label-locality")).toBeGreaterThan(ids.indexOf("world-label-locality"));
    expect(ids.indexOf("world-label-locality")).toBeGreaterThan(ids.indexOf("label-road-major"));
    expect(ids.indexOf("world-label-country")).toBeGreaterThan(ids.indexOf("world-label-road-ref"));
  });

  it("lies over the land and roads, and under the route", () => {
    const style = mapStyle(BOTH, DARK);
    const firstSymbol = style.layers.findIndex((l) => l.type === "symbol");
    expect(firstSymbol).toBeGreaterThan(0);
    expect(style.layers.slice(firstSymbol).every((l) => l.type === "symbol")).toBe(true);
    // route-map-gl.tsx adds the route's layers after the style, so they come last.
    const ids = new Set(style.layers.map((l) => l.id));
    for (const layer of routeLayers(true)) {
      expect(ids.has(layer.id)).toBe(false);
      expect(layer.type).not.toBe("symbol");
    }
  });

  it("has no names without glyphs, nor without a file", () => {
    const noGlyphs = mapStyle({ ...BOTH, glyphs: null }, LIGHT);
    expect(symbols(noGlyphs.layers)).toEqual([]);
    expect(noGlyphs).not.toHaveProperty("glyphs");
    const noFiles = mapStyle({ glyphs: BOTH.glyphs }, LIGHT);
    expect(noFiles.layers.map((l) => l.id)).toEqual(["background"]);
    expect(noFiles).not.toHaveProperty("glyphs");
  });

  it("numbers the detail's roads from the start when there is no world", () => {
    const style = mapStyle({ ...BOTH, world: null }, LIGHT);
    expect(style.layers.find((l) => l.id === "label-road-ref")).toMatchObject({
      minzoom: REFS_FROM,
    });
  });
});
