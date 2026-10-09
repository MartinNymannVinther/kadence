import { best, normalize } from "./match";

/**
 * What Søg lists for a query (the search approved with
 * docs/mockups/navigation), in four groups in a fixed order: Ryttere,
 * Pas, Sider and Hjælp. Pure, so the order, the cap and who is shown
 * which riders are tested without the database; the palette gives the
 * rows their words and icons.
 */

/** One row: what it is called, an optional quiet word beside it, and where it leads. */
export type Hit = { id: string; label: string; meta?: string; href: string };

export type GroupKey = "riders" | "templates" | "places" | "help";

export type Group<H extends Hit = Hit> = { key: GroupKey; hits: H[] };

/** No more than this many rows in a group, so every group fits in view at once. */
export const PER_GROUP = 5;

export type Sources<H extends Hit = Hit> = {
  riders: H[];
  templates: H[];
  /** The menu's places, shown as they stand when nothing is typed. */
  menu: H[];
  /** The settings tabs: found by typing, never listed unasked. */
  settings: H[];
  help: H[];
};

/**
 * The groups for `query`. With nothing typed, the menu's places alone, in
 * the menu's order: a keyboard way around the app. With something typed,
 * every group filtered and ranked (./match.ts), at most `limit` rows in
 * each, and a group with nothing in it left out.
 */
export function searchGroups<H extends Hit>(
  query: string,
  sources: Sources<H>,
  limit = PER_GROUP,
): Group<H>[] {
  if (normalize(query) === "") {
    return sources.menu.length > 0 ? [{ key: "places", hits: sources.menu }] : [];
  }
  const find = (hits: H[]) => best(query, hits, (hit) => [hit.label, hit.meta], limit);
  const groups: Group<H>[] = [
    { key: "riders", hits: find(sources.riders) },
    { key: "templates", hits: find(sources.templates) },
    { key: "places", hits: find([...sources.menu, ...sources.settings]) },
    { key: "help", hits: find(sources.help) },
  ];
  return groups.filter((group) => group.hits.length > 0);
}

/** Who is searching, as far as a rider's row needs to know. */
export type Searcher = {
  /** A coach on this team: every rider has a page of their own to go to. */
  coach: boolean;
  /** The searcher's own rider row, when they ride. */
  riderId: string | null;
};

/**
 * Riders worth a group: none when the only rider the searcher may see is
 * themselves, which is every plain rider's case — Mig is already among
 * the places. The database has already decided who is in the list.
 */
export function searchableRiders<R extends { id: string }>(
  riders: readonly R[],
  who: Searcher,
): R[] {
  return riders.some((rider) => rider.id !== who.riderId) ? [...riders] : [];
}

/**
 * Where a rider's row leads: their own page for the searcher themselves,
 * the rider's page for a coach, and for a parent the page about their
 * children, which shows every child they follow.
 */
export function riderHref(riderId: string, who: Searcher): string {
  if (riderId === who.riderId) return "/me";
  if (who.coach) return `/riders/${riderId}`;
  return "/parents";
}

/** A template is read, and planned from, on its own page in the library. */
export function templateHref(templateId: string): string {
  return `/library/${templateId}`;
}
