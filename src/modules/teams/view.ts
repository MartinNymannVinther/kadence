import { nameKey, tidyCase } from "./normalise";
import { REGISTRY, registryTeam } from "./registry";
import type { RankedRider, RegistryTeam, TeamLevel, TeamPhoto, TeamsSnapshot } from "./types";

/**
 * What the teams page shows (ADR 0072), from the registry and the
 * snapshot: the Danish teams by level, each with what DCU lists for it
 * and the riders the points lists put on it; the foreign teams Danish
 * riders ride for, from the registry and from what the lists discover;
 * and the sources with their dates. Everything is matched by name key
 * (normalise.ts) and nothing is guessed: a rider sits with a team only
 * when a list says so.
 *
 * Pure.
 */

/** A place and points on one list. */
export type Standing = { rank: number; points: number };

/** A rider on a team, with their place on the lists that name them: the UCI's U23 ranking, DCU's points. */
export type RiderLine = {
  name: string;
  born: number | null;
  uci: Standing | null;
  dcu: (Standing & { list: "u19Men" | "u19Women" | "eliteMen" }) | null;
};

export type TeamView = {
  id: string;
  name: string;
  level: TeamLevel;
  country: string | null;
  home: string | null;
  website: string | null;
  colours: NonNullable<RegistryTeam["colours"]> | null;
  /** A photograph copied from Commons, with its credit; null until copied. */
  photo: TeamPhoto | null;
  parentClub: string | null;
  manager: string | null;
  contact: string | null;
  /** True when DCU's list has the team this season. */
  registeredWithDcu: boolean;
  riders: RiderLine[];
  /** Riders the lists put on the team last season, when none this season. */
  lastSeasonRiders: number;
};

export type TeamsView = {
  byLevel: Record<Exclude<TeamLevel, "foreign">, TeamView[]>;
  foreign: TeamView[];
  nationsCup: {
    season: number;
    men: { rank: number; points: number } | null;
    women: { rank: number; points: number } | null;
  } | null;
  sources: {
    uci: { fetchedAt: string | null; computedOn: string | null; error: string | null };
    dcu: { fetchedAt: string | null; season: number | null; error: string | null; on: boolean };
  };
};

const LEVELS: Array<Exclude<TeamLevel, "foreign">> = [
  "uciContinental",
  "dcuEliteMen",
  "dcuEliteWomen",
  "u19Men",
  "u19Women",
];

function fresh(id: string, name: string, level: TeamLevel, reg: RegistryTeam | null): TeamView {
  return {
    id,
    name: reg?.name ?? tidyCase(name),
    level,
    country: reg?.country ?? (level === "foreign" ? null : "DK"),
    home: reg?.home ?? null,
    website: reg?.website ?? null,
    colours: reg?.colours ?? null,
    photo: null,
    parentClub: null,
    manager: null,
    contact: null,
    registeredWithDcu: false,
    riders: [],
    lastSeasonRiders: 0,
  };
}

/**
 * Who a rider is across lists: the UCI writes "Sylvester Stokbro" where
 * DCU writes "Sylvester Vittinghus Stokbro", so the first and the last
 * name with the birth year are the key, and the longer name is kept.
 */
export function riderKey(rider: { name: string; born: number | null }): string {
  const parts = rider.name.trim().split(/\s+/);
  const ends = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : rider.name;
  return `${nameKey(ends)}:${rider.born ?? ""}`;
}

/** The rider's line on a team, made or found, so a rider on two lists is one line. */
function riderLine(team: TeamView, rider: RankedRider): RiderLine {
  const key = riderKey(rider);
  let line = team.riders.find((r) => riderKey(r) === key);
  if (!line) {
    line = { name: rider.name, born: rider.born, uci: null, dcu: null };
    team.riders.push(line);
  } else if (rider.name.length > line.name.length) line.name = rider.name;
  return line;
}

/** U23 is 19 to 22 in the season's year (UCI Regulations 1.1.036): born in these years. */
export function u23Born(season: number): { from: number; to: number } {
  return { from: season - 22, to: season - 19 };
}

/** The place a line sorts by: the UCI's rank first, DCU's next. */
function order(line: RiderLine): number {
  return line.uci?.rank ?? 100_000 + (line.dcu?.rank ?? 100_000);
}

