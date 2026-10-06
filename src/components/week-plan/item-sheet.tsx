"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TemplatePicker, type TemplateOption } from "@/components/calendar/template-picker";
import {
  TimePlaceFields,
  timePlaceDraft,
  timePlaceValue,
} from "@/components/calendar/time-place-fields";
import { Button } from "@/components/ui/button";
import { SegmentedChoice } from "@/components/ui/segmented";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { problemText } from "@/components/workouts/problem-text";
import { checkDraft, newDraft } from "@/components/workouts/session-draft";
import { SessionFields } from "@/components/workouts/session-fields";
import { newKey, type PlanItem } from "./types";

/**
 * A session for one day of the week plan: from the library, or built here
 * with the same builder — "Byg med AI" included — as anywhere a session is
 * written, with a time and a place when it is ridden together (ADR 0058).
 * Nothing reaches a calendar from here; the plan is laid in as a whole.
 */
export function ItemSheet({
  open,
  onOpenChange,
  day,
  dayLabel,
  templates,
  item,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: number;
  dayLabel: string;
  templates: TemplateOption[];
  /** The item being changed, or none for a new one. */
  item?: PlanItem;
  onSave: (item: PlanItem) => void;
}) {
  const t = useTranslations("weekPlan.item");
  const add = useTranslations("calendar.add");
  const problems = useTranslations("workouts.problem");
  const common = useTranslations("common");
  const [mode, setMode] = useState<"template" | "build">(
    item?.kind === "built" || (!item && templates.length === 0) ? "build" : "template",
  );
  const [templateId, setTemplateId] = useState(item?.kind === "template" ? item.templateId : null);
  const [draft, setDraft] = useState(() =>
    newDraft(item?.kind === "built" ? item.session : undefined),
  );
  const [at, setAt] = useState(() => timePlaceDraft(item));
  const [problem, setProblem] = useState<string | null>(null);

  function save(event: React.FormEvent) {
    event.preventDefault();
    const key = item?.key ?? newKey();
    const when = timePlaceValue(at);
    if (mode === "template") {
      const template = templates.find((tpl) => tpl.id === templateId);
      if (!template) return setProblem(add("pickTemplate"));
      onSave({
        key,
        day,
        kind: "template",
        templateId: template.id,
        name: template.name,
        sport: template.sport,
        minutes: template.plannedMinutes,
        ...when,
      });
    } else {
      const checked = checkDraft(draft);
      if (!checked.ok)
        return setProblem(problemText(checked.problem, draft.structures[draft.sport], problems));
      onSave({ key, day, kind: "built", session: checked.value, ...when });
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-full overflow-y-auto sm:max-w-2xl">
        <form onSubmit={save} className="flex flex-col gap-5 p-5 pt-12 sm:p-6">
          <SheetTitle className="text-lg font-semibold">
            {item ? t("editTitle", { day: dayLabel }) : t("addTitle", { day: dayLabel })}
          </SheetTitle>
          <TimePlaceFields value={at} onChange={setAt} />
          <SegmentedChoice
            label={add("how")}
            value={mode}
            onChange={setMode}
            className="self-start [&>button]:max-sm:min-h-11"
            options={[
              { value: "template", label: add("fromLibrary") },
              { value: "build", label: add("build") },
            ]}
          />
          {mode === "template" ? (
            <TemplatePicker templates={templates} value={templateId} onChange={setTemplateId} />
          ) : (
            <SessionFields draft={draft} onChange={setDraft} assist />
          )}
          {problem && (
            <p role="alert" className="text-destructive text-sm">
              {problem}
            </p>
          )}
          <div className="bg-background sticky bottom-0 -mx-5 flex gap-2 border-t px-5 py-3 sm:-mx-6 sm:px-6">
            <Button type="submit" className="max-sm:h-11 max-sm:flex-1">
              {item ? common("save") : t("add", { day: dayLabel })}
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
