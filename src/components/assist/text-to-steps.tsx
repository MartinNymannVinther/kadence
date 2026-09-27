"use client";

import { useId, useRef, useState } from "react";
import { Check, Wand2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BikeView } from "@/components/workouts/bike-view";
import { askAi } from "@/modules/ai/read-client";
import type { AiFailure } from "@/modules/ai/wire";
import type { BikeStructure } from "@/modules/workouts/structure";
import { AiFailureText } from "./ai-failure";
import { ProposalFrame } from "./proposal-frame";

type Parsed = { structure: BikeStructure; via: "rules" | "model" };

/**
 * "Skriv det som du plejer" (ADR 0017): the coach's own shorthand — "3x10
 * min Z4 / 5 min pause" — read into steps. The rules read it first,
 * offline; a model only what they cannot. The steps are shown before
 * anything changes, and "Brug" puts them in the builder, where nothing is
 * saved until the session is.
 */
export function TextToSteps({ onUse }: { onUse: (structure: BikeStructure) => void }) {
  const t = useTranslations("assist.parse");
  const locale = useLocale();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ parsed: Parsed; engine: string } | null>(null);
  const [error, setError] = useState<AiFailure | string | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function read() {
    if (!text.trim()) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);
    setResult(null);
    const answer = await askAi<Parsed>(
      "parse-workout",
      { text: text.trim() },
      {
        locale,
        signal: controller.signal,
      },
    );
    if (controller.signal.aborted) return;
    setBusy(false);
    if (answer.ok) setResult({ parsed: answer.proposal, engine: answer.engine });
    else setError(answer.error);
  }

  if (!open)
    return (
      <Button
        type="button"
        variant="outline"
        className="self-start max-sm:h-11"
        onClick={() => setOpen(true)}
      >
        <Wand2 data-icon="inline-start" />
        {t("open")}
      </Button>
    );

  return (
    <div className="border-border bg-secondary/40 flex flex-col gap-3 rounded-lg border p-3">
      {/* Not a form: the builder already sits inside the session's own. */}
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {t("label")}
        </label>
        <Textarea
          id={id}
          value={text}
          rows={2}
          maxLength={1500}
          placeholder={t("placeholder")}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="text-meta text-xs leading-relaxed">{t("hint")}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy || !text.trim()}
            className="max-sm:h-11"
            onClick={() => void read()}
          >
            {busy ? t("reading") : t("read")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="max-sm:h-11"
            onClick={() => {
              abort.current?.abort();
              setBusy(false);
              setOpen(false);
              setResult(null);
              setError(null);
            }}
          >
            {t("close")}
          </Button>
        </div>
      </div>
      {error && <AiFailureText error={error === "notFound" ? "unreadable" : error} />}
      {result && (
        <ProposalFrame
          title={t("title")}
          engine={result.parsed.via === "rules" ? "rules" : result.engine}
          body={t("body")}
          onClose={() => setResult(null)}
        >
          <BikeView structure={result.parsed.structure} rider={null} preview />
          <Button
            type="button"
            className="self-start max-sm:h-11"
            onClick={() => {
              onUse(result.parsed.structure);
              setResult(null);
              setText("");
              setOpen(false);
            }}
          >
            <Check data-icon="inline-start" />
            {t("use")}
          </Button>
        </ProposalFrame>
      )}
    </div>
  );
}
