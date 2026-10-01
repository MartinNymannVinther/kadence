import { rec } from "@/modules/ai/sanitize-helpers";
import { bikeStructureSchema, type BikeStructure } from "@/modules/workouts/structure";

/**
 * A bike session in the model's words, read into Kadence's own shape
 * (ADR 0017, ADR 0038). The grammar is what a prompt tells the model to
 * write; the sanitizer is what stands between its answer and the screen —
 * the same schema the builder checks before it saves. The coach's own
 * shorthand is read by the rules in parse-text.ts before any model is
 * asked. Pure: imports nothing from the database.
 */

export const BIKE_GRAMMAR = [
  'A step is {"kind": "step", "intent": "warmup"|"work"|"recover"|"cooldown"|"steady", "seconds": number, "target": T}. A repeat is {"kind": "repeat", "times": number, "steps": [step, ...]}.',
  'T is one of {"kind": "zone", "zone": 1-7}, {"kind": "ftp_pct", "low": n, "high": n}, {"kind": "hr_pct", "low": n, "high": n}, {"kind": "rpe", "value": 1-10}, {"kind": "open"}.',
  "Zones: 1 recovery, 2 endurance/distance, 3 tempo, 4 threshold (DCU's AT), 5 VO2max, 6 anaerobic, 7 sprint.",
].join(" ");

/** The model's steps, only if they are a valid session in Kadence's own shape. */
export function sanitizeParsed(data: unknown): BikeStructure | null {
  const parsed = bikeStructureSchema.safeParse({ kind: "bike", steps: rec(data).steps });
  return parsed.success && parsed.data.steps.length > 0 ? parsed.data : null;
}
