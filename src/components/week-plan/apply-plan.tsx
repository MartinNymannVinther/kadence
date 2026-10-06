"use client";

import { useId, useState } from "react";
import { BarChart3, CalendarCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { PlanPreview } from "@/components/season/plan-preview";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { RiderPlanPreview } from "@/modules/season/preview";
import { applyWeekPlanAction, previewWeekPlanAction } from "@/modules/training/week-actions";
import { toInput, type PlanItem } from "./types";

/** As many weeks in a row as one press lays in (MAX_PLAN_WEEKS in src/modules/training/week-plan.ts). */
const MAX_PLAN_WEEKS = 12;

/**
 * "Læg ugen ind" (ADR 0043, 0058): how many weeks in a row the week goes
 * into — "Gentag i N uger" — what it does to each rider's weeks in the
 * four numbers (ADR 0040), and one press. The preview belongs to the plan
 * it was made for; change the plan and it is asked for again.
 */
export function ApplyPlan({
  monday,
  riderIds,
  items,
  onApplied,
}: {
  monday: string;
  riderIds: string[];
  items: PlanItem[];
  onApplied: (sessions: number) => void;
}) {
  const t = useTranslations("weekPlan.apply");
  const { run, pending } = useRun();
  const repeatId = useId();
  const [weeks, setWeeks] = useState(1);
  const [preview, setPreview] = useState<{ of: string; riders: RiderPlanPreview[] } | null>(null);
  const input = { riderIds, monday, items: items.map(toInput), weeks };
  const of = JSON.stringify(input);

  if (items.length === 0 || riderIds.length === 0)
    return <p className="text-meta text-2sm">{t("empty")}</p>;

  async function look() {
    const result = await run(() => previewWeekPlanAction(input), { refresh: false });
    if (result) setPreview({ of, riders: result });
  }

  async function apply() {
    const done = await run(() => applyWeekPlanAction(input));
    if (done) onApplied(done.sessions);
  }

  const counts = { sessions: items.length, riders: riderIds.length, weeks };
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={repeatId} className="text-label text-xs font-medium">
          {t("repeat")}
        </label>
        <NativeSelect
          id={repeatId}
          value={weeks}
          variant="sm"
          className="w-48 max-sm:h-11"
          onChange={(e) => setWeeks(Number(e.target.value))}
        >
          {Array.from({ length: MAX_PLAN_WEEKS }, (_, i) => (
            <option key={i} value={i + 1}>
              {t("weeksOption", { weeks: i + 1 })}
            </option>
          ))}
        </NativeSelect>
      </div>
      <p className="text-2sm">{weeks === 1 ? t("summary", counts) : t("summaryWeeks", counts)}</p>
      {preview?.of === of ? (
        <PlanPreview previews={preview.riders} period="week" />
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          className="self-start max-sm:h-11"
          onClick={() => void look()}
        >
          <BarChart3 data-icon="inline-start" />
          {t("preview")}
        </Button>
      )}
      <Button
        type="button"
        disabled={pending}
        className="self-start max-sm:h-11"
        onClick={() => void apply()}
      >
        <CalendarCheck data-icon="inline-start" />
        {weeks === 1 ? t("confirm", counts) : t("confirmWeeks", counts)}
      </Button>
    </div>
  );
}
