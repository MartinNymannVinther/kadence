import { getJson, postJson, type FetchLike } from "../http";
import type { RankedRider, UciData } from "../types";
import {
  currentSeason,
  nationStanding,
  readCountryId,
  readRankings,
  readRiders,
  readSeasons,
} from "./parse";

/**
 * Denmark in the UCI's road rankings, from DataRide (docs/research/teams.md):
 * the season that holds today, the rankings that season has for U23 and
 * for juniors, Denmark's riders in the UCI World Ranking (U23) and
 * Denmark's place in the Nations' Cup for junior men and women. Every id
 * is looked up on the way — the season, the ranking, the country — so a
 * new season needs no change here.
 *
 * The UCI has no individual ranking for juniors on the road; their
 * points are DCU's (dcu/fetch.ts).
 */

const BASE = "https://dataride.uci.org/iframe";
const ROAD = 10;
const CATEGORY = { menU23: 26, menJunior: 24, womenJunior: 25 } as const;
const INDIVIDUAL = 1;
const NATIONS = 3;
const PAGE = 40;
/** More than any one nation has in the U23 ranking; past it the list is cut, and said so in the log. */
const MAX_PAGES = 5;

/** The form DataRide's grids send: paging and a filter list, named as Kendo names them. */
function grid(
  fields: Record<string, string>,
  filters: Array<[string, string]>,
  page: number,
): Record<string, string> {
  const form: Record<string, string> = {
    ...fields,
    take: String(PAGE),
    skip: String((page - 1) * PAGE),
    page: String(page),
    pageSize: String(PAGE),
    "filter[logic]": "and",
  };
  filters.forEach(([field, value], i) => {
    form[`filter[filters][${i}][field]`] = field;
    form[`filter[filters][${i}][operator]`] = "eq";
    form[`filter[filters][${i}][value]`] = value;
  });
  return form;
}

async function rankingsFor(fetchFn: FetchLike, seasonId: number, categoryId: number) {
  return readRankings(
    await postJson(
      fetchFn,
      `${BASE}/RankingsDiscipline/`,
      grid(
        { disciplineId: String(ROAD) },
        [
          ["RaceTypeId", "0"],
          ["CategoryId", String(categoryId)],
          ["SeasonId", String(seasonId)],
        ],
        1,
      ),
    ),
  );
}

export async function fetchUci(fetchFn: FetchLike, today: string): Promise<UciData> {
  const seasons = readSeasons(
    await getJson(fetchFn, `${BASE}/GetDisciplineSeasons/?disciplineId=${ROAD}`),
  );
  const season = currentSeason(seasons, today);
  if (!season) throw new Error("uci: no season");
  const countryId = readCountryId(await getJson(fetchFn, `${BASE}/GetCountries/`), "DEN");
  if (!countryId) throw new Error("uci: no country");

  const [u23, menJunior, womenJunior] = await Promise.all([
    rankingsFor(fetchFn, season.id, CATEGORY.menU23),
    rankingsFor(fetchFn, season.id, CATEGORY.menJunior),
    rankingsFor(fetchFn, season.id, CATEGORY.womenJunior),
  ]);
  const world = u23.find((r) => r.rankingTypeId === INDIVIDUAL && /world/i.test(r.name));
  const cup = (list: typeof menJunior) => list.find((r) => r.rankingTypeId === NATIONS);

  const u23Men: RankedRider[] = [];
  let computedOn: string | null = null;
  if (world) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const read = readRiders(
        await postJson(
          fetchFn,
          `${BASE}/ObjectRankings/`,
          grid(
            {
              rankingId: String(world.rankingId),
              disciplineId: String(ROAD),
              rankingTypeId: String(INDIVIDUAL),
            },
            [
              ["RaceTypeId", "0"],
              ["CategoryId", String(CATEGORY.menU23)],
              ["SeasonId", String(season.id)],
              ["MomentId", String(world.momentId)],
              ["CountryId", String(countryId)],
              ["IndividualName", ""],
              ["TeamName", ""],
            ],
            page,
          ),
        ),
      );
      computedOn ??= read.computedOn;
      u23Men.push(...read.riders);
      if (u23Men.length >= read.total || read.riders.length < PAGE) break;
    }
  }

  // The rankings list carries only a cup's top three inline; the whole
  // standing is one page of the grid.
  const standing = async (ranking: ReturnType<typeof cup>, categoryId: number) => {
    if (!ranking) return null;
    const read = await postJson(
      fetchFn,
      `${BASE}/ObjectRankings/`,
      grid(
        {
          rankingId: String(ranking.rankingId),
          disciplineId: String(ROAD),
          rankingTypeId: String(NATIONS),
        },
        [
          ["RaceTypeId", "0"],
          ["CategoryId", String(categoryId)],
          ["SeasonId", String(season.id)],
          ["MomentId", String(ranking.momentId)],
          ["CountryId", "0"],
          ["IndividualName", ""],
          ["TeamName", ""],
        ],
        1,
      ),
    );
    const rows =
      typeof read === "object" && read !== null ? (read as { data?: unknown }).data : null;
    return nationStanding(
      Array.isArray(rows) ? rows.map((r) => r as Record<string, unknown>) : [],
      "DEN",
    );
  };

  return {
    season: season.year,
    computedOn,
    u23Men: u23Men.sort((a, b) => a.rank - b.rank),
    nationsCup: {
      men: await standing(cup(menJunior), CATEGORY.menJunior),
      women: await standing(cup(womenJunior), CATEGORY.womenJunior),
    },
  };
}
