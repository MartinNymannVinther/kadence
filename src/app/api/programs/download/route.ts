import { createTranslator } from "next-intl";
import type { NextRequest } from "next/server";
import { requireOrgContext } from "@/core/auth/guard";
import { callerKey, rateLimit } from "@/core/rate-limit";
import { decodeComposition } from "@/modules/exercises/compose";
import type { Translate } from "@/modules/exercises/dose";
import { renderProgramHtml } from "@/modules/exercises/download-html";
import { teamProgramView } from "@/modules/exercises/resolve";
import { builtinLookup, builtinProgramView, programParts } from "@/modules/exercises/view";
import type { ProgramView } from "@/modules/exercises/types";
import { slugify } from "@/modules/workouts/export";
import da from "../../../../../messages/da.json";
import en from "../../../../../messages/en.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;
const TEAM_ID = /^[0-9a-f-]{36}$/;
type Locale = "da" | "en";

function translatorFor(locale: Locale): Translate {
  const messages = locale === "en" ? en : da;
  return createTranslator({ locale, messages, namespace: "exercises" }) as unknown as Translate;
}

/**
 * One programme as a self-contained HTML file to download
 * (docs/plan-ovelser-og-programmer.md), with either `program=builtin:<id>`,
 * `program=team:<uuid>` (a signed-in member of that team only, read under
 * RLS; 404 for anyone else, signed in or not — a link never says whether
 * the programme exists), or `c=<composition>` (built-in exercises only),
 * plus `locale`. Ø-04's library links here for a team's own programmes;
 * the contract is the query string above, not the markup.
 */
export async function GET(request: NextRequest) {
  if (!rateLimit(callerKey(request.headers, "programs-download"), 120, HOUR).allowed)
    return new Response("Too many requests", { status: 429 });

  const params = request.nextUrl.searchParams;
  const locale: Locale = params.get("locale") === "en" ? "en" : "da";
  const t = translatorFor(locale);

  const programParam = params.get("program");
  const compositionParam = params.get("c");

  let program: ProgramView | null;
  let programKey: string;

  if (programParam?.startsWith("builtin:")) {
    programKey = programParam;
    program = builtinProgramView(programParam.slice("builtin:".length), t);
  } else if (programParam?.startsWith("team:")) {
    programKey = programParam;
    const id = programParam.slice("team:".length);
    const ctx = TEAM_ID.test(id) ? await requireOrgContext() : null;
    program = ctx ? await teamProgramView(ctx, id, t) : null;
  } else if (compositionParam) {
    programKey = compositionParam;
    const parts = decodeComposition(compositionParam);
    program = parts
      ? {
          title: t("compose.previewTitle"),
          description: "",
          parts: programParts(parts, builtinLookup(t)),
        }
      : null;
  } else {
    return new Response("Nothing asked for", { status: 400 });
  }

  if (!program || program.parts.length === 0) return new Response("Not found", { status: 404 });

  const html = renderProgramHtml(program, { t, locale, programKey });
  const fileName = `${slugify(program.title, "program")}.html`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
