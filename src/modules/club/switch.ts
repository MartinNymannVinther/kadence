import { featureOn } from "@/core/features";

/**
 * Whether a team's club championship shows (docs/adr/0051, 0057): the
 * installation has the championship on, and the team turned it on for
 * itself under Settings → Holdet. While the installation has it off it is
 * off for every team, and the team's own choice waits in the database
 * until it counts again. Server only, like the flag it reads.
 */
export function championshipOn(teamSetting: boolean): boolean {
  return featureOn("clubChampionship") && teamSetting;
}
