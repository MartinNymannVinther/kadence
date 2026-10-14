import { diffDays } from "@/core/dates";
import type { Flag } from "./guardrails";

/**
 * A known pain that has been there for three weeks, in a young rider
 * (docs/adr/0097). A known pain at its usual level does not colour a
 * check-in (usual-pain.ts) — but ATK asks that pain which persists in a
 * young person is seen by an adult, a physiotherapist ideally
 * (docs/research/foraeldre-og-talentudvikling.md §2 "Overbelastning",
 * §3.3), and the Kolding model's "about three weeks" is the span after
 * which a hard spell should not simply be accepted (§1 theme 9). So when
 * a rider under 18 has ticked the same known pain on check-ins in each of
 * the last three weeks, the coach's attention list says so, quietly: worth
 * knowing, never an alarm.
 *
 * The caller decides who it is for: a rider under 18 by birth year, in a
 * club, where a coach reads it — not an adult, and not a personal
 * workspace, where there is no coach to see it. The weeks are counted back
 * from today as wellbeing.ts counts them, so a rider who checks in once a
 * week is judged as one who checks in every day.
 *
 * Pure: imports nothing from the database.
 */

/** The weeks a known pain must have been ticked in: the model's about three. */
export const LASTING_PAIN_WEEKS = 3;

export type LastingPainCheckin = {
  date: string;
  usualPains?: readonly { id: string; place: string }[] | null;
};

export function lastingPainFlag(
  checkins: readonly LastingPainCheckin[] | null | undefined,
  todayIso: string,
): Flag | null {
  if (!checkins) return null;
  const byPain = new Map<
    string,
    { place: string; weeks: Set<number>; days: number; since: string }
  >();
  for (const checkin of checkins) {
    const ago = diffDays(checkin.date, todayIso);
    if (ago < 0 || ago >= LASTING_PAIN_WEEKS * 7) continue;
    for (const pain of checkin.usualPains ?? []) {
      const seen = byPain.get(pain.id) ?? {
        place: pain.place,
        weeks: new Set<number>(),
        days: 0,
        since: checkin.date,
      };
      seen.weeks.add(Math.floor(ago / 7));
      seen.days += 1;
      if (checkin.date < seen.since) seen.since = checkin.date;
      byPain.set(pain.id, seen);
    }
  }
  const lasting = [...byPain.values()]
    .filter((p) => p.weeks.size >= LASTING_PAIN_WEEKS)
    .sort((a, b) => b.days - a.days || a.place.localeCompare(b.place, "da"));
  if (lasting.length === 0) return null;
  return {
    kind: "known_pain_lasting",
    severity: "info",
    values: {
      place: lasting.map((p) => p.place).join(", "),
      days: lasting[0]!.days,
      since: lasting.reduce((first, p) => (p.since < first ? p.since : first), lasting[0]!.since),
    },
  };
}
