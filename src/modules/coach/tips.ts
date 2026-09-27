import { addDaysIso } from "@/core/dates";
import { raceDays, raceRulesFor } from "@/modules/dcu/races";
import type { GuideSectionId } from "./guide";

/**
 * The coach's tips: a few short pieces of advice on the Today page, picked
 * from what is coming up and who is on the team, each linked to its
 * section of the coach guide. Guardrails, not bans: a tip says, it never
 * stops anything, and the coach can put it away (`key` is what "put away"
 * remembers — the same tip for the next race comes back).
 *
 * The words are in messages (`coachTips.<id>`); `values` fill them in.
 *
 * Pure: imports nothing from the database.
 */

export type TipId =
  | "stageTooLong"
  | "raceSoon"
  | "campSoon"
  | "examSoon"
  | "wellbeing"
  | "newClassU17"
  | "newClassU19"
  | "newClassU23"
  | "childCertificate"
  | "strengthWinter"
  | "weightOn"
  | "heat";

export type CoachTip = {
  id: TipId;
  key: string;
  section: GuideSectionId;
  values: Record<string, string | number>;
};

export type TipRider = { category: string; yearInClass: number | null; sex: string | null };
export type TipEvent = {
  id: string;
  kind: string;
  title: string;
  startsOn: string;
  endsOn: string;
};

export type TipInput = {
  today: string;
  riders: TipRider[];
  events: TipEvent[];
  flagKinds: string[];
  allowYouthWeight: boolean;
};

/** Tips shown at once, at most: more is noise. */
export const MAX_TIPS = 4;
/** How far ahead a race or exam brings its tip; a camp comes earlier. */
export const LOOKAHEAD_DAYS = 14;
export const CAMP_LOOKAHEAD_DAYS = 21;

const DCU = ["U17", "U19", "U23"] as const;
const month = (iso: string) => Number(iso.slice(5, 7));
const year = (iso: string) => iso.slice(0, 4);

export function coachTips(input: TipInput): CoachTip[] {
  const { today, riders, events } = input;
  const soon = (days: number) => (e: TipEvent) =>
    e.endsOn >= today && e.startsOn <= addDaysIso(today, days);
  const categories = new Set(riders.map((r) => r.category));
  const tips: CoachTip[] = [];

  // A stage race longer than DCU allows a class on the team: the one tip
  // that says a rule would be broken.
  for (const race of events.filter((e) => e.kind === "race").filter(soon(60))) {
    const days = raceDays(race.startsOn, race.endsOn);
    for (const category of DCU) {
      if (!categories.has(category)) continue;
      const limit = raceRulesFor(category).stageRaceMaxDays;
      if (days > limit)
        tips.push({
          id: "stageTooLong",
          key: `stageTooLong:${race.id}:${category}`,
          section: "classes",
          values: { title: race.title, date: race.startsOn, days, limit, category },
        });
    }
  }

  const race = events.filter((e) => e.kind === "race").find(soon(LOOKAHEAD_DAYS));
  if (race)
    tips.push({
      id: "raceSoon",
      key: `raceSoon:${race.id}`,
      section: "classes",
      values: { title: race.title, date: race.startsOn },
    });

  const camp = events.filter((e) => e.kind === "camp").find(soon(CAMP_LOOKAHEAD_DAYS));
  if (camp)
    tips.push({
      id: "campSoon",
      key: `campSoon:${camp.id}`,
      section: "volume",
      values: { title: camp.title, date: camp.startsOn },
    });

  const exam = events.filter((e) => e.kind === "exam").find(soon(LOOKAHEAD_DAYS));
  if (exam)
    tips.push({
      id: "examSoon",
      key: `examSoon:${exam.id}`,
      section: "school",
      values: { title: exam.title, date: exam.startsOn },
    });

  if (input.flagKinds.some((k) => k === "wellbeing_talk" || k === "wellbeing_help"))
    tips.push({
      id: "wellbeing",
      key: `wellbeing:${weekKey(today)}`,
      section: "wellbeing",
      values: {},
    });

  // The first weeks of a season (October, November): riders new in a class.
  if (month(today) === 10 || month(today) === 11)
    for (const category of DCU)
      if (riders.some((r) => r.category === category && r.yearInClass === 1))
        tips.push({
          id: `newClass${category}` as TipId,
          key: `newClass${category}:${seasonKey(today)}`,
          section: "classes",
          values: {},
        });

  // A first-year U17 rider may be 14 until their birthday: the law's line.
  if (riders.some((r) => r.category === "U17" && r.yearInClass === 1))
    tips.push({
      id: "childCertificate",
      key: "childCertificate",
      section: "safeguarding",
      values: {},
    });

  if (month(today) === 11)
    tips.push({
      id: "strengthWinter",
      key: `strengthWinter:${year(today)}`,
      section: "strength",
      values: {},
    });

  if (input.allowYouthWeight)
    tips.push({ id: "weightOn", key: "weightOn", section: "body", values: {} });

  if (month(today) >= 6 && month(today) <= 8)
    tips.push({ id: "heat", key: `heat:${year(today)}`, section: "heat", values: {} });

  return tips.slice(0, MAX_TIPS);
}

/** The Monday of a date's week, so a weekly tip comes back next week. */
function weekKey(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  const back = (date.getUTCDay() + 6) % 7;
  return addDaysIso(iso, -back);
}

/** The season a date falls in, by the October it started. */
function seasonKey(iso: string): string {
  return String(month(iso) >= 10 ? Number(year(iso)) : Number(year(iso)) - 1);
}
