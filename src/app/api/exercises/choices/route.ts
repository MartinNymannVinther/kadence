import { createTranslator } from "next-intl";
import type { NextRequest } from "next/server";
import { requireOrgContext } from "@/core/auth/guard";
import { exerciseChoices } from "@/modules/exercises/choices";
import type { Translate } from "@/modules/exercises/dose";
import da from "../../../../../messages/da.json";
import en from "../../../../../messages/en.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The library's exercises for the strength builder's suggestions, named in
 * `?locale=` (src/modules/exercises/choices.ts): what ties an exercise in a
 * session to its figure and how-to. A route rather than an action because
 * it is a read, and the client runs actions one at a time, so a builder
 * opening behind another would wait for it. Every member reads the
 * library, so it asks for a session and no role; a language it does not
 * have is Danish, as the installation's default is.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireOrgContext();
  if (!ctx) return Response.json({ error: "unauthorized" }, { status: 401 });
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "da";
  const messages = locale === "en" ? en : da;
  const t = createTranslator({ locale, messages, namespace: "exercises" }) as unknown as Translate;
  return Response.json(await exerciseChoices(ctx, t, locale), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
