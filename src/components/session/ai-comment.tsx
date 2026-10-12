"use client";

import { useRef, useState } from "react";
import { MessageSquarePlus, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AiFailureText } from "@/components/assist/ai-failure";
import { ProposalFrame } from "@/components/assist/proposal-frame";
import { Thinking } from "@/components/assist/thinking";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { askAi } from "@/modules/ai/read-client";
import { AI_COMMENT_PREFIX, type AiFailure } from "@/modules/ai/wire";
import { addCommentAction } from "@/modules/training/actions";

/**
 * "Få en kommentar fra AI'en" (docs/adr/0095): a quiet button in a
 * session's panel that asks the model for two or three warm sentences on
 * how the session went. The answer is a proposal in the AI's frame; only
 * "Gem som kommentar" writes it — as an ordinary comment in the person's
 * own name, starting "(AI) " — and "Luk" lets it go (dogma five).
 */
export function AiComment({ sessionId }: { sessionId: string }) {
  const t = useTranslations("assist.sessionComment");
  const locale = useLocale();
  const { run, pending } = useRun();
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{ comment: string; engine: string } | null>(null);
  const [error, setError] = useState<AiFailure | string | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function ask() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);
    const result = await askAi<{ comment: string }>(
      "session-comment",
      { sessionId },
      { locale, signal: controller.signal },
    );
    if (controller.signal.aborted) return;
    setBusy(false);
    if (result.ok) setAnswer({ comment: result.proposal.comment, engine: result.engine });
    else setError(result.error);
  }

  async function save() {
    if (!answer?.comment) return;
    const saved = await run(
      () =>
        addCommentAction({
          target: { plannedSessionId: sessionId },
          body: `${AI_COMMENT_PREFIX}${answer.comment}`,
        }),
      { success: t("saved") },
    );
    if (saved) setAnswer(null);
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
            {t("ask")}
          </Button>
          {busy && <Thinking>{t("thinking")}</Thinking>}
        </div>
      )}
      {error && <AiFailureText error={error} />}
      {answer && (
        <ProposalFrame title={t("title")} body={t("body")} engine={answer.engine} onClose={close}>
          {answer.comment ? (
            <p className="text-reading leading-relaxed">{answer.comment}</p>
          ) : (
            <p className="text-meta text-2sm">{t("empty")}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {answer.comment && (
              <Button
                type="button"
                className="max-sm:h-11"
                disabled={pending}
                onClick={() => void save()}
              >
                <MessageSquarePlus data-icon="inline-start" />
                {t("save")}
              </Button>
            )}
            <Button type="button" variant="outline" className="max-sm:h-11" onClick={close}>
              {t("close")}
            </Button>
          </div>
        </ProposalFrame>
      )}
    </div>
  );
}
