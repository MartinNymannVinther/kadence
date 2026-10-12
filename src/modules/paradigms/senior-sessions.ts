import type { BikeStructure, Step, Target } from "@/modules/workouts/structure";
import type { SeniorProfile } from "./senior";

/**
 * Kadence's own bike sessions for an adult on a training profile
 * (docs/adr/0092, docs/research/motionist-pas-og-programmer.md §3): what a
 * motionist or supermotionist can pick in Rulle and fetch into the
 * library, as DCU's interval forms are for U17–U23 (ADR 0035). They are
 * Kadence's, not DCU's, and never labelled as DCU's.
 *
 * The interval forms carry the evidence they rest on in `source`: 4 × 4
 * minutes (Helgerud et al. 2007), 30/15 in three series of 13 (Rønnestad
 * et al. 2015, 2020), and easy riding as most of the week (Seiler 2010). The
 * warm-ups, the pauses, the cool-downs, the lengths and the zone each form
 * is ridden in are Kadence's own judgement, said so in each source, since
 * the studies prescribe the work and little around it.
 *
 * Pure: imports nothing from the database.
 */

/** How hard a session is, for counting the week's hard sessions. */
export type SessionIntensity = "easy" | "moderate" | "hard";

export type SeniorBikeSession = {
  /** Stable: a template made from it keeps it as `source_key`. */
  key: string;
  name: { da: string; en: string };
  /** When in the season it belongs. */
  when: { da: string; en: string };
  /** Why it is there, to the rider, in a sentence or two. */
  why: { da: string; en: string };
  intensity: SessionIntensity;
  /** The profiles it suits. */
  profiles: readonly SeniorProfile[];
  structure: BikeStructure;
  source: string;
};

const BOTH = ["motionist", "super-motionist"] as const;
const SUPER = ["super-motionist"] as const;

const OWN = "Kadence's own judgement: lengths, warm-up, pauses and cool-down";
const EASY = `${OWN}; easy riding as most of the week (Seiler 2010, Int J Sports Physiol Perform 5(3):276–291)`;

const zone = (z: 1 | 2 | 3 | 4 | 5): Target => ({ kind: "zone", zone: z });

function step(intent: Step["intent"], minutes: number, target: Target, label?: string): Step {
  return {
    kind: "step",
    intent,
    seconds: Math.round(minutes * 60),
    target,
    ...(label ? { label } : {}),
  };
}

const warmUp = (minutes: number, z: 1 | 2 = 2) => step("warmup", minutes, zone(z));
const coolDown = (minutes: number) => step("cooldown", minutes, zone(1));

function intervals(times: number, work: Step, rest: Step): BikeStructure["steps"][number] {
  return { kind: "repeat", times, steps: [work, rest] };
}

/** An easy ride: a few minutes to warm up, the steady part in zone 2, a few to cool down. */
function endurance(minutes: number, warm = 10): BikeStructure {
  return {
    kind: "bike",
    steps: [warmUp(warm, 1), step("steady", minutes - warm - 5, zone(2)), coolDown(5)],
  };
}

const ALL_YEAR = { da: "Hele året", en: "All year" };

/** One series of Rønnestad's short intervals: 13 × 30 s hard, 15 s easy. */
const series = intervals(
  13,
  step("work", 0.5, { kind: "ftp_pct", low: 115, high: 125 }),
  step("recover", 0.25, zone(1)),
);

