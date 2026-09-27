import { z } from "zod";
import { aiRead } from "@/modules/ai/read-route";
import { buildCoachBrief } from "@/modules/assist/coach-brief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The Monday brief (docs/adr/0017): the riders who need attention, always;
 * a few sentences from the model on top when asked for and allowed.
 */
const Body = z.object({ withSummary: z.boolean().default(false) });

export async function POST(request: Request) {
  return aiRead(request, Body, (ctx, input, locale) =>
    buildCoachBrief(ctx, locale, { withSummary: input.withSummary }),
  );
}
