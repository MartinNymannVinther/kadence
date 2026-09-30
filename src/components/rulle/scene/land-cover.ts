import type { AreaKind } from "@/modules/rulle";
import { hash } from "./noise";
import { PALETTE } from "./palette";

/**
 * What covers the ground at a place, and its colour: the real land's
 * kinds on a route that comes with Kadence (ADR 0035), or the patchwork
 * of fields, woods and pasture made up for any other. A wood is broadleaf
 * or conifer; few woods say which, so one that does not is taken to be
 * one or the other by its number, a third of them conifer.
 */

export type PatchKind =
  | "field"
  | "pasture"
  | "meadow"
  | "orchard"
  | "yard"
  | "town"
  | "industry"
  | "heath"
  | "sand"
  | "wetland"
  | "forest"
  | "conifer"
  | "water"
  | "cemetery";

export type Patch = { kind: PatchKind; color: string; id: number };

/** A field's colour, the same over the whole field. */
export const fieldColor = (id: number): string =>
  PALETTE.fields[Math.floor(hash(id, 1, 4) * PALETTE.fields.length)]!;

const pick = (colors: readonly string[], id: number) =>
  colors[Math.floor(hash(id, 2, 5) * colors.length)]!;

export function coverPatch(kind: AreaKind, id: number, city = false): Patch {
  // A city's built-up land is paving and courtyards, not a village's gardens.
  if (city && kind === "town") return { kind, color: pick(PALETTE.paving, id), id };
  switch (kind) {
    case "field":
      return { kind, color: fieldColor(id), id };
    case "meadow":
      return { kind, color: pick(PALETTE.meadows, id), id };
    case "forest": {
      const conifer = hash(id, 7, 9) < 0.33;
      return conifer
        ? { kind: "conifer", color: PALETTE.coniferFloor, id }
        : { kind, color: PALETTE.forestFloor, id };
    }
    case "conifer":
      return { kind, color: PALETTE.coniferFloor, id };
    case "water":
      return { kind, color: PALETTE.lakeBed, id };
    case "cemetery":
      return { kind, color: PALETTE.cemetery, id };
    case "wetland":
    case "orchard":
    case "yard":
    case "town":
    case "industry":
    case "heath":
    case "sand":
      return { kind, color: PALETTE[kind], id };
  }
}
