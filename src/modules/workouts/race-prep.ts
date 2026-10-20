import { DCU_BIKE_SESSIONS } from "@/modules/dcu/bike-sessions";
import type { BikeStructure } from "./structure";

/**
 * The race prep, the day before a race (docs/adr/0106): DCU's
 * "opladning", an hour with one effort of five minutes at AT, the day
 * before the race in DCU's example week ("1*5 min. AT eller 1*3 max.",
 * 1 t; DCU_U17_kompendium_2016.pdf p. 14, DCU_U19_kompendium_2016.pdf
 * p. 17). Its structure is DCU's opener in Rulle (dcu/bike-sessions.ts),
 * so the two never part. The week drafts lay it in the day before every
 * race (assist/race-week.ts), and a race in the calendar offers it.
 *
 * The words say threshold rather than AT: an adult on a training profile
 * reads no youth federation's terms (docs/adr/0092), and zone 4 is AT in
 * Kadence's reading of DCU's forms (dcu/bike-sessions.ts).
 *
 * Pure: imports nothing from the database.
 */

const opener = DCU_BIKE_SESSIONS.find((s) => s.key === "dcu-opener");
if (!opener) throw new Error("DCU's opener is missing from dcu/bike-sessions.ts");

export const RACE_PREP: {
  title: { da: string; en: string };
  why: { da: string; en: string };
  structure: BikeStructure;
} = {
  title: { da: "Opladning før løbet", en: "Opener before the race" },
  why: {
    da: "En time roligt med 5 minutter ved tærskel, så benene er vågne og friske til start.",
    en: "An easy hour with 5 minutes at threshold, so the legs are awake and fresh for the start.",
  },
  structure: opener.structure,
};

/** The race prep as a session, in the reader's language. */
export function racePrepSession(locale: string) {
  const lang = locale === "en" ? "en" : "da";
  return {
    sport: "bike" as const,
    title: RACE_PREP.title[lang],
    description: RACE_PREP.why[lang],
    structure: RACE_PREP.structure,
  };
}
