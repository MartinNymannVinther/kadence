/**
 * The settings tabs, by role (ADR 0061). Pure, for the tests.
 *
 * "Holdet" is the coaches' and comes first for them, then everything a
 * team is run with: the workspace, its AI. A rider's settings are about
 * the rider — themselves, their Wahoo, Garmin and Polar (ADR 0018), their
 * security — and a parent's about the parent. Everyone keeps "Data", the
 * one-click way out (dogma three), and "Om", what is running. The
 * admission and installation pages exist only for the installation's
 * owner, whatever their role on the team.
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

export function settingsItems({
  owner,
  isCoach,
  isRider,
}: {
  /** The installation's owner (ADR 0048). */
  owner: boolean;
  isCoach: boolean;
  isRider: boolean;
}): SettingsItem[] {
  const keys: Array<SettingsKey | false> = [
    isCoach && "team",
    "me",
    isRider && "devices",
    isCoach && "workspace",
    "security",
    owner && "access",
    owner && "installation",
    isCoach && "ai",
    "data",
    "about",
  ];
  return keys
    .filter((key): key is SettingsKey => key !== false)
    .map((key) => ({ key, href: `/settings/${key}` }));
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
