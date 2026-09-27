import { RACE_RULES } from "@/modules/dcu/races";
import { LONGEST_RIDE } from "@/modules/dcu/rules";
import type { CoachSourceId } from "./sources";

/**
 * The coach guide ("Trænerguide"): fourteen short sections in Kadence's
 * own words, each with the sources it stands on. The words are in
 * messages (`coachGuide.sections.<id>`), Danish first; this file holds
 * the order, how many points each section has, and its sources — so a
 * test can hold the three together. The research behind every claim is
 * docs/research/traenermateriale.md (ADR 0021).
 *
 * Pure: imports nothing from the database.
 */

export type GuideSectionId =
  | "role"
  | "safeguarding"
  | "classes"
  | "volume"
  | "strength"
  | "growth"
  | "injury"
  | "sleepFood"
  | "body"
  | "doping"
  | "wellbeing"
  | "school"
  | "heat"
  | "parents";

export type GuideSection = { id: GuideSectionId; points: number; sources: CoachSourceId[] };

export const GUIDE_SECTIONS: readonly GuideSection[] = [
  { id: "role", points: 4, sources: ["difMotivation", "atk", "henriksen", "difCoachPledge"] },
  {
    id: "safeguarding",
    points: 5,
    sources: [
      "lawChildCertificate",
      "difChildCertificate",
      "lawPenal223",
      "difAbuse",
      "dcuEducation",
      "lawTraffic49",
    ],
  },
  {
    id: "classes",
    points: 5,
    sources: ["dcuRules2026", "dcuU17Compendium", "dcuU19Compendium"],
  },
  {
    id: "volume",
    points: 4,
    sources: ["dcuHours2025", "dcuU17Compendium", "dcuU19Compendium"],
  },
  { id: "strength", points: 4, sources: ["dcuU17Compendium", "dcuU19Compendium", "atk"] },
  { id: "growth", points: 4, sources: ["difYouth", "atk"] },
  { id: "injury", points: 4, sources: ["atk", "tdParentGuide", "dcfhConcussion", "uciConcussion"] },
  { id: "sleepFood", points: 5, sources: ["atk", "tdFluid", "tdParentGuide"] },
  {
    id: "body",
    points: 5,
    sources: [
      "tdWeighing",
      "tdWeightPoster",
      "difEatingDisorders",
      "tdRems",
      "ioc2023Reds",
      "difYouth",
    ],
  },
  { id: "doping", points: 5, sources: ["addSupplements", "atk", "addAsthma"] },
  { id: "wellbeing", points: 4, sources: ["tdWellbeing2024", "tdParentGuide", "henriksen"] },
  {
    id: "school",
    points: 4,
    sources: ["tdParentGuide", "henriksen", "tdDualCareer", "dcuStrategy"],
  },
  { id: "heat", points: 4, sources: ["tdFluid", "uciHeat"] },
  { id: "parents", points: 4, sources: ["tdParentGuide", "difYouth"] },
];

/**
 * The numbers the guide's words name, from the modules that own them, so
 * the guide cannot drift from what the guardrails and tips use.
 */
export function guideValues(): Record<string, number> {
  return {
    u17Road: RACE_RULES.U17.roadMaxKm!,
    u17Tt: RACE_RULES.U17.timeTrialMaxKm!,
    u17Gear: RACE_RULES.U17.gearingM!,
    u19mMin: RACE_RULES.U19.men.roadMinKm!,
    u19mMax: RACE_RULES.U19.men.roadMaxKm!,
    u19wMin: RACE_RULES.U19.women.roadMinKm!,
    u19wMax: RACE_RULES.U19.women.roadMaxKm!,
    u19Tt: RACE_RULES.U19.men.timeTrialMaxKm!,
    youthStage: RACE_RULES.U17.stageRaceMaxDays,
    u23Stage: RACE_RULES.U23.stageRaceMaxDays,
    u17LongH: LONGEST_RIDE.U17!.hours,
    u17LongKm: LONGEST_RIDE.U17!.km,
    u19LongH: LONGEST_RIDE.U19!.hours,
    u19LongKm: LONGEST_RIDE.U19!.km,
  };
}
