import type { RankedRider } from "../types";

/**
 * What the UCI's DataRide answers, read into Kadence's shapes
 * (docs/research/teams.md). DataRide is the site behind uci.org's
 * ranking pages; its JSON is undocumented, so every field is read
 * defensively and a shape that does not read gives nothing rather than
 * a wrong number.
 *
 * Pure.
 */

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (typeof v === "object" && v !== null ? (v as Rec) : {});
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** DataRide writes dates as "/Date(1760911200000)/"; the day in UTC, or null. */
export function dataRideDate(value: unknown): string | null {
  const match = typeof value === "string" ? /\/Date\((-?\d+)\)\//.exec(value) : null;
  if (!match) return null;
  const ms = Number(match[1]);
  if (ms < 0) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

export type Season = { id: number; year: number; start: string; end: string };

export function readSeasons(data: unknown): Season[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    const r = rec(item);
    const id = num(r.Id);
    const year = num(r.Year);
    const start = dataRideDate(r.StartDate);
    const end = dataRideDate(r.EndDate);
    return id && year && start && end ? [{ id, year, start, end }] : [];
  });
}

/** The season that holds `today`, else the latest that has begun. */
export function currentSeason(seasons: Season[], today: string): Season | null {
  const holding = seasons.find((s) => s.start <= today && today <= s.end);
  if (holding) return holding;
  const begun = seasons
    .filter((s) => s.start <= today)
    .sort((a, b) => b.start.localeCompare(a.start));
  return begun[0] ?? null;
}

export function readCountryId(data: unknown, iocCode: string): number | null {
  if (!Array.isArray(data)) return null;
  const hit = data.map(rec).find((r) => str(r.IOCCode) === iocCode);
  return hit ? num(hit.Id) : null;
}

export type RankingRef = {
  rankingId: number;
  momentId: number;
  rankingTypeId: number;
  name: string;
};

/**
 * The rankings DataRide lists for a category: the individual ones
 * (type 1) and the nation ones (type 3). The Nations' Cup answer carries
 * its standing inline, so a nation's place can be read from here without
 * another call.
 */
export function readRankings(data: unknown): Array<RankingRef & { standing: Rec[] }> {
  if (!Array.isArray(data)) return [];
  return data.flatMap((group) =>
    (Array.isArray(rec(group).Rankings) ? (rec(group).Rankings as unknown[]) : []).flatMap(
      (item) => {
        const r = rec(item);
        const rankingId = num(r.Id);
        const momentId = num(r.MomentId);
        const rankingTypeId = num(r.RankingTypeId);
        if (!rankingId || !momentId || !rankingTypeId) return [];
        return [
          {
            rankingId,
            momentId,
            rankingTypeId,
            name: str(r.RankingName),
            standing: Array.isArray(r.ObjectRankings)
              ? (r.ObjectRankings as unknown[]).map(rec)
              : [],
          },
        ];
      },
    ),
  );
}

/** A nation's place in a standing read with the rankings, by IOC code. */
export function nationStanding(
  standing: Rec[],
  iocCode: string,
): { rank: number; points: number } | null {
  const hit = standing.find((r) => str(r.NationName) === iocCode);
  if (!hit) return null;
  const rank = num(hit.Rank);
  const points = num(hit.Points);
  return rank && points !== null ? { rank, points } : null;
}

/** The riders of one page of an individual ranking, as DataRide writes them ("EKSEMPEL Mads"). */
export function readRiders(data: unknown): {
  total: number;
  riders: RankedRider[];
  computedOn: string | null;
} {
  const r = rec(data);
  const rows = Array.isArray(r.data) ? r.data.map(rec) : [];
  const riders = rows.flatMap((row) => {
    const rank = num(row.Rank);
    const points = num(row.Points);
    const name = riderName(str(row.DisplayName) || str(row.FullName));
    if (!rank || points === null || !name) return [];
    const born = dataRideDate(row.BirthDate);
    return [
      {
        rank,
        name,
        team: str(row.TeamName).replace(/\s+/g, " "),
        points,
        born: born ? Number(born.slice(0, 4)) : null,
      },
    ];
  });
  return {
    total: num(r.total) ?? riders.length,
    riders,
    computedOn: rows.length ? dataRideDate(rows[0]!.ComputationDate) : null,
  };
}

/** "EKSEMPEL Mads" → "Mads Eksempel": the UCI writes the family name first, in capitals. */
export function riderName(listed: string): string {
  const parts = listed.trim().split(/\s+/);
  const family = parts.filter((p) => p === p.toUpperCase() && /\p{L}/u.test(p));
  const given = parts.filter((p) => !family.includes(p));
  if (family.length === 0 || given.length === 0) return listed.trim();
  const cased = family.map((p) =>
    p
      .toLowerCase()
      .replace(
        /(^|[\s\-'])(\p{L})/gu,
        (_, before: string, letter: string) => before + letter.toUpperCase(),
      ),
  );
  return `${given.join(" ")} ${cased.join(" ")}`;
}
