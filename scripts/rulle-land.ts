import { readFileSync, writeFileSync } from "node:fs";
import { buildCourse, readRouteGpx, toPlane } from "@/modules/rulle";
import { LAND_KINDS, type LandFile } from "@/modules/rulle/route/land";
import { decodePng, terrarium, type Image } from "./rulle-land/png";
import { area, clip, footprint, joinRings, simplify, type Box, type P } from "./rulle-land/shapes";

/**
 * The land around a route that comes with Kadence (ADR 0035), fetched
 * once and written beside its GPX file as `<route>.land.json`, so Rulle
 * draws the real country around the real road and needs no network to:
 * the ground's heights from Mapzen's terrain tiles (Terrarium encoding;
 * in Denmark from SRTM and EU-DEM, the sea from bathymetry), and from
 * OpenStreetMap (ODbL) what covers it — woods, water, fields, meadows,
 * towns and their buildings, tree rows and hedges, wind turbines.
 * Everything in metres on the course's own plane.
 *
 *     pnpm script scripts/rulle-land.ts public/rulle/routes/bu-dm-2026-vejle.gpx
 *
 * Run by a developer when a route is added or its file changes; never at
 * build or run time.
 */

const MARGIN = 2600; // metres of land around the route: the landscape draws 2.3 km out
const STEP = 40; // metres between heights
const ZOOM = 13;
const EARTH_M = 6_371_008.8;
const RAD = Math.PI / 180;
const AGENT = "Kadence-Rulle/0.9 (land for bundled routes; https://kadence.haij.dk)";

