import { dayMonth } from "@/components/training/day-label";
import { addDaysIso } from "@/core/dates";
import type { OrgContext } from "@/core/db/tenant";
import type { RiderRow } from "@/core/db/schema";
import { coachTips, guideValues, type CoachTip } from "@/modules/coach";
import { classFor, isClassBasis, seasonStartYear } from "@/modules/dcu";
import { listEvents } from "@/modules/training/events";

/** How far ahead the tips look for races, camps and exams. */
const AHEAD_DAYS = 60;

/**
 * The coach's tips for the team today: its riders' classes, what is in
 * the calendar ahead, the guardrails already raised and the team's
 * settings, handed to the pure `coachTips` — with the dates written for
 * the reader and the guide's numbers ready for the words.
 */
export async function teamTips(
  ctx: OrgContext,
  input: {
    today: string;
    locale: string;
    riders: Pick<RiderRow, "birthYear" | "sex" | "categoryOverride">[];
    flagKinds: string[];
    allowYouthWeight: boolean;
  },
): Promise<CoachTip[]> {
  const { today, locale } = input;
  const season = seasonStartYear(today);
  const events = await listEvents(ctx, { from: today, to: addDaysIso(today, AHEAD_DAYS) });
  const tips = coachTips({
    today,
    riders: input.riders.map((r) => {
      const klass = classFor(
        r.birthYear,
        season,
        isClassBasis(r.categoryOverride) ? r.categoryOverride : null,
      );
      return { category: klass.category, yearInClass: klass.yearInClass, sex: r.sex };
    }),
    events: events.map((e) => ({
      id: e.id,
      kind: e.kind,
      title: e.title,
      startsOn: e.startsOn,
      endsOn: e.endsOn,
    })),
    flagKinds: input.flagKinds,
    allowYouthWeight: input.allowYouthWeight,
  });
  const numbers = guideValues();
  return tips.map((tip) => ({
    ...tip,
    values: {
      ...numbers,
      ...tip.values,
      ...(typeof tip.values.date === "string" ? { date: dayMonth(tip.values.date, locale) } : {}),
    },
  }));
}
