import type {
  BikeStructure,
  Exercise,
  Intent,
  ProgressionRule,
  Repeat,
  Step,
  Structure,
  Target,
} from "@/modules/workouts/structure";

/**
 * What the builder starts a new thing with: a step is five minutes of
 * work at threshold or an easy ten at the edges, a repeat is three times
 * work and rest, an exercise is three sets of twelve. Sensible enough that
 * a coach changes one number rather than five.
 */

type Sport = "bike" | "strength" | "other";

const EASY: Target = { kind: "zone", zone: 2 };

export function newStep(intent: Intent = "work"): Step {
  switch (intent) {
    case "warmup":
      return { kind: "step", intent, seconds: 600, target: EASY };
    case "cooldown":
      return { kind: "step", intent, seconds: 600, target: { kind: "zone", zone: 1 } };
    case "recover":
      return { kind: "step", intent, seconds: 180, target: { kind: "zone", zone: 1 } };
    case "steady":
      return { kind: "step", intent, seconds: 3600, target: EASY };
    case "work":
      return { kind: "step", intent, seconds: 300, target: { kind: "zone", zone: 4 } };
  }
}

export function newRepeat(): Repeat {
  return { kind: "repeat", times: 3, steps: [newStep("work"), newStep("recover")] };
}

/** A target of another kind, keeping the zone's neighbourhood where it can. */
export function targetOfKind(kind: Target["kind"]): Target {
  switch (kind) {
    case "zone":
      return { kind, zone: 2 };
    case "ftp_pct":
      return { kind, low: 88, high: 94 };
    case "hr_pct":
      return { kind, low: 85, high: 90 };
    case "rpe":
      return { kind, value: 5 };
    case "open":
      return { kind };
  }
}

export function newExercise(): Exercise {
  return { name: "", group: "legs", sets: 3, reps: "12", load: "", note: "" };
}

export function newRule(from = 1): ProgressionRule {
  return { group: "legs", from, to: null, sets: 3, reps: "12", load: "" };
}

export const EMPTY_BIKE: BikeStructure = {
  kind: "bike",
  steps: [newStep("warmup"), newStep("cooldown")],
};

export function emptyStructure(sport: Sport): Structure {
  if (sport === "bike") return EMPTY_BIKE;
  if (sport === "strength")
    return {
      kind: "strength",
      warmup: "",
      exercises: [newExercise()],
      progression: [],
      minutes: 60,
    };
  return { kind: "other", text: "", minutes: 60 };
}
