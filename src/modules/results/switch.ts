/**
 * Whether this installation reads a rider's races from Cykling Danmark
 * (DCU_RESULTS, ADR 0039): "off", "on", or the UCI IDs it reads for and
 * no others — the way to try it with one rider before a whole team.
 *
 * Pure: imports nothing, tested on its own.
 */
export function readsRacesFor(setting: string, uciId: string | null): boolean {
  if (!uciId || setting === "off") return false;
  if (setting === "on") return true;
  return setting.split(",").includes(uciId);
}

/** Whether the setting reads for anyone at all. */
export function readsRaces(setting: string): boolean {
  return setting !== "off";
}