async function main(): Promise<void> {
  const gpxPath = process.argv[2];
  if (!gpxPath) throw new Error("Usage: pnpm script scripts/rulle-land.ts <route.gpx>");
  const course = buildCourse(readRouteGpx(readFileSync(gpxPath, "utf8")));
  const { origin } = course;
  const toLatLon = (x: number, y: number) => ({
    lat: origin.lat + y / (EARTH_M * RAD),
    lon: origin.lon + x / (EARTH_M * Math.cos(origin.lat * RAD) * RAD),
  });
  const plane = (lat: number, lon: number): P => toPlane(origin, lat, lon);

  const box: Box = {
    minX: Math.min(...course.x) - MARGIN,
    maxX: Math.max(...course.x) + MARGIN,
    minY: Math.min(...course.y) - MARGIN,
    maxY: Math.max(...course.y) + MARGIN,
  };
  const sw = toLatLon(box.minX, box.minY);
  const ne = toLatLon(box.maxX, box.maxY);

  async function get(url: string, init?: RequestInit): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(url, {
        ...init,
        headers: { "User-Agent": AGENT, ...init?.headers },
      });
      if (response.ok) return response;
      if (attempt >= 4 || ![429, 502, 503, 504].includes(response.status))
        throw new Error(`${url}: ${response.status}`);
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    }
  }

  // Heights: the tiles over the box, sampled every STEP metres, bilinear between pixels.
  const tileX = (lon: number) => ((lon + 180) / 360) * 2 ** ZOOM;
  const tileY = (lat: number) =>
    ((1 - Math.log(Math.tan(lat * RAD) + 1 / Math.cos(lat * RAD)) / Math.PI) / 2) * 2 ** ZOOM;
  const tiles = new Map<string, Image>();
  for (let tx = Math.floor(tileX(sw.lon)); tx <= Math.floor(tileX(ne.lon)); tx++)
    for (let ty = Math.floor(tileY(ne.lat)); ty <= Math.floor(tileY(sw.lat)); ty++) {
      const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${ZOOM}/${tx}/${ty}.png`;
      tiles.set(`${tx}/${ty}`, decodePng(new Uint8Array(await (await get(url)).arrayBuffer())));
    }
  const pixel = (px: number, py: number) => {
    const tile = tiles.get(`${Math.floor(px / 256)}/${Math.floor(py / 256)}`)!;
    return terrarium(tile, Math.floor(px) % 256, Math.floor(py) % 256);
  };
  const heightAt = (lat: number, lon: number) => {
    const px = tileX(lon) * 256 - 0.5;
    const py = tileY(lat) * 256 - 0.5;
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const u = px - x0;
    const v = py - y0;
    return (
      pixel(x0, y0) * (1 - u) * (1 - v) +
      pixel(x0 + 1, y0) * u * (1 - v) +
      pixel(x0, y0 + 1) * (1 - u) * v +
      pixel(x0 + 1, y0 + 1) * u * v
    );
  };
  const cols = Math.ceil((box.maxX - box.minX) / STEP) + 1;
  const rows = Math.ceil((box.maxY - box.minY) / STEP) + 1;
  const dm = new Int16Array(cols * rows);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const { lat, lon } = toLatLon(box.minX + i * STEP, box.minY + j * STEP);
      dm[j * cols + i] = Math.round(Math.max(-3000, Math.min(3000, heightAt(lat, lon))) * 10);
    }

  // What covers the land, from OpenStreetMap.
  const bbox = `${sw.lat.toFixed(6)},${sw.lon.toFixed(6)},${ne.lat.toFixed(6)},${ne.lon.toFixed(6)}`;
  const along: string[] = [];
  for (let i = 0; i < course.x.length; i += Math.max(1, Math.floor(course.x.length / 90))) {
    const { lat, lon } = toLatLon(course.x[i]!, course.y[i]!);
    along.push(`${lat.toFixed(5)},${lon.toFixed(5)}`);
  }
  const query = `[out:json][timeout:180];
  (
    way["natural"~"^(wood|water|wetland|heath|scrub|grassland|beach|sand)$"](${bbox});
    relation["natural"~"^(wood|water|wetland|heath|scrub|grassland)$"](${bbox});
    way["landuse"~"^(forest|farmland|meadow|grass|residential|industrial|commercial|retail|orchard|allotments|cemetery|farmyard|recreation_ground|village_green|reservoir|basin)$"](${bbox});
    relation["landuse"~"^(forest|farmland|meadow|grass|residential|industrial|commercial|retail|orchard|farmyard)$"](${bbox});
    way["leisure"~"^(park|golf_course)$"](${bbox});
    way["waterway"~"^(river|stream|canal|riverbank|ditch|drain)$"](${bbox});
    way["natural"="tree_row"](${bbox});
    way["barrier"="hedge"](${bbox});
    way["building"](around:650,${along.join(",")});
    node["generator:source"="wind"](${bbox});
  );
  out geom qt;`;
  type Element = {
    type: "way" | "relation" | "node";
    tags?: Record<string, string>;
    geometry?: { lat: number; lon: number }[];
    members?: { role: string; geometry?: { lat: number; lon: number }[] }[];
    lat?: number;
    lon?: number;
  };
  const osm = (await (
    await get("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: new URLSearchParams({ data: query }),
    })
  ).json()) as { elements: Element[]; osm3s?: { timestamp_osm_base?: string } };

  const areaKind = (t: Record<string, string>): string | null => {
    if (
      t.natural === "water" ||
      t.waterway === "riverbank" ||
      t.landuse === "reservoir" ||
      t.landuse === "basin"
    )
      return "water";
    if (t.natural === "wood" || t.landuse === "forest")
      return t.leaf_type === "needleleaved" || t.wood === "coniferous" ? "conifer" : "forest";
    if (t.natural === "wetland") return "wetland";
    if (t.natural === "heath" || t.natural === "scrub") return "heath";
    if (t.natural === "beach" || t.natural === "sand") return "sand";
    if (t.landuse === "farmland") return "field";
    if (t.landuse === "orchard") return "orchard";
    if (t.landuse === "farmyard") return "yard";
    if (t.landuse === "industrial") return "industry";
    if (["residential", "commercial", "retail", "allotments", "cemetery"].includes(t.landuse ?? ""))
      return "town";
    if (
      t.natural === "grassland" ||
      ["meadow", "grass", "village_green", "recreation_ground"].includes(t.landuse ?? "") ||
      t.leisure === "park" ||
      t.leisure === "golf_course"
    )
      return "meadow";
    return null;
  };
  const buildingKind = (t: Record<string, string>) => {
    const b = t.building ?? "yes";
    if (["church", "chapel", "cathedral"].includes(b)) return "church";
    if (
      [
        "farm_auxiliary",
        "barn",
        "shed",
        "agricultural",
        "cowshed",
        "stable",
        "greenhouse",
        "silo",
      ].includes(b)
    )
      return "farm";
    if (
      [
        "industrial",
        "warehouse",
        "commercial",
        "retail",
        "office",
        "supermarket",
        "hangar",
      ].includes(b)
    )
      return "big";
    if (["apartments", "dormitory", "hospital", "school"].includes(b)) return "block";
    return "house";
  };
  const round = (points: P[]) => points.flatMap((p) => [Math.round(p.x), Math.round(p.y)]);
  const land: LandFile = {
    version: 1,
    origin,
    fetched: osm.osm3s?.timestamp_osm_base ?? new Date().toISOString(),
    heights: {
      x0: Math.round(box.minX),
      y0: Math.round(box.minY),
      step: STEP,
      cols,
      rows,
      dm: Buffer.from(dm.buffer).toString("base64"),
    },
    areas: [],
    lines: [],
    buildings: [],
    turbines: [],
  };
  for (const e of osm.elements) {
    const tags = e.tags ?? {};
    if (e.type === "node" && e.lat !== undefined && e.lon !== undefined) {
      const p = plane(e.lat, e.lon);
      land.turbines.push([Math.round(p.x), Math.round(p.y)]);
      continue;
    }
    const line = (e.geometry ?? []).map((g) => plane(g.lat, g.lon));
    if (e.type === "way" && tags.building && line.length >= 4) {
      const f = footprint(line);
      if (f.w * f.d < 12 || f.w * f.d > 12000) continue;
      const levels = Math.max(
        1,
        Math.min(8, Number.parseInt(tags["building:levels"] ?? "", 10) || 0),
      );
      land.buildings.push([
        Math.round(f.x * 10) / 10,
        Math.round(f.y * 10) / 10,
        Math.round(f.w * 10) / 10,
        Math.round(f.d * 10) / 10,
        Math.round(f.angle * 1000) / 1000,
        LAND_KINDS.buildings.indexOf(buildingKind(tags) as never),
        levels,
      ]);
      continue;
    }
    const lineKind =
      tags.waterway === "river" || tags.waterway === "canal"
        ? "river"
        : ["stream", "ditch", "drain"].includes(tags.waterway ?? "")
          ? "stream"
          : tags.natural === "tree_row"
            ? "trees"
            : tags.barrier === "hedge"
              ? "hedge"
              : null;
    if (lineKind && e.type === "way") {
      const kept = simplify(line, 3);
      if (kept.length >= 2)
        land.lines.push([LAND_KINDS.lines.indexOf(lineKind as never), round(kept)]);
      continue;
    }
    const kind = areaKind(tags);
    if (!kind) continue;
    const outer =
      e.type === "relation"
        ? joinRings(
            (e.members ?? [])
              .filter((m) => m.role === "outer")
              .map((m) => (m.geometry ?? []).map((g) => plane(g.lat, g.lon))),
          )
        : [line];
    const inner =
      e.type === "relation"
        ? joinRings(
            (e.members ?? [])
              .filter((m) => m.role === "inner")
              .map((m) => (m.geometry ?? []).map((g) => plane(g.lat, g.lon))),
          )
        : [];
    for (const ring of outer) {
      const cut = clip(simplify(ring, 4), box);
      if (cut.length < 3 || area(cut) < (kind === "water" ? 150 : 400)) continue;
      const holes = inner
        .map((h) => clip(simplify(h, 4), box))
        .filter((h) => h.length >= 3 && area(h) >= 150)
        .map(round);
      land.areas.push([LAND_KINDS.areas.indexOf(kind as never), round(cut), ...holes]);
    }
  }

  const out = gpxPath.replace(/\.gpx$/, ".land.json");
  const json = JSON.stringify(land);
  writeFileSync(out, json);
  console.log(
    `${out}: ${(json.length / 1024).toFixed(0)} KB — heights ${cols}×${rows}, areas ${land.areas.length}, lines ${land.lines.length}, buildings ${land.buildings.length}, turbines ${land.turbines.length}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
