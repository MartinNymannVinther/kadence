import type { OrgContext } from "@/core/db/tenant";
import { DATA_RULE, fenceUntrusted, languageRule } from "@/modules/ai/prompting";
import { rec } from "@/modules/ai/sanitize-helpers";
import { askForJson, modelConfigured, NoModel } from "@/modules/ai/service";
import { parseWorkoutText } from "@/modules/workouts/parse-text";
import { bikeStructureSchema, type BikeStructure } from "@/modules/workouts/structure";

/**
 * "Skriv det som du plejer": a coach's words turned into a structured bike
 * session (ADR 0017). The rules in parse-text.ts go first — offline, free
 * and exact for the shorthand coaches use; the model is asked only for
 * what they cannot read, and its answer must pass the same schema as the
 * builder's before it is shown. A read: nothing is saved until the coach
 * presses save in the builder. No rider data goes into the prompt.
 */

export type ParsedWorkout = { structure: BikeStructure; via: "rules" | "model" };

export function parseWorkoutPrompt(text: string, locale: string) {
  const system = [
    "You turn a cycling coach's description of a training session into structured steps.",
    'Answer with one JSON object: {"steps": [...]}. A step is {"kind": "step", "intent": "warmup"|"work"|"recover"|"cooldown"|"steady", "seconds": number, "target": T}. A repeat is {"kind": "repeat", "times": number, "steps": [step, ...]}.',
    'T is one of {"kind": "zone", "zone": 1-7}, {"kind": "ftp_pct", "low": n, "high": n}, {"kind": "hr_pct", "low": n, "high": n}, {"kind": "rpe", "value": 1-10}, {"kind": "open"}.',
    "Zones: 1 recovery, 2 endurance/distance, 3 tempo, 4 threshold (DCU's AT), 5 VO2max, 6 anaerobic, 7 sprint.",
    "Keep exactly what the coach wrote: durations, repetitions and intensities. Do not add steps the coach did not ask for, except a recovery between repetitions when the coach clearly implies one.",
    DATA_RULE,
    languageRule(locale),
  ].join(" ");
  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: fenceUntrusted(text, 1500) },
  ];
}

/** The model's steps, only if they are a valid session in Kadence's own shape. */
export function sanitizeParsed(data: unknown): BikeStructure | null {
  const parsed = bikeStructureSchema.safeParse({ kind: "bike", steps: rec(data).steps });
  return parsed.success && parsed.data.steps.length > 0 ? parsed.data : null;
}

export async function proposeParsedWorkout(
  ctx: OrgContext,
  text: string,
  locale: string,
): Promise<{ proposal: ParsedWorkout; engine: string } | null> {
  const byRules = parseWorkoutText(text);
  if (byRules) return { proposal: { structure: byRules, via: "rules" }, engine: "rules" };
  if (!(await modelConfigured(ctx))) throw new NoModel();
  const { data, engine } = await askForJson(
    ctx,
    "parse_workout",
    parseWorkoutPrompt(text, locale),
    {
      maxTokens: 1500,
    },
  );
  const structure = sanitizeParsed(data);
  return structure ? { proposal: { structure, via: "model" }, engine } : null;
}
