/**
 * What the menu holds, for whom (docs/adr/0061 and 0068, amended by
 * 0077). Pure: the layout asks the database who the person is and which
 * parts the installation and the team have on, and these functions turn
 * that into the two lists the sidebar, the phone's bar and its "Mere"
 * sheet draw. No database, no React, so the tests can hold every role to
 * its lists.
 *
 * Two tiers for every role. The primary places — at most four — are the
 * same in the sidebar on a computer and in the bar on a phone, in the
 * same order and with the same icon; "Mere" holds the rest in a smaller
 * list, and the shell closes it with Indstillinger. The places follow the
 * role:
 *
 * - a coach plans: Overblik, the calendar, the riders and the library;
 *   then the season, Rulle, what the club has turned on, and knowledge;
 * - a rider rides: today, the calendar, their own page and the library;
 *   then the season, Rulle, the club championship and knowledge;
 * - a parent follows one rider: the child, the calendar and knowledge.
 *
 * Knowledge is one place, "Viden og hjælp" (/help): how Kadence works,
 * both guides and the open pages (ADR 0047) behind one door.
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
  | "knowledge";

/** The words in messages/app.nav a place can be called by. */
export type NavLabelKey = NavKey | "overview" | "children";

export type NavItem = {
  key: NavKey;
  href: string;
  /** The place's word when it is not the key's: a coach's today is "Overblik". */
  label?: NavLabelKey;
  /** A literal word instead of a translation: the child's first name for a parent. */
  text?: string;
};

/** The two tiers: the places in the bar, and the rest behind "Mere". */
export type NavMenu = { primary: NavItem[]; more: NavItem[] };

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
  child: { key: "child", href: "/parents" },
  rulle: { key: "rulle", href: "/rulle" },
  club: { key: "club", href: "/club" },
  coaches: { key: "coaches", href: "/coaches" },
  knowledge: { key: "knowledge", href: "/help" },
};

/** A coach's front page is the week's picture, not the day's (ADR 0077). */
const OVERVIEW: NavItem = { ...ITEM.today, label: "overview" };

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

type Entry = NavItem | false;

const list = (entries: Entry[]): NavItem[] =>
  entries.filter((entry): entry is NavItem => entry !== false);

/**
 * The primary places: never more than four, and the same whatever is
 * turned on, so the bar on a phone is the same bar every day.
 */
const PRIMARY: Record<NavRole, NavItem[]> = {
  coach: [OVERVIEW, ITEM.calendar, ITEM.riders, ITEM.library],
  rider: [ITEM.today, ITEM.calendar, ITEM.me, ITEM.library],
  parent: [ITEM.child, ITEM.calendar, ITEM.knowledge],
  member: [ITEM.today, ITEM.calendar],
};

/** The whole menu: the sidebar on a computer, the bar and its "Mere" sheet on a phone. */
export function menuFor(role: NavRole, flags: NavFlags): NavMenu {
  const primary = PRIMARY[role];
  switch (role) {
    case "coach":
      return {
        primary,
        more: list([
          flags.rides && ITEM.me,
          flags.parent && ITEM.child,
          ITEM.season,
          ITEM.rulle,
          flags.club && ITEM.club,
          flags.coachesRoom && ITEM.coaches,
          ITEM.knowledge,
        ]),
      };
    case "rider":
      return {
        primary,
        more: list([
          flags.parent && ITEM.child,
          ITEM.season,
          ITEM.rulle,
          flags.club && ITEM.club,
          ITEM.knowledge,
        ]),
      };
    case "parent":
      return { primary, more: list([flags.club && ITEM.club]) };
    case "member":
      return { primary, more: [ITEM.knowledge] };
  }
}

/** The same places without their tiers, in order. */
export function menuItems(role: NavRole, flags: NavFlags): NavItem[] {
  const menu = menuFor(role, flags);
  return [...menu.primary, ...menu.more];
}

/**
 * The child's place is called by the child's first name — the menu is
 * read as the person, and a parent knows no "Barnet". With more than one
 * child it is "Børnene"; a child who has not confirmed the link yet, or
 * does not share their training, has no name the parent may see, so the
 * word stays "Barnet".
 */
export function nameChild(
  menu: NavMenu,
  children: ReadonlyArray<{ name: string | null; confirmed: boolean }>,
): NavMenu {
  const name = (item: NavItem): NavItem => {
    if (item.key !== "child") return item;
    if (children.length > 1) return { ...item, label: "children" };
    const first = children
      .find((c) => c.confirmed && c.name)
      ?.name?.trim()
      .split(/\s+/)[0];
    return first ? { ...item, text: first } : item;
  };
  return { primary: menu.primary.map(name), more: menu.more.map(name) };
}

/** The word in messages/app.nav for a place in the menu. */
export function labelKey(item: NavItem): NavLabelKey {
  return item.label ?? item.key;
}

/**
 * The phone's bar: the primary places, with "Mere" after them for the
 * rest. The bar's word for a place, where the menu's is too long for a
 * fifth of a phone: "Viden" for "Viden og hjælp".
 */
export function barItems(role: NavRole): NavItem[] {
  return PRIMARY[role];
}

export function barLabelKey(item: NavItem): NavLabelKey | "knowledgeShort" {
  return item.key === "knowledge" ? "knowledgeShort" : labelKey(item);
}

/** Where the wordmark leads: the first place in the role's day. */
export function homeHref(role: NavRole): string {
  return PRIMARY[role][0]!.href;
}

/** Whether `pathname` is the item's page or a page under it. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The one href among `hrefs` that is lit for `pathname`: the closest
 * match, so a page under /help lights "Viden og hjælp" and a page under
 * /settings lights nothing in the lists. Null when the page is none of
 * them.
 */
export function activeHref(pathname: string, hrefs: readonly string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    if (isActive(pathname, href) && (best === null || href.length > best.length)) best = href;
  }
  return best;
}
