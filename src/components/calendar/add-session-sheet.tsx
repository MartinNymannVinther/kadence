"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedChoice } from "@/components/ui/segmented";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { problemText } from "@/components/workouts/problem-text";
import { checkDraft, newDraft } from "@/components/workouts/session-draft";
import { SessionFields } from "@/components/workouts/session-fields";
import { createSessionsAction, scheduleTemplateAction } from "@/modules/training/actions";
import type { Repeat } from "@/modules/training/recurrence";
import { structureMinutes } from "@/modules/workouts/structure";
import { RepeatFields } from "./repeat-fields";
import { RiderPicker } from "./rider-picker";
import { TemplatePicker, type TemplateOption } from "./template-picker";
import { TimePlaceFields, timePlaceDraft, timePlaceValue } from "./time-place-fields";
import type { RiderOption } from "./types";

/**
 * "Tilføj pas": for whom, which day, and what — a template from the
 * library, or a session built here with the same builder the library
 * uses. Several riders make a group plan. A rider (not a coach) plans
 * from the library for themselves; building is the coach's. "Gentag" puts
 * it on chosen weekdays until a last day (ADR 0041). A time and a place
 * are there for a session ridden together (ADR 0058). Opened from a race,
 * it starts with the race prep built and ready to change (docs/adr/0106).
 */
export function AddSessionSheet({
  open,
  onOpenChange,
  riders,
  defaultRiderIds,
  defaultDate,
  templates,
  canBuild,
  prefill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  riders: RiderOption[];
  defaultRiderIds: string[];
  defaultDate: string;
  templates: TemplateOption[];
  canBuild: boolean;
  /** A session to start the builder from, as the race prep the day before a race. */
  prefill?: { sport: string; title: string; description: string; structure: unknown };
}) {
  const t = useTranslations("calendar.add");
  const problems = useTranslations("workouts.problem");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const dateId = useId();
  const [riderIds, setRiderIds] = useState(defaultRiderIds);
  const [onDate, setOnDate] = useState(defaultDate);
  const [mode, setMode] = useState<"template" | "build">(
    canBuild && (prefill || templates.length === 0) ? "build" : "template",
  );
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => newDraft(prefill));
  const [problem, setProblem] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<Repeat | null>(null);
  const [at, setAt] = useState(() => timePlaceDraft());
  const chosen = templates.find((tpl) => tpl.id === templateId) ?? null;
  const sport = mode === "template" ? (chosen?.sport ?? null) : draft.sport;
  const minutes =
    mode === "template"
      ? (chosen?.plannedMinutes ?? 0)
      : structureMinutes(draft.structures[draft.sport]);
  const added = (ids: string[]) =>
    repeat ? t("addedSeries", { count: ids.length }) : t("added", { count: riderIds.length });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (riderIds.length === 0) return setProblem(t("pickRider"));
    if (mode === "template") {
      if (!templateId) return setProblem(t("pickTemplate"));
      setProblem(null);
      const done = await run(() =>
        scheduleTemplateAction({
          templateId,
          riderIds,
          onDate,
          repeat: repeat ?? undefined,
          ...timePlaceValue(at),
        }),
      );
      if (done) {
        toast.success(added(done.ids));
        onOpenChange(false);
      }
      return;
    }
    const checked = checkDraft(draft);
    if (!checked.ok) {
      return setProblem(problemText(checked.problem, draft.structures[draft.sport], problems));
    }
    setProblem(null);
    const done = await run(() =>
      createSessionsAction({
        riderIds,
        onDate,
        templateId: null,
        ...checked.value,
        ...timePlaceValue(at),
        repeat: repeat ?? undefined,
      }),
    );
    if (done) {
      toast.success(added(done.ids));
      onOpenChange(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-full overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} className="flex flex-col gap-5 p-5 pt-12 sm:p-6">
          <div className="flex flex-col gap-1">
            <SheetTitle className="text-lg font-semibold">{t("title")}</SheetTitle>
            <p className="text-meta text-2sm">{t("body")}</p>
          </div>

          {riders.length > 1 ? (
            <RiderPicker riders={riders} selected={riderIds} onChange={setRiderIds} />
          ) : (
            <p className="text-2sm">{t("forRider", { name: riders[0]?.name ?? "" })}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor={dateId} className="text-sm font-medium">
              {t("date")}
            </label>
            <Input
              id={dateId}
              type="date"
              required
              value={onDate}
              className="max-sm:h-11"
              onChange={(e) => setOnDate(e.target.value)}
            />
          </div>

          <TimePlaceFields value={at} onChange={setAt} />

          {canBuild && (
            <SegmentedChoice
              label={t("how")}
              value={mode}
              onChange={setMode}
              className="self-start [&>button]:max-sm:min-h-11"
              options={[
                { value: "template", label: t("fromLibrary") },
                { value: "build", label: t("build") },
              ]}
            />
          )}

          {mode === "template" ? (
            <TemplatePicker templates={templates} value={templateId} onChange={setTemplateId} />
          ) : (
            <SessionFields draft={draft} onChange={setDraft} showKm assist={canBuild} />
          )}

          <RepeatFields
            start={onDate}
            sport={sport}
            plannedMinutes={minutes}
            riderIds={riderIds}
            riders={riders}
            value={repeat}
            onChange={setRepeat}
          />

          {problem && (
            <p role="alert" className="text-destructive text-sm">
              {problem}
            </p>
          )}

          <div className="bg-background sticky bottom-0 -mx-5 flex gap-2 border-t px-5 py-3 sm:-mx-6 sm:px-6">
            <Button type="submit" disabled={pending} className="max-sm:h-11 max-sm:flex-1">
              {t("submit")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="max-sm:h-11"
              onClick={() => onOpenChange(false)}
            >
              {common("cancel")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
