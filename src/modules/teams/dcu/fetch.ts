import { getHtml, type FetchLike } from "../http";
import type { DcuData, RankedRider } from "../types";
import { parseDcuClasses, parseDcuPoints, parseDcuSeasons } from "./points-parse";
import { parseDcuTeams } from "./teams-parse";

/**
 * Cykling Danmark's teams and points lists (docs/research/teams.md): the
 * registered teams from DCU's own page, and from the member portal the
 * road points lists for U19 men, U19 women and class A — where U23
 * riders race in Denmark, which has no U23 class — for this season, and
 * last season's U19 lists for the teams Danish juniors rode for then.
 * Six pages, once a day. The season and the class ids are read from the
 * portal's own form, so a new season needs no change here.
 *
 * Behind `TEAMS_DCU` (ADR 0072): DCU has not yet said yes to being read.
 */

const TEAMS_PAGE = "https://www.cyklingdanmark.dk/klubber-teams/om-teams";
const POINTS = "https://dcumedlem.sportstiming.dk/points";
const DISCIPLINE = "Landevej";

function pointsUrl(classId: number, seasonId: number): string {
  const q = new URLSearchParams({
    EventType: DISCIPLINE,
    ClassId: String(classId),
    SeasonId: String(seasonId),
    OrganisationId: "",
  });
  return `${POINTS}?${q.toString()}`;
}

export async function fetchDcu(fetchFn: FetchLike, today: string): Promise<DcuData> {
  const teams = parseDcuTeams(await getHtml(fetchFn, TEAMS_PAGE));

  const form = await getHtml(fetchFn, POINTS);
  const year = Number(today.slice(0, 4));
  const seasons = parseDcuSeasons(form)
    .filter((s) => s.year <= year)
    .sort((a, b) => b.year - a.year);
  const season = seasons[0];
  if (!season) throw new Error("dcu: no season");
  const last = seasons.find((s) => s.year === season.year - 1) ?? null;
  // The form lists every discipline's classes in one select, the road's
  // first, and the first of each name is the road's.
  const classes = parseDcuClasses(form);
  const classId = (name: string) => {
    const id = classes.get(name);
    if (!id) throw new Error(`dcu: no class ${name}`);
    return id;
  };
  const list = async (name: string, seasonId: number): Promise<RankedRider[]> =>
    parseDcuPoints(await getHtml(fetchFn, pointsUrl(classId(name), seasonId)));

  const [u19Men, u19Women, eliteMen] = await Promise.all([
    list("U19", season.id),
    list("U19P", season.id),
    list("A", season.id),
  ]);
  const lastSeason = last
    ? {
        season: last.year,
        u19Men: await list("U19", last.id),
        u19Women: await list("U19P", last.id),
      }
    : null;

  return {
    season: season.year,
    teams,
    points: { u19Men, u19Women, eliteMen },
    lastSeason,
  };
}
