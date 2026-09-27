import type { Exercise, ProgressionRule, StrengthStructure } from "@/modules/workouts/structure";
import type { DcuCategory } from "./classes";

/**
 * DCU's three strength programmes, written by Team Danmark's Jarl Pors
 * Jakobsen for the U17, U19 and U23 national squads, as the shared session
 * shape: the library offers them as templates, and
 * `resolveStrengthSession` turns session n of a programme into the sets
 * and reps the rider does that day.
 *
 * Exercise names are Danish, as the programmes write them (data, not UI
 * copy); each note starts with the programme's English catalogue name and
 * number ("Leg extension 00854"). "RM" is a repetition maximum: "6 RM
 * betyder at belastningen skal være så tung at du kun kan udføre 6
 * repetitioner" (every programme p. 1).
 *
 * Where DCU's documents disagree (research note §6.5), the programme
 * wins, as CLAUDE.md decides:
 * - U17 warm-up: 8 minutes on the bike (DCU_U17_styrketraening.pdf p. 1),
 *   not the compendium's 10 (DCU_U17_kompendium_2016.pdf p. 18);
 * - U17 sessions 1-6 are "ikke til udmattelse" (programme p. 1), not the
 *   compendium's "altid … til udmattelse" (p. 16);
 * - three sets in the start-up and for the core, not the compendia's
 *   "altid fire sæt" (DCU_U17_kompendium_2016.pdf p. 15);
 * - the start-up counts sessions, not the compendia's "første 6 uger";
 * - U19 counts 4 + 4 sessions: the programme says so in its protocol
 *   (DCU_U19_styrketraening.pdf p. 2), and so does the compendium
 *   (DCU_U19_kompendium_2016.pdf p. 21-22); only the programme's exercise
 *   list says 1-6 and 7-12 (p. 1), and two against one decides.
 *
 * Rest: "ca. 3 minutter" between sets for U17 and U19
 * (DCU_U17_kompendium_2016.pdf p. 16; DCU_U19_kompendium_2016.pdf p. 20);
 * U23 gives none. Length: DCU gives none either, so `minutes` is 60,
 * Kadence's default for a strength session, for the coach to change.
 *
 * Pure: imports nothing from the database.
 */

export type StrengthProgramme = {
  /** Stable; the templates that copy a programme remember it. */
  key: string;
  name: { da: string; en: string };
  structure: StrengthStructure;
  source: string;
};

const REST = 180; // "ca. 3 minutter", DCU_U17_kompendium_2016.pdf p. 16; DCU_U19_kompendium_2016.pdf p. 20
const MINUTES = 60; // Kadence's default; DCU gives no session length
const CONCENTRIC = "Størst mulig indsats i den koncentriske fase.";

function rest(seconds?: number): { restSeconds?: number } {
  return seconds === undefined ? {} : { restSeconds: seconds };
}

function legs(name: string, sets: number, reps: string, note: string, seconds?: number): Exercise {
  return { name, group: "legs", sets, reps, load: "RM", ...rest(seconds), note };
}

function core(name: string, note: string, seconds?: number): Exercise {
  // "3 sæt af 15-20 RM" throughout, in all three programmes (p. 1 of each)
  return { name, group: "core", sets: 3, reps: "15-20", load: "RM", ...rest(seconds), note };
}

function rule(from: number, to: number | null, sets: number, reps: string): ProgressionRule {
  return { group: "legs", from, to, sets, reps, load: "RM" };
}

const U17: StrengthStructure = {
  kind: "strength",
  warmup: "8 minutter på kondicykel.", // DCU_U17_styrketraening.pdf p. 1
  exercises: [
    // DCU_U17_styrketraening.pdf p. 1, exercises 1-7. The squat is the programme's own
    // warm-up set; "other", so the legs' progression leaves its 1×20 alone.
    {
      name: "Squat – opvarmning",
      group: "other",
      sets: 1,
      reps: "20",
      load: "lav belastning",
      note: "Deep back squat 03553. Ret ryg/let svaj, knæene på linje med fødderne, fødder i skulderbredde.",
    },
    core("Mave bøjning", "Sit up 04869.", REST),
    core("Faldskærm - Ryg bøjning", "Faldskærm 10010.", REST),
    legs(
      "Ben ekstension (i stedet for squat)",
      3,
      "16",
      `Leg extension 00854. ${CONCENTRIC} Pas 1-6: træn ikke til udmattelse.`,
      REST,
    ),
    legs(
      "Ben fleksion",
      3,
      "16",
      `Leg curl 03149. Få puden til at ramme ballerne. ${CONCENTRIC} Pas 1-6: træn ikke til udmattelse.`,
      REST,
    ),
    legs(
      "Benpres",
      3,
      "16",
      `Leg press 00923. Hold hoften i sædet, knæ på linje med fod. ${CONCENTRIC} Pas 1-6: træn ikke til udmattelse.`,
      REST,
    ),
    legs(
      "Læg strækning",
      3,
      "16",
      `Calf raise 03132. Strakte ben, vip op på tæerne og sænk langsomt. ${CONCENTRIC} Pas 1-6: træn ikke til udmattelse.`,
      REST,
    ),
  ],
  // DCU_U17_styrketraening.pdf p. 1 (every leg exercise) and p. 2 (the start-up protocol)
  progression: [rule(1, 6, 3, "16"), rule(7, 12, 3, "12"), rule(13, null, 4, "6-8")],
  minutes: MINUTES,
};