export function buildTeamsView(snapshot: TeamsSnapshot, dcuOn: boolean): TeamsView {
  const teams = new Map<string, TeamView>();
  const keyOf = (name: string) => registryTeam(name)?.id ?? `listed-${nameKey(name)}`;
  const ensure = (name: string, level: TeamLevel): TeamView => {
    const reg = registryTeam(name);
    const id = keyOf(name);
    let team = teams.get(id);
    if (!team) {
      team = fresh(
        id,
        name,
        reg?.level === "foreign" || level === "foreign" ? "foreign" : level,
        reg,
      );
      if (reg && reg.level !== "foreign") team.level = reg.level;
      teams.set(id, team);
    }
    return team;
  };

  // The registry first, so every known team shows even when a source is down.
  for (const reg of REGISTRY) ensure(reg.name, reg.level);

  const dcu = snapshot.dcu.data;
  if (dcu) {
    for (const listed of dcu.teams) {
      const team = ensure(listed.name, listed.level);
      team.level = listed.level;
      team.registeredWithDcu = true;
      team.parentClub = listed.parentClub;
      team.manager = listed.manager;
      team.contact = listed.contact;
    }
    // A rider sits with a team the registry or DCU's list knows; a club
    // in the list's team column is no team, and the rider is left out.
    const u23 = u23Born(dcu.season);
    const place = (
      riders: RankedRider[],
      list: NonNullable<RiderLine["dcu"]>["list"],
      season: "this" | "last",
    ) => {
      for (const rider of riders) {
        if (!rider.team) continue;
        if (
          list === "eliteMen" &&
          (rider.born === null || rider.born < u23.from || rider.born > u23.to)
        )
          continue;
        const known = registryTeam(rider.team) ?? null;
        const listedByDcu = dcu.teams.some((t) => nameKey(t.name) === nameKey(rider.team));
        if (!known && !listedByDcu) continue;
        const team = ensure(rider.team, known?.level ?? "foreign");
        if (season === "this")
          riderLine(team, rider).dcu = { rank: rider.rank, points: rider.points, list };
        // Last season matters for a foreign team only: who went abroad, and where.
        else if (team.level === "foreign") team.lastSeasonRiders += 1;
      }
    };
    place(dcu.points.u19Men, "u19Men", "this");
    place(dcu.points.u19Women, "u19Women", "this");
    place(dcu.points.eliteMen, "eliteMen", "this");
    if (dcu.lastSeason) {
      place(dcu.lastSeason.u19Men, "u19Men", "last");
      place(dcu.lastSeason.u19Women, "u19Women", "last");
    }
  }

  const uci = snapshot.uci.data;
  if (uci) {
    // A team the registry or DCU's list knows is Danish; any other team a
    // Danish U23 rider is ranked with is abroad.
    for (const rider of uci.u23Men) {
      if (!rider.team) continue;
      const known = registryTeam(rider.team);
      const listedByDcu = dcu?.teams.find((t) => nameKey(t.name) === nameKey(rider.team)) ?? null;
      const level =
        known && known.level !== "foreign" ? known.level : (listedByDcu?.level ?? "foreign");
      const team = ensure(rider.team, level);
      riderLine(team, rider).uci = { rank: rider.rank, points: rider.points };
    }
  }

  for (const team of teams.values()) {
    team.riders.sort((a, b) => order(a) - order(b));
    team.photo = snapshot.photos?.[team.id] ?? null;
  }
  const all = [...teams.values()];
  const byLevel = Object.fromEntries(
    LEVELS.map((level) => [
      level,
      all.filter((t) => t.level === level).sort((a, b) => a.name.localeCompare(b.name, "da")),
    ]),
  ) as TeamsView["byLevel"];
  const foreign = all
    .filter(
      (t) =>
        t.level === "foreign" &&
        (t.riders.length > 0 || t.lastSeasonRiders > 0 || REGISTRY.some((r) => r.id === t.id)),
    )
    .sort((a, b) => b.riders.length - a.riders.length || a.name.localeCompare(b.name, "da"));

  return {
    byLevel,
    foreign,
    nationsCup: uci ? { season: uci.season, ...uci.nationsCup } : null,
    sources: {
      uci: {
        fetchedAt: snapshot.uci.fetchedAt,
        computedOn: uci?.computedOn ?? null,
        error: snapshot.uci.error,
      },
      dcu: {
        fetchedAt: snapshot.dcu.fetchedAt,
        season: dcu?.season ?? null,
        error: snapshot.dcu.error,
        on: dcuOn,
      },
    },
  };
}
