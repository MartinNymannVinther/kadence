import type { BikeStructure, Step, Target } from "@/modules/workouts/structure";
import { INTERVAL_FORMS } from "./intensity";

/**
 * DCU's interval forms and example-week sessions as sessions to ride
 * (ADR 0035): what a rider without a planned session can choose in Rulle.
 * The intervals are DCU's own examples — "2*15", "3*8", "10*30/30" —
 * from the interval sheet (intervaltraening.pdf p. 2-3) and the
 * compendia's example weeks. The warm-up, the pauses and the cool-down are
 * Kadence's, since DCU gives none; so is the zone each form is ridden in,
 * Kadence's reading of DCU's forms (Medium zone 3, AT zone 4, VO2 max zone
 * 5, anaerobic capacity zone 6; a sprint all out, freely). Each carries
 * DCU's own words for when it belongs in a season — shown beside it, never
 * enforced.
 *
 * Pure: imports nothing from the database.
 */

export type DcuBikeSession = {
  /** Stable, for a choice remembered or a template made from it. */
  key: string;
  name: { da: string; en: string };
  /** When DCU puts it in a season, in DCU's words and in English. */
  when: { da: string; en: string };
  structure: BikeStructure;
  source: string;
};

const SHEET = "intervaltraening.pdf p. 2-3";
const WEEKS = "DCU_U17_kompendium_2016.pdf p. 14; DCU_U19_kompendium_2016.pdf p. 16-17";

const zone = (z: 1 | 2 | 3 | 4 | 5 | 6 | 7): Target => ({ kind: "zone", zone: z });

function step(intent: Step["intent"], seconds: number, target: Target, label?: string): Step {
  return { kind: "step", intent, seconds, target, ...(label ? { label } : {}) };
}

const warmUp = (minutes: number) => step("warmup", minutes * 60, zone(2));
const coolDown = (minutes: number) => step("cooldown", minutes * 60, zone(1));

/** `times` of `work` then `rest`, as the sheet writes "3*8". */
function intervals(times: number, work: Step, rest: Step): BikeStructure["steps"][number] {
  return { kind: "repeat", times, steps: [work, rest] };
}

/** DCU's own word for when a form belongs, from the interval sheet. */
function placement(form: string): string {
  const found = INTERVAL_FORMS.find((f) => f.form === form);
  if (!found) throw new Error(`DCU has no interval form "${form}".`);
  return found.placement;
}

export const DCU_BIKE_SESSIONS: readonly DcuBikeSession[] = [
  {
    key: "dcu-base-60",
    name: { da: "Grundtræning 60 min", en: "Base ride 60 min" },
    when: {
      da: "Hele året – og i november kun den",
      en: "All year – and in November nothing else",
    },
    structure: {
      kind: "bike",
      steps: [step("warmup", 600, zone(1)), step("steady", 45 * 60, zone(2)), coolDown(5)],
    },
    source: `${WEEKS} (Grundtræning); DCU web page, year wheel, November`,
  },
  {
    key: "dcu-medium-2x15",
    name: { da: "Medium 2 × 15 min", en: "Medium 2 × 15 min" },
    when: { da: placement("Medium"), en: "From December or January" },
    structure: {
      kind: "bike",
      steps: [
        warmUp(15),
        intervals(2, step("work", 15 * 60, zone(3)), step("recover", 5 * 60, zone(1))),
        coolDown(10),
      ],
    },
    source: `${SHEET} (Medium: 2*15)`,
  },
  {
    key: "dcu-at-3x8",
    name: { da: "AT 3 × 8 min", en: "AT 3 × 8 min" },
    when: { da: placement("AT"), en: "From December or January" },
    structure: {
      kind: "bike",
      steps: [
        warmUp(15),
        intervals(3, step("work", 8 * 60, zone(4)), step("recover", 4 * 60, zone(1))),
        coolDown(10),
      ],
    },
    source: `${SHEET} (AT: 3*8)`,
  },
  {
    key: "dcu-vo2-3x3",
    name: { da: "VO2 max 3 × 3 min", en: "VO2 max 3 × 3 min" },
    when: { da: placement("VO2 max"), en: "Two months before the peak" },
    structure: {
      kind: "bike",
      steps: [
        warmUp(20),
        intervals(3, step("work", 3 * 60, zone(5)), step("recover", 3 * 60, zone(1))),
        coolDown(10),
      ],
    },
    source: `${SHEET} (VO2 max: 3*3)`,
  },
  {
    key: "dcu-anaerobic-10x30",
    name: { da: "Anaerob kapacitet 10 × 30/30 s", en: "Anaerobic capacity 10 × 30/30 s" },
    when: { da: placement("Anaerob kap."), en: "Four to six weeks before the peak" },
    structure: {
      kind: "bike",
      steps: [
        warmUp(20),
        intervals(10, step("work", 30, zone(6)), step("recover", 30, zone(1))),
        coolDown(15),
      ],
    },
    source: `${SHEET} (Anaerob kap.: 10*30/30)`,
  },
  {
    key: "dcu-sprint-5x10",
    name: { da: "Spurt 5 × 10 s", en: "Sprint 5 × 10 s" },
    when: { da: placement("spurt"), en: "Two months before the peak" },
    structure: {
      kind: "bike",
      steps: [
        warmUp(20),
        // All out, ridden freely: no trainer holds a sprint.
        intervals(5, step("work", 10, { kind: "open" }, "Spurt"), step("recover", 290, zone(1))),
        coolDown(10),
      ],
    },
    source: `${SHEET} (spurt: 5*10 sek)`,
  },
  {
    key: "dcu-opener",
    name: { da: "Opladning: 5 min AT", en: "Opener: 5 min AT" },
    when: { da: "Dagen før løb", en: "The day before a race" },
    structure: {
      kind: "bike",
      steps: [warmUp(15), step("work", 5 * 60, zone(4)), coolDown(10)],
    },
    source:
      "DCU_U17_kompendium_2016.pdf p. 14; DCU_U19_kompendium_2016.pdf p. 17 (Opladning: 1*5 min. AT)",
  },
];
