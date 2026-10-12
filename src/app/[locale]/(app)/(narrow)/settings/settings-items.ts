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
 * With BILLING=on (docs/adr/0090) a coach also has "Abonnement", what the
 * workspace pays — under "Holdet", or under "Dig" in a personal workspace —
 * and the installation's owner has "Betaling", every workspace's plan and
 * the payments registered by hand. With it off neither exists.
 *
 * In a personal workspace (ADR 0080) the person is their own coach, and
 * there is no team to set up: everything is "Dig" — the training's
 * settings (the team tab, called "Træning" there), the AI and the data,
 * where the way out reads "Slet min konto og alt om mig". The workspace
 * tab, with members and invitations, is not listed; a parent invites the
 * child from the rider's page, as a coach does.
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
  | "subscription"
  | "billing"
  | "about";

/** The words in settings.nav a tab can be called by: the key's, or "training" for a person's team tab. */
export type SettingsLabelKey = SettingsKey | "training";

export type SettingsItem = { key: SettingsKey; href: string; label?: SettingsLabelKey };

/** A group's header; "Om" stands alone without one. */
export type SettingsGroupKey = "you" | "team" | "installation";

export type SettingsGroup = { key: SettingsGroupKey | null; items: SettingsItem[] };

type Who = {
  /** The installation's owner (ADR 0048). */
  owner: boolean;
  isCoach: boolean;
  isRider: boolean;
  /** The workspace is one person's own training (ADR 0080). */
  personal?: boolean;
  /** The installation prices its workspaces (BILLING=on, ADR 0090). */
  billing?: boolean;
};

/** Where a tab lives; Betaling sits under Installation's own address. */
function hrefOf(item: SettingsKey): string {
  return item === "billing" ? "/settings/installation/billing" : `/settings/${item}`;
}

export function settingsGroups({
  owner,
  isCoach,
  isRider,
  personal,
  billing,
}: Who): SettingsGroup[] {
  const pays = Boolean(billing) && isCoach && "subscription";
  const yours: Array<SettingsKey | false> = personal
    ? ["me", isRider && "devices", "security", isCoach && "team", isCoach && "ai", pays, "data"]
    : ["me", isRider && "devices", "security", !isCoach && "data"];
  const groups: Array<[SettingsGroupKey | null, Array<SettingsKey | false>]> = [
    ["you", yours],
    [
      "team",
      personal
        ? []
        : [isCoach && "team", isCoach && "workspace", isCoach && "ai", pays, isCoach && "data"],
    ],
    [
      "installation",
      [owner && "access", owner && "installation", owner && Boolean(billing) && "billing"],
    ],
    [null, ["about"]],
  ];
  return groups
    .map(([key, keys]) => ({
      key,
      items: keys
        .filter((item): item is SettingsKey => item !== false)
        .map((item): SettingsItem => ({
          key: item,
          href: hrefOf(item),
          ...(personal && item === "team" ? { label: "training" as const } : {}),
        })),
    }))
    .filter((group) => group.items.length > 0);
}

/** The word in settings.nav for a tab. */
export function settingsLabelKey(item: SettingsItem): SettingsLabelKey {
  return item.label ?? item.key;
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
  personal,
}: {
  isCoach: boolean;
  isRider: boolean;
  personal?: boolean;
}): "subtitleCoach" | "subtitleRider" | "subtitleOther" | "subtitlePersonal" {
  if (isCoach && personal) return "subtitlePersonal";
  if (isCoach) return "subtitleCoach";
  if (isRider) return "subtitleRider";
  return "subtitleOther";
}
