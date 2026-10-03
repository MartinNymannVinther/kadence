import type { Flag, FlagKind, Severity } from "./guardrails";

/**
 * A coach's "afklaret" against the week's computed flags (ADR 0026). A
 * resolution names a kind, the most serious severity the coach saw, and
 * the values of every flag of that kind that fired at the press. It holds
 * a flag down for the week while the flag is not above that severity and
 * not materially worse than one the coach saw: a whole step, never the
 * drift of a planned session ridden five minutes long or a night nudging
 * a seven-night average. Pure: imports nothing from the database.
 */

export type ResolutionKey = {
  kind: FlagKind;
  severity: Severity;
  seen: readonly Flag["values"][];
};

export type ResolvedFlag<R extends ResolutionKey = ResolutionKey> = {
  flag: Flag;
  resolution: R;
};

/**
 * What "materially worse" means per numeric kind: the smallest change
 * that reopens a resolved flag. Under a step the numbers drift with the
 * week — planned hours become ridden hours, the sleep average moves a
 * tenth — and the coach's decision stands. Integer kinds (pain, red
 * sessions) step by one: a rung of the ladder, a whole session.
 */
export const MATERIAL_STEP = {
  /** Hours on the bike over or under the corridor, and the longest ride. */
  hours: 0.5,
  /** The ramp, in points of percent. */
  percent: 5,
  /** The longest ride, in kilometres. */
  km: 10,
  /** The seven-night sleep average, in hours. */
  sleep: 0.5,
  /** The middle zone's share of the sessions, in points of percent. */
  midShare: 10,
} as const;

const RANK: Record<Severity, number> = { info: 0, warn: 1, alert: 2 };
const n = (value: unknown) => (typeof value === "number" ? value : Number(value) || 0);
/** The values are rounded to a tenth; a step is met within floating-point noise. */
const EPSILON = 1e-9;

/**
 * True when the flag now says something materially worse than what the
 * coach saw: half an hour more over the corridor (or under it), a ramp
 * five points steeper, a ride half an hour or ten kilometres longer, a
 * strength pair the coach has not seen, a red check-in after a long
 * yellow, a higher rung of the pain ladder, half an hour less sleep on
 * the average, one more red session, ten points more of the sessions in
 * the middle zone. Yellow days growing is not worse —
 * the talk was had — and the escalation of a yellow run is another kind
 * (wellbeing_help), which no resolution of wellbeing_talk covers.
 */
export function worseThan(flag: Flag, seen: Flag["values"]): boolean {
  const v = flag.values;
  const more = (key: string, step: number) => n(v[key]) - n(seen[key]) >= step - EPSILON;
  const less = (key: string, step: number) => n(seen[key]) - n(v[key]) >= step - EPSILON;
  switch (flag.kind) {
    case "hours_above_corridor":
      return more("hours", MATERIAL_STEP.hours);
    case "hours_below_corridor":
      return less("hours", MATERIAL_STEP.hours);
    case "ramp":
      return more("percent", MATERIAL_STEP.percent);
    case "longest_ride":
      return (
        more("hours", MATERIAL_STEP.hours) ||
        ("km" in v && "km" in seen && more("km", MATERIAL_STEP.km))
      );
    case "strength_spacing":
      return v.first !== seen.first || v.second !== seen.second;
    case "wellbeing_talk":
      return false;
    case "wellbeing_help":
      return v.zone === "red" && seen.zone !== "red";
    case "pain":
      return more("pain", 1);
    case "sleep_short":
    case "sleep_below_minimum":
      return less("average", MATERIAL_STEP.sleep);
    case "compliance":
      return more("red", 1);
    case "mid_zone":
      return more("mid", MATERIAL_STEP.midShare);
  }
}

/** Open flags and the ones a resolution still holds down, in the guardrails' order. */
export function splitResolved<R extends ResolutionKey>(
  flags: readonly Flag[],
  resolutions: readonly R[],
): { open: Flag[]; resolved: ResolvedFlag<R>[] } {
  const open: Flag[] = [];
  const resolved: ResolvedFlag<R>[] = [];
  for (const flag of flags) {
    const hit = resolutions.find((r) => r.kind === flag.kind);
    if (
      hit &&
      RANK[flag.severity] <= RANK[hit.severity] &&
      (hit.seen.length === 0 || hit.seen.some((s) => !worseThan(flag, s)))
    )
      resolved.push({ flag, resolution: hit });
    else open.push(flag);
  }
  return { open, resolved };
}
