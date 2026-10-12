import type { Exercise, ProgressionRule, StrengthStructure } from "@/modules/workouts/structure";
import type { SeniorProfile } from "./senior";

/**
 * Kadence's two strength programmes for an adult on a training profile
 * (docs/adr/0092, docs/research/motionist-pas-og-programmer.md §4), in
 * the shape of DCU's (src/modules/dcu/strength.ts): the library offers
 * them as templates with a progression, and `resolveStrengthSession`
 * turns session n into the day's sets and reps. They are Kadence's, not
 * DCU's.
 *
 * - **Motionist styrke**: at home or in a simple gym, body weight and an
 *   elastic band, the whole body with a jump for the bones — road
 *   cyclists' bones get little from the bike (Olmedillas et al. 2012,
 *   BMC Med 10:168; Nichols & Rauh 2011, J Strength Cond Res
 *   25(3):727–734) and WHO 2020 asks muscle strength on two days a week.
 *   Twice a week in winter, once after. About 35 minutes.
 * - **Supermotionist styrke**: heavy strength for the legs as Rønnestad's
 *   studies of trained cyclists did it — half squat, one-legged leg press,
 *   hip flexion and calf raise, three sets, from 10 RM towards 4 RM over
 *   about twelve weeks (Rønnestad, Hansen & Raastad 2010, Eur J Appl
 *   Physiol 108(5):965–975; the same protocol for women, Vikmoen et al.
 *   2016, Scand J Med Sci Sports 26(4):384–396; Rønnestad & Mujika 2014,
 *   Scand J Med Sci Sports 24(4):603–612), then once a week in season to
 *   keep it (Rønnestad, Hansen & Raastad 2010, Eur J Appl Physiol
 *   110(6):1269–1282). About 50 minutes. Rønnestad alternated a heavier
 *   and a lighter day each week (10 and 6 RM, then 8 and 5, then 6 and 4);
 *   Kadence lays one straight line from 10 to 4–5 RM, simpler to follow —
 *   Kadence's simplification.
 *
 * Kadence's own judgement, said plainly: the exact exercises of the home
 * programme, the session counts the steps change at (two sessions a week
 * makes Rønnestad's weeks into sessions), the warm-ups and the minutes.
 * General advice, not an individual prescription.
 *
 * Exercise names are Danish, as DCU's are (data, not UI copy).
 *
 * Pure: imports nothing from the database.
 */

export type SeniorStrengthProgramme = {
  key: string;
  profile: SeniorProfile;
  name: { da: string; en: string };
  /** To the rider: what it is, how often, and the caution. */
  about: { da: string; en: string };
  structure: StrengthStructure;
  source: string;
};

const CONTROL = "Rolig ned, med kraft op.";

function ex(
  name: string,
  group: Exercise["group"],
  sets: number,
  reps: string,
  load: string,
  note: string,
  restSeconds?: number,
): Exercise {
  return {
    name,
    group,
    sets,
    reps,
    load,
    note,
    ...(restSeconds === undefined ? {} : { restSeconds }),
  };
}

function rule(
  group: Exercise["group"],
  from: number,
  to: number | null,
  sets: number,
  reps: string,
  load: string,
): ProgressionRule {
  return { group, from, to, sets, reps, load };
}

const MOTIONIST: StrengthStructure = {
  kind: "strength",
  warmup: "5–8 minutter let på cyklen eller rask gang, og 10 squat uden vægt.",
  exercises: [
    ex("Squat", "legs", 2, "15", "kropsvægt", `Ret ryg, knæ over tæer. ${CONTROL}`, 60),
    ex(
      "Splitsquat",
      "legs",
      2,
      "10",
      "kropsvægt",
      `Til hvert ben. Hold fat i en stol, hvis balancen driller. ${CONTROL}`,
      60,
    ),
    ex("Hoftehæv", "legs", 2, "15", "kropsvægt", "Pres hælene ned og løft hoften helt op.", 60),
    ex(
      "Squathop",
      "other",
      3,
      "6",
      "kropsvægt",
      "Små hop først. Land blødt på forfoden med bøjede knæ. Spring over, hvis knæ, ryg eller bækkenbund siger fra.",
      60,
    ),
    ex(
      "Roning med elastik",
      "upper",
      3,
      "12",
      "elastik",
      "Træk albuerne tilbage og skulderbladene sammen.",
      60,
    ),
    ex(
      "Armstrækninger",
      "upper",
      2,
      "8-12",
      "kropsvægt",
      "Mod et bord eller på knæ, til de bliver lette.",
      60,
    ),
    ex("Planke", "core", 3, "30 s", "kropsvægt", "Lige linje fra skuldre til hæle.", 45),
    ex("Sideplanke", "core", 2, "20 s", "kropsvægt", "Til hver side. Hoften oppe.", 45),
  ],
  // Kadence's: learn first, then more, then heavier with a backpack or dumbbells.
  progression: [
    rule("legs", 1, 6, 2, "15", "kropsvægt"),
    rule("legs", 7, 16, 3, "12", "kropsvægt"),
    rule("legs", 17, null, 3, "8-10", "rygsæk eller håndvægte"),
  ],
  minutes: 35,
};

