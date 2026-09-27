"use client";

import { useRef, useState } from "react";
import { CalendarCheck, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { durationText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";
import { ProfileChart } from "@/components/workouts/profile-chart";
import { askAi } from "@/modules/ai/read-client";
import type { AiFailure } from "@/modules/ai/wire";
import { acceptDraftSessionsAction } from "@/modules/assist/actions";
import type { Structure } from "@/modules/workouts/structure";
import { AiFailureText } from "./ai-failure";
import { ProposalFrame } from "./proposal-frame";

type DraftSession = {
  date: string;
  sport: "bike" | "strength" | "other";
  title: string;
  minutes: number;
  templateId: string | null;
  structure: Structure;
  why: string;
};
type WeekDraft = { sessions: DraftSession[]; note: string };

/**
 * "Foreslå ugen" (ADR 0017): the model's draft of a rider's week from
 * DCU's hours and phase, the calendar, the last weeks and the guardrails.
 * Each proposed session has a box, all ticked to begin with; the coach
 * takes the ones they want and "Læg valgte i kalenderen" writes them —
 * the coach's press, marked as the AI's origin. Nothing is written before.
 */
export function WeekDraftDialog({ riderId, monday }: { riderId: string; monday: string }) {
  const t = useTranslations("assist.week");
  const duration = useTranslations("training.duration");
  const locale = useLocale();
  const { run, pending } = useRun();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ week: WeekDraft; engine: string } | null>(null);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [error, setError] = useState<AiFailure | string | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function propose() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);
    setDraft(null);
    const answer = await askAi<WeekDraft>(
      "week-draft",
      { riderId, monday },
      {
        locale,
        signal: controller.signal,
      },
    );
    if (controller.signal.aborted) return;
    setBusy(false);
    if (answer.ok) {
      setDraft({ week: answer.proposal, engine: answer.engine });
      setChosen(new Set(answer.proposal.sessions.map((_, i) => i)));
    } else setError(answer.error);
  }

  async function accept() {
    if (!draft) return;
    const sessions = draft.week.sessions
      .filter((_, i) => chosen.has(i))
      .map((s) => ({
        riderId,
        onDate: s.date,
        sport: s.sport,
        title: s.title,
        description: s.why,
        structure: s.structure,
        plannedMinutes: s.minutes,
        plannedKm: null,
        templateId: s.templateId,
      }));
    if (sessions.length === 0) return;
    const done = await run(() => acceptDraftSessionsAction({ sessions }), {
      success: t("added", { count: sessions.length }),
    });
    if (done !== null) setOpen(false);
  }

  return (
    <>
      <Button
        variant="outline"
        className="max-sm:h-11"
        onClick={() => {
          setOpen(true);
          void propose();
        }}
      >
        <Sparkles data-icon="inline-start" />
        {t("open")}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) abort.current?.abort();
          setOpen(next);
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("body")}</DialogDescription>
          </DialogHeader>
          {busy && (
            <p className="text-meta text-2sm" aria-live="polite">
              {t("thinking")}
            </p>
          )}
          {error && <AiFailureText error={error} />}
          {draft && draft.week.sessions.length === 0 && (
            <p className="text-2sm">{draft.week.note || t("empty")}</p>
          )}
          {draft && draft.week.sessions.length > 0 && (
            <ProposalFrame title={t("proposal")} engine={draft.engine}>
              {draft.week.note && <p className="text-2sm leading-relaxed">{draft.week.note}</p>}
              <ul className="flex flex-col gap-2">
                {draft.week.sessions.map((s, i) => (
                  <li key={`${s.date}-${i}`}>
                    <label className="border-border bg-card has-checked:border-primary has-focus-visible:outline-ring flex cursor-pointer gap-3 rounded-lg border p-3 has-focus-visible:outline-2">
                      <input
                        type="checkbox"
                        checked={chosen.has(i)}
                        className="accent-primary mt-0.5 size-5 shrink-0"
                        onChange={(e) =>
                          setChosen((current) => {
                            const next = new Set(current);
                            if (e.target.checked) next.add(i);
                            else next.delete(i);
                            return next;
                          })
                        }
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-meta text-xs first-letter:uppercase">
                          {weekdayShort(s.date, locale)} {dayMonth(s.date, locale)}
                        </span>
                        <span className="flex items-center gap-1.5 text-2sm font-semibold">
                          <SportIcon sport={s.sport} className="size-3.5" />
                          <span className="min-w-0">{s.title}</span>
                          <span className="text-meta font-normal">
                            · {durationText(s.minutes, duration)}
                          </span>
                        </span>
                        {s.structure.kind === "bike" && s.structure.steps.length > 0 && (
                          <ProfileChart structure={s.structure} className="h-10" />
                        )}
                        {s.why && (
                          <span className="text-meta text-xs leading-relaxed">{s.why}</span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={pending || chosen.size === 0}
                  className="max-sm:h-11"
                  onClick={() => void accept()}
                >
                  <CalendarCheck data-icon="inline-start" />
                  {t("accept", { count: chosen.size })}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="max-sm:h-11"
                  disabled={busy}
                  onClick={() => void propose()}
                >
                  {t("again")}
                </Button>
              </div>
            </ProposalFrame>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
