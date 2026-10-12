import { z } from "zod";
import { aiRead } from "@/modules/ai/read-route";
import { proposeBuiltWorkout } from "@/modules/assist/build-workout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A coach's words built into a bike or strength session (docs/adr/0038):
 * from nothing, or by changing the session already in the builder. The
 * rules read bike shorthand first, without a model. The class — or an
 * adult's training profile (docs/adr/0092) — is the coach's choice, so no
 * rider's data is read.
 */
const Body = z.object({
  sport: z.enum(["bike", "strength"]),
  text: z.string().trim().min(1).max(1500),
  category: z
    .enum(["U17", "U19", "U23", "senior-motionist", "senior-super-motionist"])
    .nullable()
    .default(null),
  current: z.unknown().optional(),
});

export async function POST(request: Request) {
  return aiRead(request, Body, (ctx, input, locale) => proposeBuiltWorkout(ctx, input, locale));
}
