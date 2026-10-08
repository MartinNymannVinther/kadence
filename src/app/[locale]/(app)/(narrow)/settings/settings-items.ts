/**
 * The settings tabs, by role and grouped by whose they are (ADR 0061,
 * amended by 0068). Pure, for the tests.
 *
 * - "Dig": the person's own — themselves, a rider's Wahoo, Garmin and
 *   Polar (ADR 0018), their security, and for anyone who is not a coach
 *   "Data", the one-click way out (dogma three);
 * - "Holdet", for coaches: everything a team is run with — the team, the
 *   workspace, its AI, and the team's data;
 * - "Installationen", for the installation's owner whatever their role on
 *   the team: admission and the installation (ADR 0048);
 * - "Om", what is running, last and on its own.
 *
 * A tab that is not listed is only a tab: every page under /settings
 * still decides on the server what the caller may see and do there.
 */

export type SettingsKey =
  | "team"
  | "me"
  | "devices"
  | "workspace"
  | "security"
  | "access"
  | "installation"
  | "ai"
  | "data"
  | "about";

export type SettingsItem = { key: SettingsKey; href: string };

/** A group's header; "Om" stands alone without one. */
export type SettingsGroupKey = "you" | "team" | "installation";

export type SettingsGroup = { key: SettingsGroupKey | null; items: SettingsItem[] };

type Who = {
  /** The installation's owner (ADR 0048). */
  owner: boolean;
  isCoach: boolean;
  isRider: boolean;
};

export function settingsGroups({ owner, isCoach, isRider }: Who): SettingsGroup[] {
  const groups: Array<[SettingsGroupKey | null, Array<SettingsKey | false>]> = [
    ["you", ["me", isRider && "devices", "security", !isCoach && "data"]],
    ["team", [isCoach && "team", isCoach && "workspace", isCoach && "ai", isCoach && "data"]],
    ["installation", [owner && "access", owner && "installation"]],
    [null, ["about"]],
  ];
  return groups
    .map(([key, keys]) => ({
      key,
      items: keys
        .filter((item): item is SettingsKey => item !== false)
        .map((item) => ({ key: item, href: `/settings/${item}` })),
    }))
    .filter((group) => group.items.length > 0);
}

/** The same tabs without their groups, in order. */
export function settingsItems(who: Who): SettingsItem[] {
  return settingsGroups(who).flatMap((group) => group.items);
}

/**
 * Whether "Forlad holdet" stands at the bottom of Mig (P1-07): for
 * everybody on the team who is not a coach — a rider, a parent, or a
 * member who is neither — because the workspace tab, where a coach finds
 * it, is not among theirs. A coach keeps it on the workspace page.
 */
export function leavesFromMe(me: { isCoach: boolean } | null): boolean {
  return me !== null && !me.isCoach;
}

/** The line under "Indstillinger", in the reader's own terms. */
export function settingsSubtitle({
  isCoach,
  isRider,
}: {
  isCoach: boolean;
  isRider: boolean;
}): "subtitleCoach" | "subtitleRider" | "subtitleOther" {
  if (isCoach) return "subtitleCoach";
  if (isRider) return "subtitleRider";
  return "subtitleOther";
}
