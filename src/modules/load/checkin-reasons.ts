import { painIsUsual } from "./usual-pain";
import {
  answersAverage,
  checkinZone,
  scaleAnswers,
  type Checkin,
  type ScaleKey,
} from "./wellbeing";

/**
 * Why a check-in is yellow or red, in the rider's own answers
 * (docs/adr/0097): the signs behind its zone (wellbeing.ts), each with
 * what the card needs to say it plainly — "Du sov under 6 timer", "Dine
 * svar ligger i snit på 2,3" — instead of only that a hard day is normal.
 * The words are the interface's; this file holds the facts. Pure.
 */

export type CheckinReason =
  | { sign: "ill" }
  /** `place` is where it hurts in the rider's words, or "" when not said. */
  | { sign: "pain"; level: number; place: string }
  | { sign: "mood" }
  /** The answers at the bottom of their scale. */
  | { sign: "low_answer"; answers: ScaleKey[] }
  /** The average, to one decimal. */
  | { sign: "low_average"; average: number }
  | { sign: "short_sleep"; hours: number };

const round1 = (value: number) => Math.round(value * 10) / 10;

/** The reasons behind the check-in's zone, in its signs' order; none when green. */
export function checkinReasons(checkin: Checkin): CheckinReason[] {
  return checkinZone(checkin).signs.map((sign): CheckinReason => {
    switch (sign) {
      case "ill":
      case "mood":
        return { sign };
      case "pain":
        return { sign, level: checkin.pain, place: (checkin.painWhere ?? "").trim() };
      case "low_answer":
        return {
          sign,
          answers: scaleAnswers(checkin)
            .filter(([, value]) => value <= 1)
            .map(([key]) => key),
        };
      case "low_average":
        return { sign, average: round1(answersAverage(checkin) ?? 0) };
      case "short_sleep":
        return { sign, hours: checkin.sleepHours ?? 0 };
    }
  });
}

/**
 * The places of the known pains ticked "som det plejer" when they did not
 * colour the day, for the card to say so; empty otherwise — a pain above
 * its usual level, or a new place, is a reason instead.
 */
export function usualPainPlaces(checkin: Checkin): string[] {
  const ticked = checkin.usualPains ?? [];
  if (ticked.length === 0) return [];
  if (checkin.pain > 0 && !painIsUsual(checkin)) return [];
  return ticked.map((u) => u.place);
}
