"use client";

import { useId, useRef, useState } from "react";
import { Check, CircleAlert, Sparkles, Undo2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { BikeView } from "@/components/workouts/bike-view";
import type { SessionDraft } from "@/components/workouts/session-draft";
import { StrengthView } from "@/components/workouts/strength-view";
import { askAi } from "@/modules/ai/read-client";
import type { AiFailure } from "@/modules/ai/wire";
import type { BuiltWorkout } from "@/modules/assist/build-workout-answer";
import { AiFailureText } from "./ai-failure";
import { ProposalFrame } from "./proposal-frame";
import { Thinking } from "./thinking";

const CATEGORIES = ["U17", "U19", "U23"] as const;
type Category = (typeof CATEGORIES)[number];
const EXAMPLES = [1, 2, 3] as const;

/**
 * "Byg med AI" (ADR 0038): the coach describes a bike or strength session
 * in their own words — or what to change in the one already built — and
 * gets a proposal to look at first. "Brug forslaget" puts it in the
 * builder, where every number can still be changed, and "Fortryd" puts
 * back what was there. Nothing is saved until the session is (dogma 5).
 * A coach's tool: the route refuses anyone else.
 */
export function BuildWithAi({
  draft,
  onChange,
  defaultOpen = false,
}: {
  draft: SessionDraft;
  onChange: (draft: SessionDraft) => void;
  defaultOpen?: boolean;
}) {
  const t = useTranslations("assist.build");
  const locale = useLocale();
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [refine, setRefine] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ built: BuiltWorkout; engine: string } | null>(null);
  const [error, setError] = useState<AiFailure | "invalid" | "unauthorized" | null>(null);
  const [undo, setUndo] = useState<SessionDraft | null>(null);
  const abort = useRef<AbortController | null>(null);

  const sport = draft.sport;
  if (sport === "other") return null;
  const structure = draft.structures[sport];
  const built =
    (structure.kind === "bike" && structure.steps.length > 0) ||
    (structure.kind === "strength" && structure.exercises.length > 0);
  const changing = built && refine;

  function stop() {
    abort.current?.abort();
    setBusy(false);
  }

  async function ask() {
    if (!text.trim() || sport === "other") return;
    stop();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);
    setResult(null);
    const answer = await askAi<BuiltWorkout>(
      "build-workout",
      {
        sport,
        text: text.trim(),
        category: category || null,
        ...(changing ? { current: structure } : {}),
      },
      { locale, signal: controller.signal },
    );
    if (controller.signal.aborted) return;
    setBusy(false);
    if (answer.ok) setResult({ built: answer.proposal, engine: answer.engine });
    // A proposal that did not survive the sanitizers is the model's fault, not a missing row.
    else setError(answer.error === "notFound" ? "badAnswer" : answer.error);
  }

  function use(proposal: BuiltWorkout) {
    if (sport === "other") return;
    setUndo(draft);
    onChange({
      ...draft,
      // The coach's own words win: a name or a word already written stays.
      title: draft.title.trim() ? draft.title : proposal.title,
      description: draft.description.trim() ? draft.description : proposal.description,
      structures: { ...draft.structures, [sport]: proposal.structure },
    });
    setResult(null);
    setText("");
    setOpen(false);
  }

  if (!open)
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="max-sm:h-11"
          onClick={() => {
            setUndo(null);
            setOpen(true);
          }}
        >
          <Sparkles data-icon="inline-start" />
          {t("open")}
        </Button>
        {undo && (
          <p className="text-meta flex items-center gap-1 text-2sm" role="status">
            {t("used")}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="max-sm:h-11"
              onClick={() => {
                onChange(undo);
                setUndo(null);
              }}
            >
              <Undo2 data-icon="inline-start" />
              {t("undo")}
            </Button>
          </p>
        )}
      </div>
    );

  return (
    <div className="border-border bg-secondary/40 flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      {/* Not a form: the builder already sits inside the session's own. */}
      <div className="flex min-w-0 flex-col gap-2">
        <label htmlFor={`${id}-text`} className="text-sm font-medium">
          {t("label")}
        </label>
        <Textarea
          id={`${id}-text`}
          value={text}
          rows={3}
          maxLength={1500}
          placeholder={t(`placeholder.${changing ? "refine" : sport}`)}
          onChange={(e) => setText(e.target.value)}
        />
        {!changing && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-meta text-xs">{t("examples")}</span>
            {EXAMPLES.map((n) => {
              const example = t(`example.${sport}${n}`);
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
          {built && (
            <label className="flex min-h-9 items-center gap-2 text-2sm max-sm:min-h-11">
              <input
                type="checkbox"
                className="accent-primary size-4"
                checked={refine}
                onChange={(e) => setRefine(e.target.checked)}
              />
              {t("refine")}
            </label>
          )}
        </div>
        <p className="text-meta text-xs leading-relaxed">
          {t("hint")} {sport === "bike" && !changing ? t("ruleHint") : null}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy || !text.trim()}
            className="max-sm:h-11"
            onClick={() => void ask()}
          >
            {t("build")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="max-sm:h-11"
            onClick={() => {
              stop();
              setOpen(false);
              setResult(null);
              setError(null);
            }}
          >
            {t("close")}
          </Button>
        </div>
        {busy && <Thinking>{t("building")}</Thinking>}
      </div>
      {error && <AiFailureText error={error} />}
      {result && (
        <ProposalFrame
          title={t("title")}
          engine={result.built.via === "rules" ? "rules" : result.engine}
          body={t("body")}
          onClose={() => setResult(null)}
        >
          {result.built.title && <p className="text-sm font-semibold">{result.built.title}</p>}
          {result.built.description && (
            <p className="text-2sm leading-relaxed whitespace-pre-line">
              {result.built.description}
            </p>
          )}
          {result.built.structure.kind === "bike" ? (
            <BikeView structure={result.built.structure} rider={null} preview />
          ) : (
            <StrengthView structure={result.built.structure} programmeSession={null} />
          )}
          {result.built.notes.map((note) => (
            <p
              key={note.kind}
              className="bg-sticky text-sticky-ink flex gap-2 rounded-md px-3 py-2 text-2sm leading-relaxed"
            >
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {t("longestRide", { category: note.category, hours: note.hours })}
            </p>
          ))}
          <Button
            type="button"
            className="self-start max-sm:h-11"
            onClick={() => use(result.built)}
          >
            <Check data-icon="inline-start" />
            {t("use")}
          </Button>
        </ProposalFrame>
      )}
    </div>
  );
}
