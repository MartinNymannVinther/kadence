"use client";

import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { askAi } from "@/modules/ai/read-client";
import type { AiFailure } from "@/modules/ai/wire";
import { AiFailureText } from "./ai-failure";
import { Thinking } from "./thinking";
import { ProposalFrame } from "./proposal-frame";

type Brief = {
  riders: Array<{ riderId: string; name: string }>;
  summary: string | null;
  leftOut: string[];
};

/**
 * "Skriv et resumé" on the coach's Monday: a few sentences from the model
 * on who to talk to first, on top of the attention list the guardrails
 * already made (ADR 0017). Only where the team lets the AI read riders'
 * data; it never writes to a rider, and the coach decides what to do.
 * Riders whose rides from Garmin the AI may not read are named under it
 * (ADR 0112).
 */
export function CoachBrief({ allowed }: { allowed: boolean }) {
  const t = useTranslations("assist.brief");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{ brief: Brief; engine: string } | null>(null);
  const [error, setError] = useState<AiFailure | string | null>(null);
  const abort = useRef<AbortController | null>(null);

  if (!allowed)
    return (
      <p className="text-meta text-xs leading-relaxed">
        {t("off")}{" "}
        <Link href="/settings/team" className="focus-ring text-primary font-medium hover:underline">
          {t("offLink")}
        </Link>
      </p>
    );

  async function ask() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);
    const result = await askAi<Brief>(
      "coach-brief",
      { withSummary: true },
      {
        locale,
        signal: controller.signal,
      },
    );
    if (controller.signal.aborted) return;
    setBusy(false);
    if (result.ok) setAnswer({ brief: result.proposal, engine: result.engine });
    else setError(result.error);
  }

  return (
    <div className="flex flex-col gap-3">
      {!answer && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="max-sm:h-11"
            disabled={busy}
            onClick={() => void ask()}
          >
            <Sparkles data-icon="inline-start" />
            {t("ask")}
          </Button>
          {busy && <Thinking>{t("thinking")}</Thinking>}
        </div>
      )}
      {error && <AiFailureText error={error} />}
      {answer &&
        !answer.brief.summary &&
        answer.engine === "none" &&
        answer.brief.riders.length > 0 &&
        answer.brief.leftOut.length === 0 && <AiFailureText error="noModel" />}
      {answer &&
        (answer.brief.summary ? (
          <ProposalFrame title={t("title")} engine={answer.engine} onClose={() => setAnswer(null)}>
            <p className="text-reading leading-relaxed whitespace-pre-line">
              {answer.brief.summary}
            </p>
          </ProposalFrame>
        ) : answer.engine === "none" && answer.brief.riders.length > 0 ? null : (
          <p className="text-meta text-2sm">
            {answer.brief.riders.length === 0 ? t("nothing") : t("noSummary")}
          </p>
        ))}
      {answer && answer.brief.leftOut.length > 0 && (
        <p className="text-meta text-2sm leading-relaxed">
          {t("leftOut", {
            names: new Intl.ListFormat(locale === "en" ? "en-GB" : "da-DK", {
              type: "conjunction",
            }).format(answer.brief.leftOut),
            count: answer.brief.leftOut.length,
          })}
        </p>
      )}
    </div>
  );
}
