import { z } from "zod";
import { aiRead } from "@/modules/ai/read-route";
import { proposeWeek } from "@/modules/assist/week-draft";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A proposed week for one rider (docs/adr/0017); the coach takes it session by session. */
const Body = z.object({
  riderId: z.string().min(1).max(100),
  monday: z.iso.date(),
});

export async function POST(request: Request) {
  return aiRead(request, Body, (ctx, input, locale) => proposeWeek(ctx, input, locale), {
    requireModel: true,
  });
}
