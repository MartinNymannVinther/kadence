/**
 * What the menu holds, for whom (docs/adr/0061, amended by 0068). Pure:
 * the layout asks the database who the person is and which parts the
 * installation and the team have on, and these functions turn that into
 * the grouped list the sidebar and the phone's "Mere" sheet draw, and the
 * few places on the phone's bottom bar. No database, no React, so the
 * tests can hold every role to its list.
 *
 * One structure for every role, in small groups by task: the day first,
 * then planning (a coach) or training (a rider), the team, the tools, and
 * what there is to know. The items follow the role:
 *
 * - a coach plans: today, then the calendar, the season and the library,
 *   the riders and what the club has turned on, Rulle, and the guides;
 * - a rider rides: today, the calendar and their own page, then the
 *   library, the season and Rulle;
 * - a parent follows one rider: the page about the child and the calendar.
 *
 * Knowledge closes every list: the open guides and calculators (ADR
 * 0047), for a coach the coach guide and the parents' guide, and Help.
 */

export type NavRole = "coach" | "rider" | "parent" | "member";

export type NavKey =
  | "today"
  | "calendar"
  | "riders"
  | "me"
  | "library"
  | "season"
  | "child"
  | "rulle"
  | "club"
  | "coaches"
  | "guides"
  | "coachGuide"
  | "parentsGuide"
  | "help";

/** A group's header; the first group, the day, has none. */
export type NavGroupKey = "planning" | "training" | "team" | "tools" | "knowledge";

export type NavItem = { key: NavKey; href: string };

export type NavGroup = { key: NavGroupKey | null; items: NavItem[] };

/** Who the person is on this team, as the layout reads it (src/modules/team/access.ts). */
export type NavPerson = {
  isCoach: boolean;
  rider: unknown;
  children: readonly unknown[];
};

export type NavFlags = {
  /** The installation has the club championship on and this club keeps one (ADR 0051, 0057). */
  club: boolean;
  /** The installation has Trænerrummet on (ADR 0052, 0057). */
  coachesRoom: boolean;
  /** The person has a rider row of their own: a rider, or a coach who also rides. */
  rides: boolean;
  /** The person is somebody's parent on this team. */
  parent: boolean;
};

const ITEM: Record<NavKey, NavItem> = {
  today: { key: "today", href: "/today" },
  calendar: { key: "calendar", href: "/calendar" },
  riders: { key: "riders", href: "/riders" },
  me: { key: "me", href: "/me" },
  library: { key: "library", href: "/library" },
  season: { key: "season", href: "/season" },
  // The page about the child; for a coach without children the same page
  // is the parents' guide, so "parentsGuide" below points there too.
  child: { key: "child", href: "/parents" },
  rulle: { key: "rulle", href: "/rulle" },
  club: { key: "club", href: "/club" },
  coaches: { key: "coaches", href: "/coaches" },
  // An open page (ADR 0047): it leaves the app's frame, and its header
  // leads back (src/app/[locale]/(open)/layout.tsx).
  guides: { key: "guides", href: "/guides" },
  coachGuide: { key: "coachGuide", href: "/help/coach" },
  parentsGuide: { key: "parentsGuide", href: "/parents" },
  help: { key: "help", href: "/help" },
};

/**
 * A coach who is also a parent has "Barnet" for /parents, the page with
 * their child first and the guide below; the guide's entry jumps to it
 * there, so the two entries are not one place lit twice.
 */
const PARENTS_GUIDE_ON_THE_CHILDS_PAGE: NavItem = {
  key: "parentsGuide",
  href: "/parents#parent-guide",
};

/**
 * The role that decides the menu. A person can be more than one (ADR
 * 0010); the menu follows the one with the most to do: coach, then rider,
 * then parent. A member who is none of them yet gets the plainest list.
 */
export function navRole(person: NavPerson | null): NavRole {
  if (!person) return "member";
  if (person.isCoach) return "coach";
  if (person.rider) return "rider";
  if (person.children.length > 0) return "parent";
  return "member";
}

/** The flags the lists need, from the person and what is turned on. */
export function navFlags(
  person: NavPerson | null,
  on: { club: boolean; coachesRoom: boolean },
): NavFlags {
  return {
    club: on.club,
    coachesRoom: on.coachesRoom,
    rides: Boolean(person?.rider),
    parent: (person?.children.length ?? 0) > 0,
  };
}

type Entry = NavKey | NavItem | false;

function groups(list: Array<[NavGroupKey | null, Entry[]]>): NavGroup[] {
  return list
    .map(([key, entries]) => ({
      key,
      items: entries
        .filter((entry): entry is NavKey | NavItem => entry !== false)
        .map((entry) => (typeof entry === "string" ? ITEM[entry] : entry)),
    }))
    .filter((group) => group.items.length > 0);
}

/** The whole list, grouped: the sidebar on a computer, the "Mere" sheet on a phone. */
export function menuGroups(role: NavRole, flags: NavFlags): NavGroup[] {
  switch (role) {
    case "coach":
      return groups([
        [null, ["today", flags.rides && "me", flags.parent && "child"]],
        ["planning", ["calendar", "season", "library"]],
        ["team", ["riders", flags.club && "club", flags.coachesRoom && "coaches"]],
        ["tools", ["rulle"]],
        [
          "knowledge",
          [
            "guides",
            "coachGuide",
            flags.parent ? PARENTS_GUIDE_ON_THE_CHILDS_PAGE : "parentsGuide",
            "help",
          ],
        ],
      ]);
    case "rider":
      return groups([
        [null, ["today", "calendar", "me", flags.parent && "child"]],
        ["training", ["library", "season", "rulle"]],
        ["team", [flags.club && "club"]],
        ["knowledge", ["guides", "help"]],
      ]);
    case "parent":
      return groups([
        [null, ["child", "calendar"]],
        ["team", [flags.club && "club"]],
        ["knowledge", ["guides", "help"]],
      ]);
    case "member":
      return groups([
        [null, ["today", "calendar"]],
        ["knowledge", ["guides", "help"]],
      ]);
  }
}

/** The same list without its groups, in order. */
export function menuItems(role: NavRole, flags: NavFlags): NavItem[] {
  return menuGroups(role, flags).flatMap((group) => group.items);
}

/**
 * The phone's bottom bar: the few places a role goes every day. "Mere"
 * follows these and opens the whole list.
 */
export function barItems(role: NavRole): NavItem[] {
  const keys: Record<NavRole, NavKey[]> = {
    coach: ["today", "calendar", "riders", "library"],
    rider: ["today", "calendar", "library", "me"],
    parent: ["child", "calendar", "guides"],
    member: ["today", "calendar"],
  };
  return keys[role].map((key) => ITEM[key]);
}

/** The bar's word for a place, where the menu's is too long for a fifth of a phone. */
export function barLabelKey(key: NavKey): string {
  return key === "guides" ? "guidesShort" : key;
}

/** Where the wordmark leads: the first place in the role's day. */
export function homeHref(role: NavRole): string {
  return barItems(role)[0]!.href;
}

/** Whether `pathname` is the item's page or a page under it. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The one href among `hrefs` that is lit for `pathname`: the closest
 * match, so the coach guide at /help/coach is lit and Help at /help is
 * not. Null when the page is none of them.
 */
export function activeHref(pathname: string, hrefs: readonly string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    if (isActive(pathname, href) && (best === null || href.length > best.length)) best = href;
  }
  return best;
}
