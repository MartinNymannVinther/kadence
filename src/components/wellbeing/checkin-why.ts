import { num } from "@/components/charts/format";
import {
  checkinReasons,
  usualPainPlaces,
  type CheckinReason,
} from "@/modules/load/checkin-reasons";
import { countedPain } from "@/modules/load/usual-pain";
import { SHORT_NIGHT_HOURS, type Checkin, type WellbeingZone } from "@/modules/load/wellbeing";

/**
 * Why a check-in is yellow or red, as sentences from the rider's own
 * answers (docs/adr/0097): "Du sov under 6 timer i nat.", "Dine svar
 * ligger i snit på 2,3." The words are `checkin.why`; the facts come from
 * src/modules/load/checkin-reasons.ts. Pure.
 */

export type ResultParts = {
  /** Why the day is yellow or red; empty when green. */
  reasons: CheckinReason[];
  /** Known pains that hurt as usual and did not colour the day. */
  usual: string[];
  /** "Din træner kan se det": only in a club, and only for yellow and red. */
  coachLine: boolean;
  /** The advice to show, as keys of `checkin`. */
  advice: ("illAdvice" | "pain2Advice" | "pain3Advice")[];
};

/**
 * What the answered card says (checkin-result.tsx): the reasons, the
 * known pains as usual, the coach only where there is one — a club, not a
 * personal workspace — and the advice, none for a known pain at its usual
 * level.
 */
export function resultParts(checkin: Checkin, zone: WellbeingZone, club: boolean): ResultParts {
  const pain = countedPain(checkin);
  const advice: ResultParts["advice"] = [];
  if (checkin.ill >= 1) advice.push("illAdvice");
  if (pain >= 3) advice.push("pain3Advice");
  else if (pain === 2) advice.push("pain2Advice");
  return {
    reasons: checkinReasons(checkin),
    usual: usualPainPlaces(checkin),
    coachLine: club && zone !== "green",
    advice,
  };
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

const list = (items: string[], locale: string) =>
  new Intl.ListFormat(locale === "en" ? "en-GB" : "da-DK", { type: "conjunction" }).format(items);

export function reasonSentence(reason: CheckinReason, t: Translate, locale: string): string {
  switch (reason.sign) {
    case "ill":
      return t("ill");
    case "mood":
      return t("mood");
    case "pain": {
      const step = reason.level >= 3 ? "pain3" : "pain2";
      return reason.place ? t(`${step}Place`, { place: reason.place }) : t(step);
    }
    case "low_answer":
      return t("lowAnswer", {
        answers: list(
          reason.answers.map((key) => t(`answer.${key}`)),
          locale,
        ),
      });
    case "low_average":
      return t("lowAverage", { average: num(reason.average, locale, 1) });
    case "short_sleep":
      return t("shortSleep", { limit: SHORT_NIGHT_HOURS });
  }
}

/** The known pains that hurt as usual, as one sentence. */
export function usualSentence(places: string[], t: Translate, locale: string): string {
  return t("usual", { places: list(places, locale) });
}
