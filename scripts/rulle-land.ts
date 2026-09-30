import { readFileSync, writeFileSync } from "node:fs";
import { buildCourse, readRouteGpx, toPlane } from "@/modules/rulle";
import { LAND_KINDS, type LandFile } from "@/modules/rulle/route/land";
import { decodePng, terrarium, type Image } from "./rulle-land/png";
import { area, clip, footprint, joinRings, simplify, type Box, type P } from "./rulle-land/shapes";
import { areaKind, buildingKind, colourOf, levelsOf, metres, roofIndex } from "./rulle-land/tags";

/**
 * The land around a route that comes with Kadence (ADR 0035), fetched
 * once and written beside its GPX file as `<route>.land.json`, so Rulle
 * draws the real country around the real road and needs no network to:
 * the ground's heights from Mapzen's terrain tiles (Terrarium encoding;
 * in Denmark from SRTM and EU-DEM, the sea from bathymetry), and from
 * OpenStreetMap (ODbL) what covers it — woods, water, fields, meadows,
 * towns and their buildings, tree rows and hedges, wind turbines; in a
 * city its buildings' heights and roofs where the map says them, their
 * towers and spires, the tall ones on the skyline, the street trees, and
 * the cobbled streets the route runs along.
 * Everything in metres on the course's own plane.
 *
 *     pnpm script scripts/rulle-land.ts public/rulle/routes/bu-dm-2026-vejle.gpx [--buildings 650]
 *
 * `--buildings` is how far from the road the buildings are fetched, in
 * metres: a dense city keeps its file small with less.
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
/** On the skyline from anywhere in the land: this tall, or a church. */
const SKYLINE = 25;
/** Street trees are fetched this close to the road. */
const TREES = 60;
/** Cobbled streets are fetched this close to the road, and kept if the road runs along one. */
const SETTS = 30;
const SETT_NEAR = 8;
/** Ways no race is ridden on, cobbled or not. */
const FOOT = ["footway", "path", "steps", "cycleway", "bridleway", "corridor", "pedestrian"];

