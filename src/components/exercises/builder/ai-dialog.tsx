"use client";

import { useEffect, useId, useRef, useState } from "react";
import { RotateCcw, Send, Sparkles, Undo2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AiFailureText } from "@/components/assist/ai-failure";
import { EngineLine } from "@/components/assist/engine-line";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { askAi } from "@/modules/ai/read-client";
import type { AiFailure } from "@/modules/ai/wire";
import type { ProgramProposal, Turn } from "@/modules/exercises/ai/answer";
import type { ProgramDraft } from "@/modules/exercises/program-draft";
import { AiTranscript, type Spoken } from "./ai-transcript";

const CATEGORIES = ["U17", "U19", "U23"] as const;
type Category = (typeof CATEGORIES)[number];
const EXAMPLES = [1, 2, 3] as const;

/**
 * "Byg med AI" for a programme (ADR 0071): a conversation beside the
 * builder. The coach says what the programme should do, or what to change
 * in the one that stands, and every answer that carries a programme is
 * laid straight into the builder — where every exercise and dose can
 * still be changed by hand — with "Fortryd" to put back what stood
 * before. Nothing is saved until the coach presses Gem (dogma 5). A
 * coach's tool: the route refuses anyone else.
 */
export function AiDialog({
  draft,
  onApply,
}: {
  draft: ProgramDraft;
  onApply: (next: ProgramDraft) => void;
}) {
  const t = useTranslations("exercises.builder.ai");
  const locale = useLocale();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [busy, setBusy] = useState(false);
  const [spoken, setSpoken] = useState<Spoken[]>([]);
  const [error, setError] = useState<AiFailure | "invalid" | "unauthorized" | null>(null);
  const [before, setBefore] = useState<ProgramDraft[]>([]);
  const [engine, setEngine] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  function stop() {
    abort.current?.abort();
    setBusy(false);
  }

  async function send() {
    const said = text.trim();
    if (!said || busy) return;
    const controller = new AbortController();
    abort.current = controller;
    const turns: Turn[] = spoken.flatMap((s) =>
      s.role === "note" ? [] : [{ role: s.role, text: s.text }],
    );
    setSpoken((s) => [...s, { role: "coach", text: said }]);
    setText("");
    setBusy(true);
    setError(null);
    const answer = await askAi<ProgramProposal>(
      "build-program",
      { text: said, draft, turns, category: category || null },
      { locale, signal: controller.signal },
    );
    if (controller.signal.aborted) return;
    setBusy(false);
    if (!answer.ok) {
      // A proposal that did not survive the reading is the model's fault, not a missing row.
      setError(answer.error === "notFound" ? "badAnswer" : answer.error);
      return;
    }
    const { proposal } = answer;
    setEngine(answer.engine);
    if (proposal.program) {
      setBefore((b) => [...b, draft]);
      onApply({
        name: proposal.program.name ?? draft.name,
        description: proposal.program.description ?? draft.description,
        parts: proposal.program.parts,
      });
    }
    setSpoken((s) => [
      ...s,
      { role: "ai", text: proposal.reply || t("updated"), applied: proposal.program !== null },
    ]);
    input.current?.focus();
  }

  function undo() {
    const previous = before.at(-1);
    if (!previous) return;
    setBefore((b) => b.slice(0, -1));
    onApply(previous);
    setSpoken((s) => [...s, { role: "note", text: t("undone") }]);
  }

  if (!open)
    return (
      <Button
        type="button"
        variant="outline"
        className="self-start max-sm:h-11"
        onClick={() => setOpen(true)}
      >
        <Sparkles data-icon="inline-start" />
        {t("open")}
      </Button>
    );

  const first = spoken.length === 0;
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="border-border bg-secondary/40 flex min-w-0 flex-col gap-3 rounded-lg border p-3"
    >
      <div className="flex flex-col gap-0.5">
        <h3 id={`${id}-title`} className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles aria-hidden className="text-primary size-4" />
          {t("title")}
        </h3>
        <p className="text-meta text-xs leading-relaxed">{t("intro")}</p>
      </div>
      {!first && <AiTranscript spoken={spoken} busy={busy} />}
      {busy && first && (
        <p className="text-meta text-2sm" role="status">
          {t("sending")}
        </p>
      )}
      {error && <AiFailureText error={error} />}
      {/* Not a form: the builder already sits inside the programme's own. */}
      <div className="flex min-w-0 flex-col gap-2">
        <label htmlFor={`${id}-text`} className="text-label text-xs font-medium">
          {t("label")}
        </label>
        <Textarea
          ref={input}
          id={`${id}-text`}
          value={text}
          rows={2}
          maxLength={1500}
          placeholder={t(first ? "placeholderFirst" : "placeholderNext")}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
        />
        {first && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-meta text-xs">{t("examples")}</span>
            {EXAMPLES.map((n) => {
              const example = t(`example${n}`);
              return (
                <button
                  key={n}
                  type="button"
                  className="focus-ring border-border bg-card hover:bg-accent rounded-full border px-2.5 py-1 text-xs max-sm:min-h-9"
                  onClick={() => setText(example)}
                >
                  {example}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-class`} className="text-label text-xs font-medium">
              {t("category")}
            </label>
            <NativeSelect
              id={`${id}-class`}
              value={category}
              variant="sm"
              className="w-40 max-sm:h-11"
              onChange={(e) => setCategory(e.target.value as Category | "")}
            >
              <option value="">{t("categoryNone")}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <p className="text-meta text-xs leading-relaxed">{t("hint")}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy || !text.trim()}
            className="max-sm:h-11"
            onClick={() => void send()}
          >
            <Send data-icon="inline-start" />
            {t("send")}
          </Button>
          {before.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              className="max-sm:h-11"
              onClick={undo}
            >
              <Undo2 data-icon="inline-start" />
              {t("undo")}
            </Button>
          )}
          {!first && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="max-sm:h-11"
              onClick={() => {
                stop();
                setSpoken([]);
                setError(null);
              }}
            >
              <RotateCcw data-icon="inline-start" />
              {t("restart")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="max-sm:h-11"
            onClick={() => {
              stop();
              setOpen(false);
            }}
          >
            {t("close")}
          </Button>
        </div>
        {engine && <EngineLine engine={engine} />}
      </div>
    </section>
  );
}
