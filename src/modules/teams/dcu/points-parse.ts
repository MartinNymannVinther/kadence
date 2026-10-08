import type { RankedRider } from "../types";
import { textOf } from "./html";

/**
 * A points list from Cykling Danmark's member portal
 * (dcumedlem.sportstiming.dk/points, docs/research/teams.md): one table,
 * a row per rider with the place, the UCI ID (linked to the rider's
 * page), the name, the club or team, the birth year and the points. Only
 * the table is read; the UCI ID is left where it is, since the page
 * shows nothing a rider's licence number would add.
 *
 * Pure.
 */

const ROW = /<tr>([\s\S]*?)<\/tr>/gi;
const CELL = /<td[^>]*>([\s\S]*?)<\/td>/gi;

export function parseDcuPoints(html: string): RankedRider[] {
  const riders: RankedRider[] = [];
  for (const row of html.matchAll(ROW)) {
    const cells = [...row[1]!.matchAll(CELL)].map((m) => textOf(m[1]!));
    if (cells.length < 6) continue;
    const rank = /^#(\d+)$/.exec(cells[0]!);
    const points = Number(cells[5]!.replace(/\s/g, "").replace(",", "."));
    const born = /^(\d{4})$/.exec(cells[4]!);
    if (!rank || !Number.isFinite(points) || !cells[2]) continue;
    riders.push({
      rank: Number(rank[1]),
      name: cells[2],
      team: cells[3] ?? "",
      points,
      born: born ? Number(born[1]) : null,
    });
  }
  return riders;
}

/** The season ids the portal's own form offers, by year: "2026" → 17. */
export function parseDcuSeasons(html: string): Array<{ id: number; year: number }> {
  const select = /<select[^>]*name="SeasonId"[^>]*>([\s\S]*?)<\/select>/i.exec(html);
  if (!select) return [];
  return [...select[1]!.matchAll(/<option[^>]*value="(\d+)"[^>]*>\s*(\d{4})\s*</gi)].map((m) => ({
    id: Number(m[1]),
    year: Number(m[2]),
  }));
}

/** The class ids the portal's form offers for the chosen discipline, by name — the first of each. */
export function parseDcuClasses(html: string): Map<string, number> {
  const select = /<select[^>]*name="ClassId"[^>]*>([\s\S]*?)<\/select>/i.exec(html);
  const classes = new Map<string, number>();
  if (!select) return classes;
  for (const m of select[1]!.matchAll(/<option[^>]*value="(\d+)"[^>]*>\s*([^<]+?)\s*</gi)) {
    const name = textOf(m[2]!);
    if (!classes.has(name)) classes.set(name, Number(m[1]));
  }
  return classes;
}
