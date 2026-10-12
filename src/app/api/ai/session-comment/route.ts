import { z } from "zod";
import { aiRead } from "@/modules/ai/read-route";
import { proposeSessionComment } from "@/modules/assist/session-comment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A short, warm comment on one session that was done (docs/adr/0095); saved only by a person's press. */
const Body = z.object({ sessionId: z.string().min(1).max(100) });

export async function POST(request: Request) {
  return aiRead(request, Body, (ctx, input, locale) => proposeSessionComment(ctx, input, locale), {
    requireModel: true,
  });
}
