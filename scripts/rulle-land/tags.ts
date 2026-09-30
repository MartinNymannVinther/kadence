import {
  LAND_KINDS,
  type AreaKind,
  type BuildingKind,
  type RoofShape,
  type StructureKind,
} from "@/modules/rulle";

/**
 * What OpenStreetMap's tags say, in the land's own kinds: what covers an
 * area, what a building is, its roof's shape and colour, and its height.
 * For the land script (ADR 0035).
 */

type Tags = Record<string, string>;

export function areaKind(t: Tags): AreaKind | null {
  if (
    t.natural === "water" ||
    t.waterway === "riverbank" ||
    ["reservoir", "basin"].includes(t.landuse ?? "")
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
  if (t.landuse === "cemetery" || t.amenity === "grave_yard") return "cemetery";
  if (["residential", "commercial", "retail", "allotments"].includes(t.landuse ?? ""))
    return "town";
  if (
    t.natural === "grassland" ||
    ["meadow", "grass", "village_green", "recreation_ground"].includes(t.landuse ?? "") ||
    ["park", "golf_course", "garden", "pitch"].includes(t.leisure ?? "")
  )
    return "meadow";
  return null;
}

const FARM = [
  "farm_auxiliary",
  "barn",
  "shed",
  "agricultural",
  "cowshed",
  "stable",
  "greenhouse",
  "silo",
];
const BIG = [
  "industrial",
  "warehouse",
  "commercial",
  "retail",
  "office",
  "supermarket",
  "hangar",
  "train_station",
  "civic",
  "public",
  "government",
  "university",
];
const BLOCK = ["apartments", "dormitory", "hospital", "school", "hotel", "residential", "terrace"];

export function buildingKind(t: Tags): BuildingKind {
  if (t["building:part"] && !t.building) return "part";
  const b = t.building ?? "yes";
  if (["church", "chapel", "cathedral", "basilica"].includes(b) || t.amenity === "place_of_worship")
    return "church";
  if (FARM.includes(b)) return "farm";
  if (BIG.includes(b)) return "big";
  if (BLOCK.includes(b)) return "block";
  return "house";
}

export function roofShape(t: Tags): RoofShape {
  const shape = t["roof:shape"] ?? "";
  if (shape === "flat") return "flat";
  if (["gabled", "half-hipped", "saltbox"].includes(shape)) return "gabled";
  if (["hipped", "side_hipped"].includes(shape)) return "hipped";
  if (["pyramidal", "cone", "spire"].includes(shape)) return "pyramidal";
  if (["dome", "onion", "round"].includes(shape)) return "dome";
  if (shape === "skillion") return "skillion";
  if (["mansard", "gambrel"].includes(shape)) return "mansard";
  return "unsaid";
}

export const roofIndex = (t: Tags) => LAND_KINDS.roofs.indexOf(roofShape(t));

/** The colours a map writes by name, as they read on a roof. */
const NAMED: Record<string, number> = {
  red: 0xa3614b,
  darkred: 0x7e3b2f,
  brown: 0x7a5a45,
  black: 0x3b3a39,
  grey: 0x8b8783,
  gray: 0x8b8783,
  darkgrey: 0x5f5953,
  darkgray: 0x5f5953,
  lightgrey: 0xb8b4ad,
  lightgray: 0xb8b4ad,
  silver: 0xb8b4ad,
  white: 0xece8e0,
  green: 0x6f9e87,
  darkgreen: 0x4f6f5a,
  teal: 0x5f9a8c,
  blue: 0x5a6f86,
  orange: 0xb8744a,
  yellow: 0xc9b25a,
  gold: 0xb8983f,
  copper: 0x6f9e87,
};

/** A colour the map gives, as 0xRRGGBB; -1 where it gives none that reads. */
export function colourOf(value: string | undefined): number {
  if (!value) return -1;
  const v = value.trim().toLowerCase();
  const hex = /^#?([0-9a-f]{6})$/.exec(v) ?? /^#([0-9a-f]{3})$/.exec(v);
  if (hex) {
    const h = hex[1]!;
    return Number.parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  }
  return NAMED[v.replace(/[\s_-]/g, "")] ?? -1;
}

/** Metres from a height tag ("35", "35 m", "35.5"); 0 where it says nothing that reads. */
export function metres(value: string | undefined): number {
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*(m|meter|metre)?\s*$/i.exec(value ?? "");
  return m ? Math.round(Number.parseFloat(m[1]!.replace(",", ".")) * 10) / 10 : 0;
}

/** Ways on foot or by bike, and farm tracks: a narrow bridge, a small tunnel. */
const PATHS = ["footway", "path", "steps", "cycleway", "bridleway", "pedestrian", "track"];

/**
 * A bridge or a tunnel, and what it carries (ADR 0037); null for anything
 * else. A passage through a building, and what runs deep underground — a
 * metro, a railway two levels down — is no structure anyone sees.
 */
export function structureOf(t: Tags): { kind: StructureKind; flags: number } | null {
  const bridge = Boolean(t.bridge) && t.bridge !== "no";
  const tunnel =
    Boolean(t.tunnel) && t.tunnel !== "no" && t.tunnel !== "building_passage" && !t.indoor;
  if (!bridge && !tunnel) return null;
  if (tunnel && Number.parseInt(t.layer ?? "-1", 10) <= -2) return null;
  const kind: StructureKind | null = t.waterway
    ? "water"
    : t.railway
      ? t.railway === "subway"
        ? null
        : "rail"
      : t.man_made === "wildlife_crossing"
        ? "green"
        : t.highway
          ? t.highway === "corridor"
            ? null
            : PATHS.includes(t.highway)
              ? "path"
              : ["motorway", "motorway_link", "trunk"].includes(t.highway)
                ? "motorway"
                : "road"
          : null;
  return kind ? { kind, flags: (bridge ? 1 : 0) | (tunnel ? 2 : 0) } : null;
}

export const structureIndex = (kind: StructureKind) => LAND_KINDS.structures.indexOf(kind);

/** Storeys above the ground, from the map, within reason; 0 where it does not say. */
export function levelsOf(t: Tags): number {
  return Math.max(0, Math.min(40, Number.parseInt(t["building:levels"] ?? "", 10) || 0));
}
