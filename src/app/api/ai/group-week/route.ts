import { z } from "zod";
import { CLASS_BASES } from "@/modules/dcu";
import { SENIOR_BASES } from "@/modules/paradigms";
import { aiRead } from "@/modules/ai/read-route";
import { proposeGroupWeek } from "@/modules/assist/group-week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A week for a group of riders, from DCU's hours for the class-year the
 * coach chose — or an adult training profile's (docs/adr/0092) — and the
 * team's own library (docs/adr/0043). No rider's data is read, so the
 * team's switch for it is not asked.
 */
const Body = z.object({
  monday: z.iso.date(),
  basis: z.enum([...CLASS_BASES, ...SENIOR_BASES]),
  text: z.string().trim().max(600).default(""),
});

export async function POST(request: Request) {
  return aiRead(request, Body, (ctx, input, locale) => proposeGroupWeek(ctx, input, locale), {
    requireModel: true,
  });
}
