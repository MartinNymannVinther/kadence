import { withOrgContext, type OrgContext } from "@/core/db/tenant";
import { askForJson, modelConfigured, NoModel } from "@/modules/ai/service";
import { requireCoach } from "@/modules/team/access";
import { parseWorkoutText } from "@/modules/workouts/parse-text";
import {
  bikeStructureSchema,
  strengthStructureSchema,
  type BikeStructure,
  type StrengthStructure,
} from "@/modules/workouts/structure";
import {
  sanitizeBuilt,
  workoutNotes,
  type BuildCategory,
  type BuildSport,
  type BuiltWorkout,
} from "./build-workout-answer";
import { buildWorkoutPrompt } from "./build-workout-prompt";
import { teamParadigm } from "@/modules/team/settings";

export type { BuildCategory, BuiltWorkout, BuildSport };

/**
 * "Byg med AI" (ADR 0038): a coach's words become a bike or a strength
 * session — from nothing, or by changing the one already in the builder.
 * A read on its own route: nothing is saved until the coach presses save
 * (dogma 5). The coach's shorthand for a bike session is read by the
 * rules first, offline and free; the model only for the rest. The class
 * is the coach's choice in the panel — one of DCU's classes, or an adult's
 * training profile (ADR 0092) — not read from any rider, so no rider's
 * data goes in and the team's switch for riders' data is not asked.
 * Building is a coach's (ADR 0010), and so is this.
 */

/** Bigger than any session a coach builds by hand; past it the session is not sent. */
const MAX_CURRENT_CHARS = 10_000;

export type BuildInput = {
  sport: BuildSport;
  text: string;
  category: BuildCategory | null;
  current?: unknown;
};

/** The session in the builder, if it is one worth changing: valid, of the sport, not empty. */
export function currentSession(
  sport: BuildSport,
  value: unknown,
): BikeStructure | StrengthStructure | null {
  if (value === undefined || value === null) return null;
  if (JSON.stringify(value).length > MAX_CURRENT_CHARS) return null;
  if (sport === "bike") {
    const parsed = bikeStructureSchema.safeParse(value);
    return parsed.success && parsed.data.steps.length > 0 ? parsed.data : null;
  }
  const parsed = strengthStructureSchema.safeParse(value);
  return parsed.success && parsed.data.exercises.length > 0 ? parsed.data : null;
}

export async function proposeBuiltWorkout(
  ctx: OrgContext,
  input: BuildInput,
  locale: string,
): Promise<{ proposal: BuiltWorkout; engine: string } | null> {
  const guided = await withOrgContext(ctx, async (tx) => {
    await requireCoach(tx, ctx);
    return (await teamParadigm(tx, ctx.orgId)) !== null;
  });
  const current = currentSession(input.sport, input.current);
  if (input.sport === "bike" && !current) {
    const byRules = parseWorkoutText(input.text);
    if (byRules)
      return {
        proposal: {
          title: "",
          description: "",
          structure: byRules,
          notes: workoutNotes(byRules, input.category, guided),
          via: "rules",
        },
        engine: "rules",
      };
  }
  if (!(await modelConfigured(ctx))) throw new NoModel();
  const { data, engine } = await askForJson(
    ctx,
    "build_workout",
    buildWorkoutPrompt({ ...input, current, locale, guided }),
    { maxTokens: input.sport === "strength" ? 3000 : 2000 },
  );
  const proposal = sanitizeBuilt(input.sport, data, input.category, guided);
  return proposal ? { proposal, engine } : null;
}
