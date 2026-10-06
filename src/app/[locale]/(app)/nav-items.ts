/**
 * What the menu holds, for whom (docs/adr/0060). Pure: the layout asks the
 * database who the person is and which parts the installation and the
 * team have on, and these functions turn that into the list the sidebar,
 * the phone's bottom bar and its "Mere" sheet draw. No database, no
 * React, so the tests can hold every role to its list.
 *
 * One list per role, in the order that role lives a week in:
 *
 * - a coach plans: today, the calendar, the riders, the library and the
 *   season, then the parents, Rulle, and what the club has turned on;
 * - a rider rides: today, the calendar, their own page, the library, the
 *   season and Rulle;
 * - a parent follows one rider: the page about the child and the calendar.
 *
 * Help closes every list. The open guides and calculators are not in it;
 * they live on the open pages and are linked from Help (ADR 0047).
 */

export type NavRole = "coach" | "rider" | "parent" | "member";

export type NavKey =
  | "today"
  | "calendar"
  | "riders"
  | "me"
  | "library"
  | "season"
  | "parents"
  | "child"
  | "rulle"
  | "club"
  | "coaches"
  | "help";

export type NavItem = { key: NavKey; href: string };

/** Who the person is on this team, as the layout reads it (src/modules/team/access.ts). */
export type NavPerson = {
  isCoach: boolean;
  rider: unknown;
  children: readonly unknown[];
};

export type NavFlags = {
  /** The installation has the club championship on and this club keeps one (ADR 0051, 0056). */
  club: boolean;
  /** The installation has Trænerrummet on (ADR 0052, 0056). */
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
  parents: { key: "parents", href: "/parents" },
  // The same page as "parents", named for the parent who reads it.
  child: { key: "child", href: "/parents" },
  rulle: { key: "rulle", href: "/rulle" },
  club: { key: "club", href: "/club" },
  coaches: { key: "coaches", href: "/coaches" },
  help: { key: "help", href: "/help" },
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

function keys(list: Array<NavKey | false>): NavItem[] {
  return list.filter((key): key is NavKey => key !== false).map((key) => ITEM[key]);
}

/** The whole list: the sidebar on a computer, the "Mere" sheet on a phone. */
export function menuItems(role: NavRole, flags: NavFlags): NavItem[] {
  switch (role) {
    case "coach":
      return keys([
        "today",
        "calendar",
        "riders",
        flags.rides && "me",
        "library",
        "season",
        "parents",
        "rulle",
        flags.club && "club",
        flags.coachesRoom && "coaches",
        "help",
      ]);
    case "rider":
      return keys([
        "today",
        "calendar",
        "me",
        "library",
        "season",
        "rulle",
        flags.parent && "parents",
        flags.club && "club",
        "help",
      ]);
    case "parent":
      return keys(["child", "calendar", flags.club && "club", "help"]);
    case "member":
      return keys(["today", "calendar", "help"]);
  }
}

/**
 * The phone's bottom bar: the few places a role goes every day. "Mere"
 * follows these and opens the whole list.
 */
export function barItems(role: NavRole): NavItem[] {
  switch (role) {
    case "coach":
      return keys(["today", "calendar", "riders", "library"]);
    case "rider":
      return keys(["today", "calendar", "me"]);
    case "parent":
      return keys(["child", "calendar"]);
    case "member":
      return keys(["today", "calendar"]);
  }
}

/** Where the wordmark leads: the first place in the role's day. */
export function homeHref(role: NavRole): string {
  return barItems(role)[0]!.href;
}

/** Whether `pathname` is the item's page or a page under it. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
