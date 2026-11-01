import type { SeniorProfile } from "./senior";
import { SENIOR_BIKE_SESSIONS } from "./senior-sessions";
import { SENIOR_STRENGTH_PROGRAMMES } from "./senior-strength";

/**
 * Kadence's ready weeks for an adult (docs/adr/0092,
 * docs/research/motionist-pas-og-programmer.md §5): four one-week forløb
 * per profile — a winter base week, a spring build week, a summer week and
 * an easy week — installed as training blocks (ADR 0025) whose items are
 * the installed sessions and strength programme. The person lays one into
 * their week as any forløb (block-apply.ts), and the preview shows the
 * profile's corridor.
 *
 * The weeks follow the research note: a motionist has one hard session a
 * week, a supermotionist two, both mostly easy riding with a long ride at
 * the weekend and at least one day off the bike; strength twice a week in
 * winter and once after, at least 48 hours apart. Which session lies on
 * which day, and the hours, are Kadence's own judgement.
 *
 * Pure: imports nothing from the database.
 */

export type SeniorSeason = "winter" | "spring" | "summer" | "easy";

/**
 * Hard sessions a week at most: one for a motionist, two for a
 * supermotionist (research note §2), Kadence's reading of the sources'
 * "mostly easy, a few hard" for a 5- and a 10-hour week.
 */
export const HARD_PER_WEEK: Record<SeniorProfile, number> = {
  motionist: 1,
  "super-motionist": 2,
};

export const SENIOR_SEASONS: readonly SeniorSeason[] = ["winter", "spring", "summer", "easy"];

export type SeniorWeek = {
  /** Stable: the installed block keeps it as `source_key`. */
  key: string;
  profile: SeniorProfile;
  season: SeniorSeason;
  name: { da: string; en: string };
  description: { da: string; en: string };
  /** Day 0 is Monday; `session` is a bike session's or a strength programme's key. */
  items: ReadonlyArray<{ day: number; session: string }>;
};

const M = SENIOR_STRENGTH_PROGRAMMES.motionist.key;
const S = SENIOR_STRENGTH_PROGRAMMES["super-motionist"].key;

const PROFILE_NAME: Record<SeniorProfile, string> = {
  motionist: "Motionist",
  "super-motionist": "Supermotionist",
};

const SEASON_NAME: Record<SeniorSeason, { da: string; en: string }> = {
  winter: { da: "vinteruge", en: "winter week" },
  spring: { da: "forårsuge", en: "spring week" },
  summer: { da: "sommeruge", en: "summer week" },
  easy: { da: "let uge", en: "easy week" },
};

function week(
  profile: SeniorProfile,
  season: SeniorSeason,
  description: { da: string; en: string },
  items: Array<[number, string]>,
): SeniorWeek {
  return {
    key: `kadence-week-${profile}-${season}`,
    profile,
    season,
    name: {
      da: `${PROFILE_NAME[profile]}: ${SEASON_NAME[season].da}`,
      en: `${PROFILE_NAME[profile]}: ${SEASON_NAME[season].en}`,
    },
    description,
    items: items.map(([day, session]) => ({ day, session })),
  };
}

