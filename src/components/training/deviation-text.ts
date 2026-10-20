import type { Deviation, DeviationFact, DeviationStory } from "@/modules/load";
import type { VolumeState } from "@/modules/season/volume";
import type { Reference } from "@/modules/paradigms";
import { durationText } from "./duration";

/**
 * The words for why a session went off its plan (src/modules/load/deviation.ts):
 * a heading in plain words and a few short sentences — what the plan was,
 * how the ride went, how much more or less it asked of the body — the
 * same in the calendar's popover and inline in the session's panel. No
 * load number appears here (docs/adr/0095, the amendment of 13 October);
 * the panel keeps them behind "Sådan er det regnet", told by what measured
 * the session (the amendment of 15 October). Kept apart from the
 * components so it can be read and tested on its own.
 */

type Values = Record<string, string | number>;
/** `training.deviation` from next-intl, or anything that answers like it. */
export type DeviationT = (key: string, values?: Values) => string;
/** `training.duration`. */
export type DurationT = (
  key: "minutes" | "hours" | "hoursMinutes",
  values: Record<string, number>,
) => string;

/** A hint the reader can act on: words and a link to the thresholds proposal (ADR 0094). */
export type DeviationHint = { text: string; link: string; href: string };

export type DeviationWords = { heading: string; lines: string[]; hint: DeviationHint | null };

/** The week as the page already knows it, for one neutral sentence. */
export type WeekNote = { state: VolumeState; ref: Reference } | null;

/**
 * Who reads: the rider ("Du kørte") or someone else ("Rytteren kørte"),
 * and where the thresholds proposal is for them — null for a reader who
 * cannot change the thresholds (a parent), who then gets no hint.
 */
export type DeviationReader = { who: "you" | "rider"; thresholdsHref: string | null };

export const NEUTRAL_READER: DeviationReader = { who: "rider", thresholdsHref: null };

/** Where a reader proposes thresholds (docs/adr/0094): their own settings, or the rider's page. */
export function readerFor(
  viewer: { ownRiderId: string | null; isCoach: boolean } | null,
  riderId: string,
): DeviationReader {
  if (viewer?.ownRiderId === riderId)
    return { who: "you", thresholdsHref: "/settings/me?forslag=1#thresholds" };
  if (viewer?.isCoach)
    return { who: "rider", thresholdsHref: `/riders/${riderId}?forslag=1#thresholds` };
  return NEUTRAL_READER;
}

function sportOf(sport: string): "bike" | "other" {
  return sport === "bike" ? "bike" : "other";
}

/** The ride's zones against the plan's, where the panel knows them. */
function zoneLine(fact: DeviationFact, t: DeviationT, pct: (n: number) => string): string | null {
  if (fact.kind !== "intensity") return null;
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
}

function storyLines(
  story: DeviationStory,
  sport: "bike" | "other",
  who: "you" | "rider",
  t: DeviationT,
  d: DurationT,
  number: (n: number) => string,
): string[] {
  const { plan, ride, whole } = story;
  const lines = [
    t("plan", {
      character: plan.character,
      timed: plan.minutes === null ? "no" : "yes",
      planned: plan.minutes === null ? "" : durationText(plan.minutes, d),
    }),
  ];
  const base = { who, sport, done: durationText(ride.minutes, d), effort: ride.effort ?? "none" };
  if (ride.intensityPct !== null && (ride.method === "power" || ride.method === "hr"))
    lines.push(t(`ride.${ride.method}`, { ...base, pct: number(ride.intensityPct) }));
  else if (ride.method === "rpe" && ride.effort) lines.push(t("ride.rpe", base));
  else lines.push(t("ride.time", base));
  if (whole)
    lines.push(
      whole.times !== null
        ? t("whole.times", { sport, time: whole.time, times: number(whole.times) })
        : t(`whole.${whole.direction}`, { sport, time: whole.time, pct: number(whole.pct) }),
    );
  return lines;
}

/**
 * The heading, sentences and hint for a deviation, or null when there is
 * nothing to explain — the session went as planned, is still ahead, or
 * was not planned. The zones' line comes where the panel knows them, and
 * the week's sentence last, when the page knows the week.
 */
export function deviationWords(
  deviation: Deviation,
  sport: string,
  t: DeviationT,
  d: DurationT,
  locale: string,
  week: WeekNote = null,
  reader: DeviationReader = NEUTRAL_READER,
): DeviationWords | null {
  if (!deviation.heading) return null;
  const number = (n: number) =>
    new Intl.NumberFormat(locale === "en" ? "en-GB" : "da-DK").format(n);
  const lines: string[] = [];
  const missed = deviation.facts.find((f) => f.kind === "missed");
  if (missed) lines.push(t("fact.missed", { planned: durationText(missed.plannedMinutes, d) }));
  if (deviation.story)
    lines.push(...storyLines(deviation.story, sportOf(sport), reader.who, t, d, number));
  for (const fact of deviation.facts) {
    const text = zoneLine(fact, t, number);
    if (text) lines.push(text);
  }
  if (week) lines.push(t(`week.${week.state}`, { ref: week.ref }));
  const kind = deviation.story?.thresholdHint ?? null;
  const hint =
    kind && reader.thresholdsHref
      ? {
          text: t(`hint.${kind}`, {
            who: reader.who,
            minutes: number(deviation.story!.ride.minutes),
          }),
          link: t("hint.link", { who: reader.who }),
          href: reader.thresholdsHref,
        }
      : null;
  return { heading: t(`heading.${deviation.heading}`, { sport: sportOf(sport) }), lines, hint };
}

/** Whether a mark has anything to explain: yellow or red, with something done or missed. */
export function explains(deviation: Deviation): boolean {
  return deviation.heading !== null;
}

/** The two loads behind "Sådan er det regnet", when the colour was read by them; else null. */
export function countedNumbers(
  deviation: Deviation,
  locale: string,
): { done: string; planned: string } | null {
  const load = deviation.facts.find((f) => f.kind === "load");
  if (!load || load.kind !== "load") return null;
  const number = (n: number) =>
    new Intl.NumberFormat(locale === "en" ? "en-GB" : "da-DK").format(n);
  return { done: number(load.done), planned: number(load.planned) };
}

/**
 * What "Sådan er det regnet" says the load was read from: how hard it
 * felt for a strength session or a load from RPE; the pulse for another
 * sport than the bike by heart rate (the thresholds are the bike's, ADR
 * 0016, so the words say pulse, not FTP); otherwise the bike's sentence
 * of FTP. The amendment of 15 October to docs/adr/0095.
 */
export type CountedBasis = "ftp" | "pulse" | "felt";

export function countedBasis(sport: string, method: string | null | undefined): CountedBasis {
  if (sport === "strength" || method === "rpe") return "felt";
  if (sport !== "bike" && method === "hr") return "pulse";
  return "ftp";
}

/** "Sådan er det regnet", whole: the summary, what load is for this session, and the two loads. */
export function countedWords(
  deviation: Deviation,
  sport: string,
  t: DeviationT,
  locale: string,
): { summary: string; body: string; numbers: string } | null {
  const numbers = countedNumbers(deviation, locale);
  if (!numbers) return null;
  const kind = sportOf(sport);
  return {
    summary: t("howCounted.summary"),
    body: t("howCounted.body", {
      basis: countedBasis(sport, deviation.story?.ride.method),
      sport: kind,
    }),
    numbers: t("howCounted.numbers", { ...numbers, sport: kind }),
  };
}