const SUPER: StrengthStructure = {
  kind: "strength",
  warmup: "10 minutter på cyklen. Hop, og så et til to lette sæt af halv squat, før de tunge sæt.",
  exercises: [
    ex(
      "Squathop",
      "other",
      3,
      "6",
      "kropsvægt",
      "Før de tunge sæt, mens benene er friske. Land blødt. Spring over, hvis knæ eller ryg siger fra.",
      60,
    ),
    ex(
      "Halv squat",
      "legs",
      3,
      "10",
      "RM",
      `Half squat: ned til 90 grader i knæet. Med stang eller i smith-maskine; benpres kan erstatte. ${CONTROL}`,
      120,
    ),
    ex(
      "Etbens benpres",
      "legs",
      3,
      "10",
      "RM",
      `Single-leg leg press. Til hvert ben. Hold hoften i sædet, knæ på linje med fod. ${CONTROL}`,
      120,
    ),
    ex(
      "Hoftebøjning",
      "legs",
      3,
      "10",
      "RM",
      `Hip flexion: løft knæet mod brystet mod et kabel eller en elastik. Til hvert ben. ${CONTROL}`,
      120,
    ),
    ex(
      "Tåhæv",
      "legs",
      3,
      "10",
      "RM",
      `Calf raise: strakte ben, op på tæerne og langsomt ned. ${CONTROL}`,
      120,
    ),
    ex("Planke", "core", 3, "45 s", "kropsvægt", "Lige linje fra skuldre til hæle.", 45),
    ex(
      "Rygbøjning",
      "core",
      3,
      "15",
      "kropsvægt",
      "Back extension: løft roligt til ret ryg, ikke længere.",
      45,
    ),
  ],
  // Rønnestad, Hansen & Raastad 2010: 10 RM towards 4 RM over twelve weeks, two a week;
  // the two light sessions first and the sessions each step starts at are Kadence's.
  progression: [
    rule("legs", 1, 2, 3, "12", "let, lær teknikken"),
    rule("legs", 3, 8, 3, "10", "RM"),
    rule("legs", 9, 14, 3, "8", "RM"),
    rule("legs", 15, 20, 3, "6", "RM"),
    rule("legs", 21, null, 3, "4-5", "RM"),
  ],
  minutes: 50,
};

export const SENIOR_STRENGTH_PROGRAMMES: Record<SeniorProfile, SeniorStrengthProgramme> = {
  motionist: {
    key: "kadence-strength-motionist",
    profile: "motionist",
    name: { da: "Motionist styrke", en: "Motionist strength" },
    about: {
      da: "Hele kroppen hjemme med kropsvægt og en elastik, og hop for knoglerne. To gange om ugen om vinteren, en gang resten af året. Start let. Har du ondt, en hjerte- eller blodtrykssygdom eller lige har været skadet, så tal med din læge først.",
      en: "The whole body at home with body weight and a band, and jumps for the bones. Twice a week in winter, once the rest of the year. Start light. If you have pain, a heart or blood-pressure condition or a recent injury, talk to your doctor first.",
    },
    structure: MOTIONIST,
    source:
      "Kadence's own programme: WHO 2020 (muscle strength on 2 or more days a week, Bull et al. 2020, Br J Sports Med 54:1451–1462); Olmedillas et al. 2012, BMC Med 10:168 (cycling alone does not build bone; add osteogenic training); jumps for bone: Hinton et al. 2015, Bone 79:203–212; the exercises, doses and progression are Kadence's",
  },
  "super-motionist": {
    key: "kadence-strength-super-motionist",
    profile: "super-motionist",
    name: { da: "Supermotionist styrke", en: "Supermotionist strength" },
    about: {
      da: "Tung styrke for benene, som i Rønnestads forsøg med trænede cykelryttere. To gange om ugen fra november, og fra 10 RM mod 4 RM over cirka 12 uger. En gang om ugen i sæsonen for at holde det. Lær teknikken med let vægt først. Har du ondt, en hjerte- eller blodtrykssygdom eller lige har været skadet, så tal med din læge først.",
      en: "Heavy strength for the legs, as in Rønnestad's studies of trained cyclists. Twice a week from November, from 10 RM towards 4 RM over about 12 weeks. Once a week in season to keep it. Learn the technique light first. If you have pain, a heart or blood-pressure condition or a recent injury, talk to your doctor first.",
    },
    structure: SUPER,
    source:
      "Rønnestad, Hansen & Raastad 2010, Eur J Appl Physiol 108(5):965–975 (half squat, one-legged leg press, hip flexion, calf raise; 3 sets from 10 RM towards 4 RM over 12 weeks, twice a week); Vikmoen et al. 2016, Scand J Med Sci Sports 26(4):384–396 (the same in women); once a week in season: Rønnestad, Hansen & Raastad 2010, Eur J Appl Physiol 110(6):1269–1282; the straight progression, the jumps, the core and the session counts are Kadence's",
  },
};

export function strengthProgrammeFor(profile: SeniorProfile): SeniorStrengthProgramme {
  return SENIOR_STRENGTH_PROGRAMMES[profile];
}
