import type { Deviation, DeviationFact } from "@/modules/load";
import type { VolumeState } from "@/modules/season/volume";
import type { Reference } from "@/modules/paradigms";
import { durationText } from "./duration";

/**
 * The words for why a session went off its plan (src/modules/load/deviation.ts):
 * a heading in plain words and two or three short lines of facts, the
 * same in the calendar's popover and inline in the session's panel. Kept
 * apart from the components so it can be read and tested on its own.
 */

type Values = Record<string, string | number>;
/** `training.deviation` from next-intl, or anything that answers like it. */
export type DeviationT = (key: string, values?: Values) => string;
/** `training.duration`. */
export type DurationT = (
  key: "minutes" | "hours" | "hoursMinutes",
  values: Record<string, number>,
) => string;

export type DeviationWords = { heading: string; lines: string[] };

/** The week as the page already knows it, for one neutral sentence. */
export type WeekNote = { state: VolumeState; ref: Reference } | null;

function sportOf(sport: string): "bike" | "other" {
  return sport === "bike" ? "bike" : "other";
}

function line(
  fact: DeviationFact,
  sport: string,
  t: DeviationT,
  d: DurationT,
  locale: string,
): string {
  const pct = (n: number) => new Intl.NumberFormat(locale === "en" ? "en-GB" : "da-DK").format(n);
  switch (fact.kind) {
    case "missed":
      return t("fact.missed", { planned: durationText(fact.plannedMinutes, d) });
    case "time":
      return t("fact.time", {
        planned: durationText(fact.planned, d),
        done: durationText(fact.done, d),
        sport: sportOf(sport),
      });
    case "load":
      return t("fact.load", { planned: pct(fact.planned), done: pct(fact.done) });
    case "intensity":
      return fact.builtAround >= 3
        ? t("fact.intensityHard", {
            zone: fact.builtAround,
            planned: fact.plannedMinutes,
            done: fact.doneMinutes,
            most: fact.mostZone,
          })
        : t("fact.intensityEasy", {
            zone: fact.builtAround,
            share: pct(fact.inPlanPct),
            most: fact.mostZone,
          });
    case "noPlanDetail":
      return t("fact.noPlanDetail");
  }
}

/**
 * The heading and lines for a deviation, or null when there is nothing
 * to explain — the session went as planned, is still ahead, or was not
 * planned. The week's sentence comes last, when the page knows the week.
 */
export function deviationWords(
  deviation: Deviation,
  sport: string,
  t: DeviationT,
  d: DurationT,
  locale: string,
  week: WeekNote = null,
): DeviationWords | null {
  if (!deviation.heading) return null;
  const lines = deviation.facts.slice(0, 3).map((f) => line(f, sport, t, d, locale));
  if (week) lines.push(t(`week.${week.state}`, { ref: week.ref }));
  return { heading: t(`heading.${deviation.heading}`, { sport: sportOf(sport) }), lines };
}

/** Whether a mark has anything to explain: yellow or red, with something done or missed. */
export function explains(deviation: Deviation): boolean {
  return deviation.heading !== null;
}