async function main(): Promise<void> {
  const gpxPath = process.argv[2];
  if (!gpxPath)
    throw new Error("Usage: pnpm script scripts/rulle-land.ts <route.gpx> [--buildings 650]");
  const flag = process.argv.indexOf("--buildings");
  const reach = flag > 0 ? Number(process.argv[flag + 1]) : 650;
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
    way["leisure"~"^(park|golf_course|garden|pitch)$"](${bbox});
    relation["leisure"~"^(park|golf_course|garden)$"](${bbox});
    relation["landuse"~"^(grass|meadow|recreation_ground|cemetery|allotments)$"](${bbox});
    way["waterway"~"^(river|stream|canal|riverbank|ditch|drain)$"](${bbox});
    way["natural"="tree_row"](${bbox});
    way["barrier"="hedge"](${bbox});
    way["landuse"="cemetery"](${bbox});
    way["amenity"="grave_yard"](${bbox});
    way["building"](around:${reach},${along.join(",")});
    way["building:part"](around:${reach},${along.join(",")});
    way["building"]["height"](${bbox});
    way["building:part"]["height"](${bbox});
    way["building"~"^(church|cathedral|chapel|basilica)$"](${bbox});
    node["natural"="tree"](around:${TREES},${along.join(",")});
    way["highway"]["surface"~"^(sett|cobblestone|unhewn_cobblestone)$"](around:${SETTS},${along.join(",")});
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
    trees: [],
    setts: [],
  };
  // Nearest the road, in metres: what decides whether a building far off is on the skyline.
  const fromRoad = (p: P) => {
    let best = Infinity;
    for (let i = 0; i < course.x.length; i += 3)
      best = Math.min(best, Math.hypot(course.x[i]! - p.x, course.y[i]! - p.y));
    return best;
  };
  // The same, exactly: to the road's own line between its points.
  const onRoad = (p: P) => {
    let best = Infinity;
    for (let i = 0; i + 1 < course.x.length; i++) {
      const dx = course.x[i + 1]! - course.x[i]!;
      const dy = course.y[i + 1]! - course.y[i]!;
      const f = Math.max(
        0,
        Math.min(
          1,
          ((p.x - course.x[i]!) * dx + (p.y - course.y[i]!) * dy) / (dx * dx + dy * dy || 1),
        ),
      );
      best = Math.min(best, Math.hypot(course.x[i]! + f * dx - p.x, course.y[i]! + f * dy - p.y));
    }
    return best;
  };
  // A building drawn in parts is drawn by its parts alone, as a map means it.
  const parts = osm.elements
    .filter((e) => e.type === "way" && e.tags?.["building:part"] && !e.tags.building)
    .map((e) => footprint((e.geometry ?? []).map((g) => plane(g.lat, g.lon))));
  const hasParts = (f: { x: number; y: number; w: number; d: number; angle: number }) =>
    parts.some((q) => {
      const c = Math.cos(f.angle);
      const s = Math.sin(f.angle);
      const u = (q.x - f.x) * c + (q.y - f.y) * s;
      const v = -(q.x - f.x) * s + (q.y - f.y) * c;
      return Math.abs(u) < f.w / 2 + 0.5 && Math.abs(v) < f.d / 2 + 0.5;
    });
  for (const e of osm.elements) {
    const tags = e.tags ?? {};
    if (e.type === "node" && e.lat !== undefined && e.lon !== undefined) {
      const p = plane(e.lat, e.lon);
      if (tags.natural === "tree") land.trees!.push([Math.round(p.x), Math.round(p.y)]);
      else land.turbines.push([Math.round(p.x), Math.round(p.y)]);
      continue;
    }
    const line = (e.geometry ?? []).map((g) => plane(g.lat, g.lon));
    if (e.type === "way" && (tags.building || tags["building:part"]) && line.length >= 4) {
      const f = footprint(line);
      if (f.w * f.d < 12 || f.w * f.d > 12000) continue;
      const kind = buildingKind(tags);
      if (kind !== "part" && hasParts(f)) continue;
      const height = metres(tags.height);
      // Beyond the fetched reach, only what stands on the skyline.
      if (fromRoad(f) > reach + 30 && height < SKYLINE && kind !== "church") continue;
      const tail = [
        height,
        metres(tags.min_height),
        roofIndex(tags),
        colourOf(tags["roof:colour"]),
      ];
      // Say nothing the map did not: a plain building needs only its first seven.
      while (tail.length > 0 && tail.at(-1) === (tail.length === 4 ? -1 : 0)) tail.pop();
      land.buildings.push([
        Math.round(f.x * 10) / 10,
        Math.round(f.y * 10) / 10,
        Math.round(f.w * 10) / 10,
        Math.round(f.d * 10) / 10,
        Math.round(f.angle * 1000) / 1000,
        LAND_KINDS.buildings.indexOf(kind),
        levelsOf(tags),
        ...tail,
      ]);
      continue;
    }
    if (e.type === "way" && tags.highway && tags.surface) {
      // A cobbled street is kept where the road runs along it, not only across it.
      const near = line.filter((p) => onRoad(p) < SETT_NEAR).length;
      if (!FOOT.includes(tags.highway) && near >= 2) land.setts!.push(round(simplify(line, 1)));
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
      land.areas.push([LAND_KINDS.areas.indexOf(kind), round(cut), ...holes]);
    }
  }

  const out = gpxPath.replace(/\.gpx$/, ".land.json");
  const json = JSON.stringify(land);
  writeFileSync(out, json);
  console.log(
    `${out}: ${(json.length / 1024).toFixed(0)} KB — heights ${cols}×${rows}, areas ${land.areas.length}, lines ${land.lines.length}, buildings ${land.buildings.length} (${land.buildings.filter((b) => b.length > 7).length} with heights or roofs), trees ${land.trees!.length}, cobbled streets ${land.setts!.length}, turbines ${land.turbines.length}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
