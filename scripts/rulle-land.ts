import { readFileSync, writeFileSync } from "node:fs";
import { buildCourse, readRouteGpx, toPlane } from "@/modules/rulle";
import { LAND_KINDS, type LandFile } from "@/modules/rulle/route/land";
import { get } from "./rulle-land/fetch";
import { heightsOver } from "./rulle-land/heights";
import {
  area,
  clip,
  densify,
  footprint,
  joinRings,
  simplify,
  type Box,
  type P,
} from "./rulle-land/shapes";
import {
  areaKind,
  buildingKind,
  colourOf,
  levelsOf,
  metres,
  roofIndex,
  structureIndex,
  structureOf,
} from "./rulle-land/tags";

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
 * the cobbled streets the route runs along; and the bridges and tunnels
 * along the route and across it (ADR 0037).
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
const EARTH_M = 6_371_008.8;
const RAD = Math.PI / 180;
/** On the skyline from anywhere in the land: this tall, or a church. */
const SKYLINE = 25;
/** Street trees are fetched this close to the road. */
const TREES = 60;
/** Cobbled streets are fetched this close to the road, and kept if the road runs along one. */
const SETTS = 30;
const SETT_NEAR = 8;
/** Bridges and tunnels are fetched this close to the road, and kept if one comes within `STRUCTURE_NEAR`. */
const STRUCTURES = 60;
const STRUCTURE_NEAR = 15;
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
  const heights = await heightsOver(box, toLatLon);

  // What covers the land, from OpenStreetMap.
  const bbox = `${sw.lat.toFixed(6)},${sw.lon.toFixed(6)},${ne.lat.toFixed(6)},${ne.lon.toFixed(6)}`;
  const along: string[] = [];
  for (let i = 0; i < course.x.length; i += Math.max(1, Math.floor(course.x.length / 90))) {
    const { lat, lon } = toLatLon(course.x[i]!, course.y[i]!);
    along.push(`${lat.toFixed(5)},${lon.toFixed(5)}`);
  }
  // Close along the road, for what must be found within metres of it: the
  // coarse line above cuts corners by more than that.
  const near: string[] = [];
  for (let i = 0; i < course.x.length; i += Math.max(1, Math.round(20 / course.step))) {
    const { lat, lon } = toLatLon(course.x[i]!, course.y[i]!);
    near.push(`${lat.toFixed(5)},${lon.toFixed(5)}`);
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
    way["highway"]["surface"~"^(sett|cobblestone|unhewn_cobblestone)$"](around:${SETTS},${near.join(",")});
    way["bridge"]["bridge"!="no"](around:${STRUCTURES},${near.join(",")});
    way["tunnel"]["tunnel"!="no"](around:${STRUCTURES},${near.join(",")});
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
    heights,
    areas: [],
    lines: [],
    buildings: [],
    turbines: [],
    trees: [],
    setts: [],
    structures: [],
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
    // A bridge or a tunnel near the road is kept as a structure, and then
    // goes on to be whatever else it is: a stream in a culvert is a stream.
    const structure = e.type === "way" ? structureOf(tags) : null;
    if (structure && line.length >= 2 && densify(line, 4).some((p) => onRoad(p) < STRUCTURE_NEAR))
      land.structures!.push([
        structureIndex(structure.kind),
        structure.flags,
        round(simplify(line, 0.5)),
      ]);
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
    `${out}: ${(json.length / 1024).toFixed(0)} KB — heights ${heights.cols}×${heights.rows}, areas ${land.areas.length}, lines ${land.lines.length}, buildings ${land.buildings.length} (${land.buildings.filter((b) => b.length > 7).length} with heights or roofs), trees ${land.trees!.length}, cobbled streets ${land.setts!.length}, bridges and tunnels ${land.structures!.length}, turbines ${land.turbines.length}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
