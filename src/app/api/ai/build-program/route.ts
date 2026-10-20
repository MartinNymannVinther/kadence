import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { aiRead } from "@/modules/ai/read-route";
import { proposeProgramTurn } from "@/modules/exercises/ai/propose";
import { MAX_TURNS } from "@/modules/exercises/ai/prompt";
import { MAX_ITEMS } from "@/modules/exercises/program-draft";
import { doseSchema, exerciseRefSchema, PART_KEYS } from "@/modules/exercises/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One turn of "Byg med AI" for a programme (ADR 0071): the coach's words
 * with the programme in the builder and the turns before, answered with a
 * word back and the programme as it should now stand. Nothing is saved
 * here; the builder's own action does that when the coach presses Gem.
 */
const Draft = z.object({
  name: z.string().max(60).default(""),
  description: z.string().max(300).default(""),
  parts: z
    .array(
      z.object({
        key: z.enum(PART_KEYS),
        items: z
          .array(z.object({ exercise: exerciseRefSchema, dose: doseSchema.optional() }))
          .max(MAX_ITEMS),
      }),
    )
    .max(PART_KEYS.length),
});

const Body = z.object({
  text: z.string().trim().min(1).max(1500),
  draft: Draft,
  turns: z
    .array(z.object({ role: z.enum(["coach", "ai"]), text: z.string().max(1500) }))
    .max(MAX_TURNS * 2)
    .default([]),
  category: z.enum(["U17", "U19", "U23"]).nullable().default(null),
});

export async function POST(request: Request) {
  return aiRead(request, Body, async (ctx, input, locale) => {
    const t = await getTranslations({ locale, namespace: "exercises" });
    return proposeProgramTurn(ctx, input, t, locale);
  });
}
