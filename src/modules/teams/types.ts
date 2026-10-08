import { z } from "zod";

/**
 * The teams page (ADR 0072): the contract for what Kadence keeps itself
 * (the registry, checked in), what it reads from the sources (the
 * snapshot, on disk) and what the page shows (the view). Nothing here is
 * about a rider on a team in Kadence; it is about the sport's teams, read
 * from public lists, for parents and riders who are new to it.
 *
 * Pure.
 */

/** Where a team stands in the sport, as DCU and the UCI file it. */
export const TEAM_LEVELS = [
  "uciContinental",
  "dcuEliteMen",
  "dcuEliteWomen",
  "u19Men",
  "u19Women",
  "foreign",
] as const;
export type TeamLevel = (typeof TEAM_LEVELS)[number];

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "a hex colour");

/** A team as the registry describes it: what no source lists in a form a machine can read. */
export const registryTeamSchema = z.object({
  /** A stable slug, the page's anchor. */
  id: z.string().regex(/^[a-z0-9-]{2,60}$/),
  name: z.string().trim().min(1).max(80),
  level: z.enum(TEAM_LEVELS),
  /** ISO 3166-1 alpha-2, upper case; left out when a foreign team's seat is not known. */
  country: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  /** Where the team is at home, as a reader would say it. */
  home: z.string().trim().max(80).optional(),
  website: z.string().url().max(200).optional(),
  /** The jersey, drawn from these; without them the jersey is neutral. */
  colours: z.object({ body: hex, sleeves: hex, band: hex.optional() }).optional(),
  /** The name as the UCI or DCU write it, when that differs from `name`; matching ignores case and punctuation. */
  aliases: z.array(z.string().trim().min(1).max(80)).max(8).default([]),
  /** When a person last checked the website, the colours and the home. */
  checkedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type RegistryTeam = z.infer<typeof registryTeamSchema>;

export const registrySchema = z
  .array(registryTeamSchema)
  .refine((teams) => new Set(teams.map((t) => t.id)).size === teams.length, "ids are unique");

/** A rider as a ranking or points list has them: public sports data, with the list's own team name. */
export type RankedRider = {
  rank: number;
  name: string;
  /** The team or club as the list writes it; empty when the list has none. */
  team: string;
  points: number;
  /** The rider's birth year, when the list gives it. */
  born: number | null;
};

/** A team as DCU's own list of registered teams has it. */
export type DcuTeam = {
  level: Exclude<TeamLevel, "foreign">;
  name: string;
  /** The club or clubs behind a DCU team. */
  parentClub: string | null;
  manager: string | null;
  /** The address DCU publishes for the team. */
  contact: string | null;
};

/** One source's part of the snapshot: what was read, when, or why not. */
export type SourceRead<T> = {
  fetchedAt: string | null;
  data: T | null;
  /** Why there is no data, in a word for the log and the page; null when there is. */
  error: string | null;
};

export type UciData = {
  season: number;
  /** When the UCI computed the ranking, ISO date. */
  computedOn: string | null;
  /** Danish riders in the UCI World Ranking (U23), by rank. */
  u23Men: RankedRider[];
  /** Denmark's place in the UCI Nations' Cup for junior men and women. */
  nationsCup: {
    men: { rank: number; points: number } | null;
    women: { rank: number; points: number } | null;
  };
};

export type DcuData = {
  season: number;
  teams: DcuTeam[];
  /** DCU's points lists for the season, by class. */
  points: { u19Men: RankedRider[]; u19Women: RankedRider[]; eliteMen: RankedRider[] };
  /** Last season's U19 lists, for the foreign teams Danish juniors rode for then. */
  lastSeason: { season: number; u19Men: RankedRider[]; u19Women: RankedRider[] } | null;
};

/** What the page is built from: the sources as last read, on disk. */
export type TeamsSnapshot = {
  version: 1;
  uci: SourceRead<UciData>;
  dcu: SourceRead<DcuData>;
};

export const EMPTY_SNAPSHOT: TeamsSnapshot = {
  version: 1,
  uci: { fetchedAt: null, data: null, error: null },
  dcu: { fetchedAt: null, data: null, error: null },
};