// "(træn ikke til udmattelse)" on the first block, DCU_U19_styrketraening.pdf p. 1
const U19_START = "Første blok (3 sæt af 12 RM): træn ikke til udmattelse.";

const U19: StrengthStructure = {
  kind: "strength",
  // DCU_U19_styrketraening.pdf p. 1; DCU_U19_kompendium_2016.pdf p. 23
  warmup:
    "8 minutter på kondicykel. 1 x 20 squat med lav belastning (ret/let svaj i ryggen, knæene på linje med fødderne).",
  exercises: [
    // DCU_U19_styrketraening.pdf p. 1. Squat (4) is not a fifth exercise but replaces leg
    // extension once the technique is there — "Alt i alt indeholder programmet 5 øvelser"
    // (p. 2) — so it is the leg extension's note, and its 4×6 RM with it.
    core("Mave bøjning med vægtstang", "BB sit up 01182.", REST),
    core("Ryg bøjning evt. med vægt på brystet", "Roman chair back extension 04278.", REST),
    legs(
      "Ben ekstension (i stedet for squat)",
      3,
      "12",
      `Leg extension 00854. ${CONCENTRIC} ${U19_START} Når squat-teknikken mestres (øves i opvarmningen), droppes ben ekstension, og der køres squat (Deep back squat 03553): 4 sæt af 6 RM.`,
      REST,
    ),
    legs(
      "Ben fleksion",
      3,
      "12",
      `Leg curl 03149. Få puden til at ramme ballerne. ${CONCENTRIC} ${U19_START}`,
      REST,
    ),
    legs(
      "Et bens pres",
      3,
      "12",
      `Single leg leg press 00925. Hold hoften i sædet, knæ på linje med fod. ${CONCENTRIC} ${U19_START}`,
      REST,
    ),
  ],
  // DCU_U19_styrketraening.pdf p. 2; DCU_U19_kompendium_2016.pdf p. 21-22 (4 + 4 sessions)
  progression: [rule(1, 4, 3, "12"), rule(5, 8, 3, "8"), rule(9, null, 4, "6")],
  minutes: MINUTES,
};

const U23: StrengthStructure = {
  kind: "strength",
  // DCU_U23_styrketraening.pdf p. 1
  warmup:
    "8 minutter på kondicykel. 1 x 20 squat med 50 % af træningsbelastning (ret/let svaj i ryggen, knæene på linje med fødderne).",
  exercises: [
    // DCU_U23_styrketraening.pdf p. 1, exercises 1-4; no rest given
    core("Mave bøjning med vægtstang", "BB sit up 01182."),
    core("Ryg bøjning evt. med vægt på brystet", "Roman chair back extension 04278."),
    legs(
      "Squat",
      3,
      "10-12",
      `Deep back squat 03553. Ret ryg/let svaj, knæene på linje med fødderne. ${CONCENTRIC}`,
    ),
    legs(
      "Et bens pres",
      3,
      "10-12",
      `Single leg leg press 00925. Til hvert ben. Hold hoften i sædet, knæ på linje med fod. ${CONCENTRIC}`,
    ),
  ],
  // DCU_U23_styrketraening.pdf p. 1 (exercises 3-4 and the start-up protocol)
  progression: [rule(1, 3, 3, "10-12"), rule(4, 6, 3, "8"), rule(7, null, 4, "4-6")],
  minutes: MINUTES,
};

/**
 * The programmes by class. The PDFs print no year; they were made in
 * October 2015 with the "2016" compendia that print the same programmes,
 * and the keys carry that edition.
 */
export const STRENGTH_PROGRAMMES: Record<DcuCategory, StrengthProgramme> = {
  U17: {
    key: "dcu-strength-u17-2016",
    name: {
      da: "Styrketræningsprogram for U17 landsholdsryttere",
      en: "Strength programme for U17 national squad riders",
    },
    structure: U17,
    source: "DCU_U17_styrketraening.pdf p. 1-2",
  },
  U19: {
    key: "dcu-strength-u19-2016",
    name: {
      da: "Styrketræningsprogram for U19 landsholdsryttere",
      en: "Strength programme for U19 national squad riders",
    },
    structure: U19,
    source: "DCU_U19_styrketraening.pdf p. 1-2",
  },
  U23: {
    key: "dcu-strength-u23-2016",
    name: {
      da: "Styrketræningsprogram for U23 landsholdsryttere",
      en: "Strength programme for U23 national squad riders",
    },
    structure: U23,
    source: "DCU_U23_styrketraening.pdf p. 1",
  },
};
