import { RACE_RULES } from "@/modules/dcu/races";
import { YOUTH_GEARING } from "@/modules/dcu/gearing";
import type { GuideSourceId } from "./sources";

/**
 * The open guides for parents, riders and coaches (ADR 0047): short
 * sections in Kadence's own words, each with its sources. The words are
 * in messages (`guides.<guide>.sections.<id>`), Danish first; this file
 * holds the order, how many points each section has, its sources, and
 * whether it is documented or the milieu's experience — so a test can
 * hold the three together, as for the coach guide (ADR 0021).
 *
 * Pure: imports nothing from the database.
 */

export type GuideId = "classes" | "equipment";

export type GuideSection = {
  id: string;
  points: number;
  sources: GuideSourceId[];
  /** Experience from the milieu rather than written rules; shown as such. */
  experience?: true;
};

export const CLASSES_GUIDE: readonly GuideSection[] = [
  { id: "age", points: 4, sources: ["dcuRules2026", "uciPart1", "atk"] },
  { id: "distances", points: 4, sources: ["dcuRules2026", "uciPart2"] },
  { id: "licence", points: 4, sources: ["dcuLicence", "dcuClipCard", "dcuRules2026"] },
  { id: "raceDay", points: 5, sources: ["dcuRules2026"] },
  { id: "abroad", points: 4, sources: ["uciPart1", "uciPart2", "dcuGear2023", "dcuU19Compendium"] },
  { id: "teams", points: 4, sources: ["dcuRules2026", "dcuTeams"] },
  {
    id: "nationalTeam",
    points: 4,
    sources: ["dcuU17Compendium", "dcuU19Compendium", "dcuStrategy"],
  },
  {
    id: "school",
    points: 4,
    sources: ["tdCriteria", "tdGymnasium", "tdElitekommuner", "dcuU17Compendium"],
  },
  { id: "unwritten", points: 4, sources: ["dcuU17Compendium", "dcuStrategy"], experience: true },
  { id: "gearing", points: 2, sources: ["dcuRules2026", "dcuGear2023"] },
];

export const EQUIPMENT_GUIDE: readonly GuideSection[] = [
  { id: "bunch", points: 3, sources: ["blocken2018"] },
  { id: "free", points: 4, sources: ["frictionFacts", "barry2015", "cnClothing2025"] },
  { id: "tyres", points: 4, sources: ["brrTyres"] },
  { id: "kit", points: 4, sources: ["cnClothing2025", "cnHelmets2025", "dcuRules2026"] },
  { id: "wheels", points: 4, sources: ["cnWheels2026", "cnBikes2024", "dcuRules2026"] },
  { id: "cosmetic", points: 3, sources: ["frictionFacts"] },
  { id: "training", points: 3, sources: ["swart2009"] },
  { id: "used", points: 4, sources: ["dcuRules2026"] },
];

export const GUIDES: Record<GuideId, readonly GuideSection[]> = {
  classes: CLASSES_GUIDE,
  equipment: EQUIPMENT_GUIDE,
};

/**
 * The numbers the guides' words name, from the modules that own them, so
 * the guides cannot drift from the calculator and the coach's tips.
 */
export function guideNumbers(): Record<string, number> {
  return {
    u17Road: RACE_RULES.U17.roadMaxKm!,
    u17Tt: RACE_RULES.U17.timeTrialMaxKm!,
    u19mMin: RACE_RULES.U19.men.roadMinKm!,
    u19mMax: RACE_RULES.U19.men.roadMaxKm!,
    u19wMin: RACE_RULES.U19.women.roadMinKm!,
    u19wMax: RACE_RULES.U19.women.roadMaxKm!,
    u19Tt: RACE_RULES.U19.men.timeTrialMaxKm!,
    u17Gear: YOUTH_GEARING.U17.limitM!,
    u15Gear: YOUTH_GEARING.U15.limitM!,
    u13Gear: YOUTH_GEARING.U13.limitM!,
  };
}
