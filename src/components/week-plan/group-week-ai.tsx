"use client";

import { useId, useRef, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AiFailureText } from "@/components/assist/ai-failure";
import { ProposalFrame } from "@/components/assist/proposal-frame";
import type { TemplateOption } from "@/components/calendar/template-picker";
import { basisText } from "@/components/season/basis-text";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { durationText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { diffDays } from "@/core/dates";
import { askAi } from "@/modules/ai/read-client";
import type { AiFailure } from "@/modules/ai/wire";
import type { WeekDraft } from "@/modules/assist/week-draft";
import { CLASS_BASES, DCU_TOTALS_2025, type ClassBasis } from "@/modules/dcu";
import { newKey, type PlanItem } from "./types";

/**
 * "Foreslå ugen med AI" for the group (ADR 0043): from DCU's hours for a
 * class-year and the team's library, with the coach's wishes for the week.
 * The class-year starts as the selected riders' lightest, the safe side
 * for a mixed group. No rider's data goes in. The proposal fills the
 * planner, where every session can be changed before anything is laid in.
 */
export function GroupWeekAi({
  monday,
  bases,
  templates,
  onUse,
}: {
  monday: string;
  /** The class-years of the riders the week is for. */
  bases: ClassBasis[];
  templates: TemplateOption[];
  onUse: (items: PlanItem[]) => void;
}) {
  const t = useTranslations("weekPlan.ai");
  const season = useTranslations("season");
  const duration = useTranslations("training.duration");
  const locale = useLocale();
  const id = useId();
  const lightest = [...bases].sort(
    (a, b) => DCU_TOTALS_2025[a].novSep - DCU_TOTALS_2025[b].novSep,
  )[0];
  const [open, setOpen] = useState(false);
  const [basis, setBasis] = useState<ClassBasis>(lightest ?? "U17-1");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ draft: WeekDraft; engine: string } | null>(null);
  const [error, setError] = useState<AiFailure | "invalid" | "unauthorized" | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function ask() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);
    setResult(null);
    const answer = await askAi<WeekDraft>(
      "group-week",
      { monday, basis, text: text.trim() },
      { locale, signal: controller.signal },
    );
    if (controller.signal.aborted) return;
    setBusy(false);
    if (answer.ok) setResult({ draft: answer.proposal, engine: answer.engine });
    else setError(answer.error === "notFound" ? "badAnswer" : answer.error);
  }

  function use(draft: WeekDraft) {
    onUse(
      draft.sessions.map((s): PlanItem => {
        const day = diffDays(monday, s.date);
        const template = s.templateId ? templates.find((tpl) => tpl.id === s.templateId) : null;
        if (template)
          return {
            key: newKey(),
            day,
            kind: "template",
            templateId: template.id,
            name: template.name,
            sport: template.sport,
            minutes: template.plannedMinutes,
          };
        return {
          key: newKey(),
          day,
          kind: "built",
          session: {
            sport: s.sport,
            title: s.title,
            description: s.why,
            structure: s.structure,
            plannedMinutes: s.minutes,
            plannedKm: null,
          },
        };
      }),
    );
    setResult(null);
    setOpen(false);
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

  return (
    <div className="border-border bg-secondary/40 flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-basis`} className="text-label text-xs font-medium">
            {t("basis")}
          </label>
          <NativeSelect
            id={`${id}-basis`}
            value={basis}
            variant="sm"
            className="w-40 max-sm:h-11"
            onChange={(e) => setBasis(e.target.value as ClassBasis)}
          >
            {CLASS_BASES.map((b) => (
              <option key={b} value={b}>
                {basisText(b, (k, v) => season(k, v))}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-wish`} className="text-sm font-medium">
          {t("wish")}
        </label>
        <Textarea
          id={`${id}-wish`}
          value={text}
          rows={2}
          maxLength={600}
          placeholder={t("wishPlaceholder")}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <p className="text-meta text-xs leading-relaxed">{t("hint")}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          className="max-sm:h-11"
          onClick={() => void ask()}
        >
          {t("ask")}
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
          }}
        >
          {t("close")}
        </Button>
      </div>
      {busy && (
        <p className="text-meta text-2sm" role="status">
          {t("thinking")}
        </p>
      )}
      {error && <AiFailureText error={error} />}
      {result && (
        <ProposalFrame
          title={t("title")}
          engine={result.engine}
          body={t("body")}
          onClose={() => setResult(null)}
        >
          {result.draft.sessions.length === 0 ? (
            <p className="text-2sm">{t("empty")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {result.draft.sessions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-2sm">
                  <SportIcon sport={s.sport} className="mt-0.5 size-3.5" />
                  <span className="flex flex-col">
                    <span className="font-medium">
                      <span className="first-letter:uppercase">
                        {weekdayShort(s.date, locale)} {dayMonth(s.date, locale)}
                      </span>
                      {" · "}
                      {s.title} · {durationText(s.minutes, duration)}
                    </span>
                    {s.why && <span className="text-meta text-xs">{s.why}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {result.draft.note && <p className="text-2sm leading-relaxed">{result.draft.note}</p>}
          {result.draft.sessions.length > 0 && (
            <Button
              type="button"
              className="self-start max-sm:h-11"
              onClick={() => use(result.draft)}
            >
              <Check data-icon="inline-start" />
              {t("use")}
            </Button>
          )}
        </ProposalFrame>
      )}
    </div>
  );
}
