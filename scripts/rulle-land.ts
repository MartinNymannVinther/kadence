import { readFileSync, writeFileSync } from "node:fs";
import { buildCourse, readRouteGpx, toPlane } from "@/modules/rulle";
import { LAND_KINDS, MAPPED, type LandFile, type RoadKind } from "@/modules/rulle/route/land-file";
import { get } from "./rulle-land/fetch";
import { heightsOver } from "./rulle-land/heights";
import { nearTheRoad } from "./rulle-land/near";
import { landQuery } from "./rulle-land/query";
import { offRoute, roadIndex, roadOf } from "./rulle-land/roads";
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
 * the cobbled streets the route runs along; the bridges and tunnels
 * along the route and across it (ADR 0037); and the roads round it, from
 * main roads to footpaths, but the route's own (ADR 0045).
 * Everything in metres on the course's own plane.
 *
 *     pnpm script scripts/rulle-land.ts public/rulle/routes/bu-dm-2026-vejle.gpx [--buildings 650|all]
 *
 * `--buildings` is how far from the road the buildings are fetched, in
 * metres: a dense city keeps its file small with less. `all` fetches
 * every building in the land, and the landscape then makes none up (ADR
 * 0045). The file says how far they reach.
 *
 * Run by a developer when a route is added or its file changes; never at
 * build or run time.
 */

const MARGIN = 2600; // metres of land around the route: the landscape draws 2.3 km out
const EARTH_M = 6_371_008.8;
const RAD = Math.PI / 180;
/** On the skyline from anywhere in the land: this tall, or a church. */
const SKYLINE = 25;
/** A cobbled street is kept if the road runs along it this close. */
const SETT_NEAR = 8;
const SETTS = ["sett", "cobblestone", "unhewn_cobblestone"];
/** Roads drawn only near the route: further off they are thinner than a pixel. */
const NARROW: RoadKind[] = ["service", "cycle", "foot"];
/** A bridge or a tunnel is kept if it comes this close to the road. */
const STRUCTURE_NEAR = 15;
/** Ways no race is ridden on, cobbled or not. */
const FOOT = ["footway", "path", "steps", "cycleway", "bridleway", "corridor", "pedestrian"];

async function main(): Promise<void> {
  const gpxPath = process.argv[2];
  if (!gpxPath)
    throw new Error("Usage: pnpm script scripts/rulle-land.ts <route.gpx> [--buildings 650|all]");
  const flag = process.argv.indexOf("--buildings");
  const asked = flag > 0 ? process.argv[flag + 1] : "650";
  const reach = asked === "all" ? "all" : Number(asked);
  if (reach !== "all" && !(reach > 0)) throw new Error(`--buildings ${asked}: metres, or all`);
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
  const query = landQuery(bbox, along, near, reach);
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
    roads: [],
    // Every building is here out to this far: the whole land, or the
    // reach, and the 30 m a building's middle may lie past it, with room.
    reach: reach === "all" ? MARGIN : reach + 50,
  };
  const { fromRoad, onRoad, isRoute } = nearTheRoad(course);
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
      if (reach !== "all" && fromRoad(f) > reach + 30 && height < SKYLINE && kind !== "church")
        continue;
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
    const byRoute =
      structure && line.length >= 2 && densify(line, 4).some((p) => onRoad(p) < STRUCTURE_NEAR);
    if (structure && byRoute)
      land.structures!.push([
        structureIndex(structure.kind),
        structure.flags,
        round(simplify(line, 0.5)),
      ]);
    if (e.type === "way" && tags.highway) {
      // A cobbled street is kept where the road runs along it, not only across it.
      if (SETTS.includes(tags.surface ?? "") && !FOOT.includes(tags.highway)) {
        const near = line.filter((p) => onRoad(p) < SETT_NEAR).length;
        if (near >= 2) land.setts!.push(round(simplify(line, 1)));
      }
      // Every road round the route, but where it is the route (ADR 0045);
      // a drive or a path only near it, as further off it is too narrow to see.
      // A bridge by the route is drawn as one (ADR 0037), not on the land under it.
      const road = byRoute && structure.flags & 1 ? null : roadOf(tags);
      const narrow = road && NARROW.includes(road.kind);
      if (road && (!narrow || densify(line, 50).some((p) => fromRoad(p) <= MAPPED)))
        for (const piece of offRoute(densify(line, 10), isRoute)) {
          const kept = simplify(piece, 1.5);
          if (kept.length >= 2)
            land.roads!.push([roadIndex(road.kind), road.unpaved ? 1 : 0, round(kept)]);
        }
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
    `${out}: ${(json.length / 1024).toFixed(0)} KB — heights ${heights.cols}×${heights.rows}, areas ${land.areas.length}, lines ${land.lines.length}, buildings ${land.buildings.length} (${land.buildings.filter((b) => b.length > 7).length} with heights or roofs), trees ${land.trees!.length}, cobbled streets ${land.setts!.length}, bridges and tunnels ${land.structures!.length}, roads ${land.roads!.length}, turbines ${land.turbines.length}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
