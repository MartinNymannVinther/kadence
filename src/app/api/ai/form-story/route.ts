import { z } from "zod";
import { aiRead } from "@/modules/ai/read-route";
import { proposeFormStory } from "@/modules/assist/form-story";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A prose reading of a rider's form chart and what else Kadence knows (docs/adr/0108); nothing saved. */
const Body = z.object({ riderId: z.string().min(1).max(100) });

export async function POST(request: Request) {
  return aiRead(request, Body, (ctx, input, locale) => proposeFormStory(ctx, input, locale), {
    requireModel: true,
  });
}
