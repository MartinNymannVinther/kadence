import type { Flag, FlagKind } from "@/modules/load";
import type { Reference } from "@/modules/paradigms";

/** The kinds whose numbers are the paradigm's: their words name whose (DCU's, or a profile's). */
const REFERENCED: ReadonlySet<FlagKind> = new Set([
  "hours_above_corridor",
  "hours_below_corridor",
  "longest_ride",
]);

/**
 * A senior's corridor and longest ride are their training profile's, not
 * DCU's (docs/adr/0091): the flag carries whose, as `ref`, so its words
 * say so (src/components/insight/flag-text.ts). DCU's flags are left as
 * they were. Pure.
 */
export function withReference(flags: Flag[], ref: Reference): Flag[] {
  if (ref === "dcu") return flags;
  return flags.map((f) => (REFERENCED.has(f.kind) ? { ...f, values: { ...f.values, ref } } : f));
}
