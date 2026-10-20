import { nameKey } from "./normalise";
import raw from "./registry/teams.json" with { type: "json" };
import { registrySchema, type RegistryTeam } from "./types";

/**
 * The registry (ADR 0072): what Kadence knows about the teams that no
 * source lists in a form a machine can read — where a team is at home,
 * its website, the colours its jersey is drawn from, and the names the
 * UCI and DCU write it by. Checked in, read once, and found by any of
 * its names. A team a source lists that the registry lacks is still
 * shown, with a neutral jersey; the registry adds, it never gates.
 *
 * Pure.
 */

export const REGISTRY: readonly RegistryTeam[] = registrySchema.parse(raw);

const byKey = new Map<string, RegistryTeam>();
for (const team of REGISTRY) {
  for (const name of [team.name, ...team.aliases]) {
    const key = nameKey(name);
    if (!byKey.has(key)) byKey.set(key, team);
  }
}

/** The registry's team for a name as a source writes it, or null. */
export function registryTeam(name: string): RegistryTeam | null {
  return byKey.get(nameKey(name)) ?? null;
}
