import { z } from "zod";
import { aiRead } from "@/modules/ai/read-route";
import { proposeParsedWorkout } from "@/modules/assist/parse-workout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A coach's words as a structured bike session (docs/adr/0017). The rules
 * answer first, without a model; the model only for what they cannot read.
 */
const Body = z.object({ text: z.string().trim().min(1).max(1500) });

export async function POST(request: Request) {
  return aiRead(request, Body, (ctx, input, locale) =>
    proposeParsedWorkout(ctx, input.text, locale),
  );
}
