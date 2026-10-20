import { diffDays } from "@/core/dates";
import type { TickedPain } from "@/modules/load/usual-pain";
import { WELLBEING_WINDOW_DAYS } from "@/modules/load/wellbeing";

/**
 * The shorter check-in (backlog P2-11; ADR 0021, amended 2026-10-07): three
 * questions first — hours of sleep, energy ("overskud") and pain — and the
 * rest behind "Mere". The zone is still worked out from every answer,
 * exactly as before (src/modules/load/wellbeing.ts, after Kolding
 * Talent's model): whether it may rest on the three alone is the question
 * for a professional in backlog A-06, and stays open. So the form starts
 * the answers behind "Mere" from the rider's last check-in, and the saved
 * row stays complete when the rider answers only the three and presses
 * "Gem".
 *
 * - The three asked first start blank (pain at none, no known pain
 *   ticked), every day: they are today's.
 * - Behind "Mere", the scales and "syg" start as the rider last answered
 *   them, if that was within the model's three weeks; otherwise, or
 *   for a scale left unanswered then, in the middle of the scale and not
 *   ill.
 * - The note starts empty every day. A note is about its own day, and
 *   copying it would show the coach yesterday's words as today's.
 * - When an answer behind "Mere" starts low, or says ill, the form opens
 *   "Mere" by itself, so nothing that colours the zone is saved unseen.
 *
 * Pure: imports nothing from the database.
 */

/** A check-in's answers as the form holds them: the row without whose and which day. */
export type CheckinAnswers = {
  sleepHours: number | null;
  sleepQuality: number | null;
  energy: number | null;
  mood: number | null;
  soreness: number | null;
  stress: number | null;
  pain: number;
  painWhere: string;
  /** The known pains ticked "som det plejer", as they stood (docs/adr/0097). */
  usualPains: TickedPain[];
  ill: number;
  note: string;
};

/** The scales behind "Mere"; energy is asked first. */
export const MORE_SCALES = ["sleepQuality", "mood", "soreness", "stress"] as const;

/** The middle of a 1–5 scale: neither good nor bad. */
export const NEUTRAL_SCALE = 3;

/** An answer at or under this, behind "Mere", opens it by itself. */
const LOW_ANSWER = 2;

export type CheckinStart = {
  answers: CheckinAnswers;
  /** Where the answers behind "Mere" came from. */
  from: "last" | "neutral";
};

/** The answers a new check-in starts from; see the file comment. */
export function checkinStart(
  last: { onDate: string; answers: CheckinAnswers } | null,
  today: string,
): CheckinStart {
  const age = last ? diffDays(last.onDate, today) : Infinity;
  const recent = last && age > 0 && age <= WELLBEING_WINDOW_DAYS ? last.answers : null;
  const scale = (key: (typeof MORE_SCALES)[number]) => recent?.[key] ?? NEUTRAL_SCALE;
  return {
    answers: {
      sleepHours: null,
      energy: null,
      pain: 0,
      painWhere: "",
      usualPains: [],
      sleepQuality: scale("sleepQuality"),
      mood: scale("mood"),
      soreness: scale("soreness"),
      stress: scale("stress"),
      ill: recent?.ill ? 1 : 0,
      note: "",
    },
    from: recent ? "last" : "neutral",
  };
}

/** True when an answer behind "Mere" is low or says ill: then "Mere" is shown open. */
export function lowBehindMore(answers: CheckinAnswers): boolean {
  if (answers.ill >= 1) return true;
  return MORE_SCALES.some((key) => {
    const value = answers[key];
    return value !== null && value <= LOW_ANSWER;
  });
}