export const SENIOR_BIKE_SESSIONS: readonly SeniorBikeSession[] = [
  {
    key: "kadence-recovery-45",
    name: { da: "Restitutionstur 45 min", en: "Recovery ride 45 min" },
    when: { da: "Hele året, dagen efter et hårdt pas", en: "All year, the day after a hard one" },
    why: {
      da: "Let tråd, så benene kommer sig. Så roligt, at du kan snakke hele vejen.",
      en: "Easy spinning so the legs recover. Easy enough to talk all the way.",
    },
    intensity: "easy",
    profiles: BOTH,
    structure: { kind: "bike", steps: [step("steady", 45, zone(1))] },
    source: EASY,
  },
  ...[60, 90, 120].map((minutes): SeniorBikeSession => ({
    key: `kadence-endurance-${minutes}`,
    name: {
      da: `Grundtur ${minutes === 60 ? "60 min" : minutes === 90 ? "1½ time" : "2 timer"}`,
      en: `Endurance ride ${minutes === 60 ? "60 min" : minutes === 90 ? "1½ hours" : "2 hours"}`,
    },
    when: ALL_YEAR,
    why: {
      da: "Rolig udholdenhed i zone 2. Det er størstedelen af ugen og det, der bygger formen.",
      en: "Steady endurance in zone 2. Most of the week is this, and it builds the base.",
    },
    intensity: "easy",
    profiles: BOTH,
    structure: endurance(minutes),
    source: EASY,
  })),
  {
    key: "kadence-long-150",
    name: { da: "Lang tur 2½ time", en: "Long ride 2½ hours" },
    when: { da: "Fra foråret, en gang om ugen", en: "From spring, once a week" },
    why: {
      da: "Ugens lange tur i roligt tempo. Husk at spise og drikke undervejs.",
      en: "The week's long ride at an easy pace. Eat and drink on the way.",
    },
    intensity: "easy",
    profiles: BOTH,
    structure: endurance(150),
    source: `${EASY}; within the motionist's longest ride of 3 hours (ADR 0091)`,
  },
  {
    key: "kadence-long-240",
    name: { da: "Lang tur 4 timer", en: "Long ride 4 hours" },
    when: { da: "Forår og sommer, op mod lange løb", en: "Spring and summer, towards long events" },
    why: {
      da: "Den lange tur, der gør dig klar til motionsløb og lange sommerture. Roligt, og spis hver halve time.",
      en: "The long ride that readies you for sportives and long summer rides. Easy, and eat every half hour.",
    },
    intensity: "easy",
    profiles: SUPER,
    structure: endurance(240, 15),
    source: `${EASY}; within the supermotionist's longest ride of 5 hours (ADR 0091)`,
  },
  {
    key: "kadence-tempo-2x20",
    name: { da: "Tempo 2 × 20 min", en: "Tempo 2 × 20 min" },
    when: { da: "Vinter og forår", en: "Winter and spring" },
    why: {
      da: "Jævnt og fast i zone 3. Bygger udholdenhed uden at tære så meget som et hårdt pas.",
      en: "Firm and even in zone 3. Builds endurance without costing as much as a hard session.",
    },
    intensity: "moderate",
    profiles: BOTH,
    structure: {
      kind: "bike",
      steps: [
        warmUp(15),
        intervals(2, step("work", 20, zone(3)), step("recover", 5, zone(1))),
        coolDown(10),
      ],
    },
    source: `${OWN}; tempo as the moderate share of a pyramidal week, which may suit recreational athletes best (Rosenblat et al. 2025, Sports Med 55(3):655–673)`,
  },
  {
    key: "kadence-threshold-3x10",
    name: { da: "Tærskel 3 × 10 min", en: "Threshold 3 × 10 min" },
    when: { da: "Fra januar til sommer", en: "From January to summer" },
    why: {
      da: "Tæt på det, du kan holde i en time. Hæver det tempo, du kan køre længe.",
      en: "Close to what you could hold for an hour. Raises the pace you can ride for long.",
    },
    intensity: "hard",
    profiles: BOTH,
    structure: {
      kind: "bike",
      steps: [
        warmUp(15),
        intervals(3, step("work", 10, zone(4)), step("recover", 5, zone(1))),
        coolDown(10),
      ],
    },
    source: `${OWN}; threshold work in zone 4 as the hard share of a pyramidal week (Rosenblat et al. 2025, Sports Med 55(3):655–673)`,
  },
  {
    key: "kadence-vo2-4x4",
    name: { da: "VO2max 4 × 4 min", en: "VO2max 4 × 4 min" },
    when: { da: "Forår og sommer", en: "Spring and summer" },
    why: {
      da: "Fire hårde minutter fire gange. Løfter din maksimale iltoptagelse.",
      en: "Four hard minutes, four times. Lifts your maximal oxygen uptake.",
    },
    intensity: "hard",
    profiles: BOTH,
    structure: {
      kind: "bike",
      steps: [
        warmUp(20),
        intervals(4, step("work", 4, zone(5)), step("recover", 3, zone(1))),
        coolDown(10),
      ],
    },
    source: `4 × 4 min at 90–95 % of max heart rate with 3 min active rest, in moderately trained runners: Helgerud et al. 2007, Med Sci Sports Exerc 39(4):665–671; ${OWN}, and the form on the bike in zone 5`,
  },
  {
    key: "kadence-30-15",
    name: { da: "Korte intervaller 3 × 13 × 30/15 s", en: "Short intervals 3 × 13 × 30/15 s" },
    when: { da: "Forår og sommer", en: "Spring and summer" },
    why: {
      da: "30 sekunder hårdt og 15 roligt, 13 gange i tre serier. Meget tid tæt på maks, uden at hvert drag er langt.",
      en: "30 seconds hard and 15 easy, 13 times in three series. Much time near your maximum, each effort short.",
    },
    intensity: "hard",
    profiles: SUPER,
    structure: {
      kind: "bike",
      steps: [
        warmUp(20),
        series,
        step("recover", 3, zone(1)),
        series,
        step("recover", 3, zone(1)),
        series,
        coolDown(10),
      ],
    },
    source: `3 series of 13 × 30 s / 15 s with 3 min between series, in cyclists: Rønnestad et al. 2015, Scand J Med Sci Sports 25(2):143–151, and 2020, 30(5):849–857; ${OWN}, and the 115–125 % of FTP`,
  },
  {
    key: "kadence-hills-6x2",
    name: { da: "Bakkeintervaller 6 × 2 min", en: "Hill repeats 6 × 2 min" },
    when: { da: "Forår og sommer", en: "Spring and summer" },
    why: {
      da: "Op ad bakken i to minutter, rolig ned igen. Styrke og fart på en gang.",
      en: "Up the hill for two minutes, easy back down. Strength and speed at once.",
    },
    intensity: "hard",
    profiles: BOTH,
    structure: {
      kind: "bike",
      steps: [
        warmUp(20),
        intervals(
          6,
          step("work", 2, zone(5), "Op ad bakken"),
          step("recover", 3, zone(1), "Rul ned"),
        ),
        coolDown(10),
      ],
    },
    source: `${OWN}: short hill repeats as a form of VO2max work (Helgerud et al. 2007; Rønnestad et al. 2020)`,
  },
  {
    key: "kadence-indoor-45",
    name: { da: "Hometrainer 45 min, 3 × 7 min", en: "Indoor 45 min, 3 × 7 min" },
    when: { da: "Vinter, og når vejret driller", en: "Winter, and when the weather says no" },
    why: {
      da: "Et kort pas til Rulle eller hometraineren: tre drag lige under tærsklen. Godt, når tiden er knap.",
      en: "A short session for Rulle or the trainer: three efforts just under threshold. Good when time is short.",
    },
    intensity: "moderate",
    profiles: BOTH,
    structure: {
      kind: "bike",
      steps: [
        warmUp(10),
        intervals(
          3,
          step("work", 7, { kind: "ftp_pct", low: 88, high: 93 }),
          step("recover", 3, zone(1)),
        ),
        coolDown(5),
      ],
    },
    source: `${OWN}: a time-efficient session just under threshold; low-volume interval training gives real gains in weeks (Gibala et al. 2012, J Physiol 590(5):1077–1084), and keeping it beside the easy hours is Kadence's judgement`,
  },
];

/** The sessions that suit a profile, in the catalogue's order. */
export function sessionsFor(profile: SeniorProfile): SeniorBikeSession[] {
  return SENIOR_BIKE_SESSIONS.filter((s) => s.profiles.includes(profile));
}

export function seniorSession(key: string): SeniorBikeSession | null {
  return SENIOR_BIKE_SESSIONS.find((s) => s.key === key) ?? null;
}