export const SENIOR_WEEKS: readonly SeniorWeek[] = [
  week(
    "motionist",
    "winter",
    {
      da: "November til februar. Omkring 4 timer på cyklen, et træningspas på hometraineren og styrke to gange.",
      en: "November to February. About 4 hours on the bike, one session on the trainer and strength twice.",
    },
    [
      [0, M],
      [1, "kadence-indoor-45"],
      [3, "kadence-endurance-60"],
      [4, M],
      [5, "kadence-endurance-90"],
      [6, "kadence-endurance-60"],
    ],
  ),
  week(
    "motionist",
    "spring",
    {
      da: "Marts til maj. Omkring 5½ time med et hårdt træningspas, en lang tur og styrke en gang.",
      en: "March to May. About 5½ hours with one hard session, a long ride and strength once.",
    },
    [
      [1, "kadence-threshold-3x10"],
      [2, M],
      [3, "kadence-endurance-60"],
      [5, "kadence-long-150"],
      [6, "kadence-recovery-45"],
    ],
  ),
  week(
    "motionist",
    "summer",
    {
      da: "Juni til september. Omkring 6½ time med et hårdt træningspas, en lang tur og styrke en gang.",
      en: "June to September. About 6½ hours with one hard session, a long ride and strength once.",
    },
    [
      [1, "kadence-vo2-4x4"],
      [2, "kadence-endurance-90"],
      [3, M],
      [5, "kadence-long-150"],
      [6, "kadence-endurance-90"],
    ],
  ),
  week(
    "motionist",
    "easy",
    {
      da: "En rolig uge hver tredje eller fjerde uge, eller i oktober. Omkring 3 timer, intet hårdt.",
      en: "A quiet week every third or fourth week, or in October. About 3 hours, nothing hard.",
    },
    [
      [1, "kadence-endurance-60"],
      [2, M],
      [3, "kadence-recovery-45"],
      [5, "kadence-endurance-90"],
    ],
  ),
  week(
    "super-motionist",
    "winter",
    {
      da: "November til februar. Omkring 7½ time, to kvalitetspas og tung styrke to gange.",
      en: "November to February. About 7½ hours, two quality sessions and heavy strength twice.",
    },
    [
      [1, "kadence-tempo-2x20"],
      [2, "kadence-endurance-60"],
      [2, S],
      [3, "kadence-indoor-45"],
      [4, S],
      [5, "kadence-long-150"],
      [6, "kadence-endurance-120"],
    ],
  ),
  week(
    "super-motionist",
    "spring",
    {
      da: "Marts til maj. Omkring 10 timer med to hårde træningspas, en lang tur på 4 timer og styrke en gang.",
      en: "March to May. About 10 hours with two hard sessions, a 4-hour ride and strength once.",
    },
    [
      [1, "kadence-threshold-3x10"],
      [2, "kadence-endurance-90"],
      [2, S],
      [3, "kadence-vo2-4x4"],
      [4, "kadence-recovery-45"],
      [5, "kadence-long-240"],
      [6, "kadence-endurance-120"],
    ],
  ),
  week(
    "super-motionist",
    "summer",
    {
      da: "Juni til september. Omkring 11 timer med to hårde træningspas, to lange ture og styrke en gang.",
      en: "June to September. About 11 hours with two hard sessions, two long rides and strength once.",
    },
    [
      [1, "kadence-30-15"],
      [2, "kadence-endurance-120"],
      [2, S],
      [3, "kadence-hills-6x2"],
      [4, "kadence-recovery-45"],
      [5, "kadence-long-240"],
      [6, "kadence-long-150"],
    ],
  ),
  week(
    "super-motionist",
    "easy",
    {
      da: "En rolig uge hver tredje eller fjerde uge, eller i oktober. Omkring 5 timer, intet hårdt.",
      en: "A quiet week every third or fourth week, or in October. About 5 hours, nothing hard.",
    },
    [
      [1, "kadence-endurance-60"],
      [2, S],
      [3, "kadence-endurance-90"],
      [5, "kadence-endurance-120"],
      [6, "kadence-recovery-45"],
    ],
  ),
];

/** The ready week that fits a month (1–12): October's is the easy week. */
export function seasonOfMonth(month: number): SeniorSeason {
  if (month === 10) return "easy";
  if (month >= 11 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  return "summer";
}

export function seniorWeek(profile: SeniorProfile, season: SeniorSeason): SeniorWeek {
  return SENIOR_WEEKS.find((w) => w.profile === profile && w.season === season)!;
}

/** Every key a ready week names exists among the sessions and programmes. */
export const SENIOR_CONTENT_KEYS: ReadonlySet<string> = new Set([
  ...SENIOR_BIKE_SESSIONS.map((s) => s.key),
  ...Object.values(SENIOR_STRENGTH_PROGRAMMES).map((p) => p.key),
]);
