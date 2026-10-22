"use client";

import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AiFailureText } from "@/components/assist/ai-failure";
import { ProposalFrame } from "@/components/assist/proposal-frame";
import { Thinking } from "@/components/assist/thinking";
import { Button } from "@/components/ui/button";
import { askAi } from "@/modules/ai/read-client";
import type { AiFailure } from "@/modules/ai/wire";

/**
 * "Forklar formen med AI" (docs/adr/0109): a quiet button under the form
 * chart that asks the model for a few paragraphs on what the curve says
 * and what else Kadence knows about the rider's training. The answer
 * stands in the AI's frame, marked as a reading, and "Luk" lets it go;
 * nothing is saved (dogma five).
 */
export function FormStory({ riderId, own }: { riderId: string; own: boolean }) {
  const t = useTranslations("assist.formStory");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{ story: string; engine: string } | null>(null);
  const [error, setError] = useState<AiFailure | string | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function ask() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);
    const result = await askAi<{ story: string }>(
      "form-story",
      { riderId },
      { locale, signal: controller.signal },
    );
    if (controller.signal.aborted) return;
    setBusy(false);
    if (result.ok) setAnswer({ story: result.proposal.story, engine: result.engine });
    else setError(result.error);
  }

  function close() {
    abort.current?.abort();
    setBusy(false);
    setAnswer(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {!answer && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            className="text-primary -ml-2 w-fit max-sm:h-11"
            disabled={busy}
            onClick={() => void ask()}
          >
            <Sparkles data-icon="inline-start" />
            {t(own ? "askOwn" : "ask")}
          </Button>
          {busy && <Thinking>{t("thinking")}</Thinking>}
        </div>
      )}
      {error && <AiFailureText error={error} />}
      {answer && (
        <ProposalFrame title={t("title")} body={t("body")} engine={answer.engine} onClose={close}>
          {answer.story ? (
            <div className="text-reading flex flex-col gap-3 leading-relaxed">
              {answer.story.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="text-meta text-2sm">{t("empty")}</p>
          )}
          <Button type="button" variant="outline" className="w-fit max-sm:h-11" onClick={close}>
            {t("close")}
          </Button>
        </ProposalFrame>
      )}
    </div>
  );
}
