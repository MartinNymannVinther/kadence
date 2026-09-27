"use client";

import { useId, useState } from "react";
import { Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveSeasonMonthsAction } from "@/modules/season/actions";
import { MonthEditor } from "./month-editor";
import { MonthRow, ownNote } from "./month-row";
import type { RiddenData, SeasonPlanData } from "./types";

/**
 * The season plan's twelve months, October first, read or — for the coach
 * and the rider — changed in place. DCU's hours and the deviation stand
 * beside every month in both modes; the plan's note sits under them.
 */
export function SeasonPlan({
  plan,
  ridden,
  canWrite,
}: {
  plan: SeasonPlanData;
  ridden: RiddenData;
  canWrite: boolean;
}) {
  const t = useTranslations("season");
  const locale = useLocale();
  const { run, pending } = useRun();
  const noteId = useId();
  const [editing, setEditing] = useState(false);
  const [months, setMonths] = useState(plan.months);
  const [note, setNote] = useState(plan.note);
  const total = (list: number[]) =>
    num(
      list.reduce((sum, h) => sum + h, 0),
      locale,
      0,
    );

  function start() {
    setMonths(plan.months.map((m) => ({ ...m, note: ownNote(m) })));
    setNote(plan.note);
    setEditing(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const done = await run(
      () =>
        saveSeasonMonthsAction({
          planId: plan.id,
          months: months.map((m) => ({ ...m, note: m.note.trim() })),
          note: note.trim(),
        }),
      { success: t("saved") },
    );
    if (done !== null) setEditing(false);
  }

  const shown = editing ? months : plan.months;
  const riddenOf = (month: number) => ridden.find((r) => r.month === month)?.hours ?? null;

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-2sm">
          {t("totals", {
            plan: total(shown.map((m) => m.hours)),
            dcu: total(plan.dcu),
            ridden: total(ridden.map((r) => r.hours)),
          })}
        </p>
        {canWrite && !editing && (
          <Button type="button" variant="outline" className="max-sm:h-11" onClick={start}>
            <Pencil data-icon="inline-start" />
            {t("edit")}
          </Button>
        )}
      </div>
      <ol className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-[var(--surface-shadow)]">
        {shown.map((month, i) =>
          editing ? (
            <MonthEditor
              key={month.month}
              month={month}
              dcu={plan.dcu[i] ?? 0}
              onChange={(next) => setMonths((all) => all.map((m, j) => (j === i ? next : m)))}
            />
          ) : (
            <MonthRow
              key={month.month}
              month={month}
              dcu={plan.dcu[i] ?? 0}
              ridden={riddenOf(month.month)}
            />
          ),
        )}
      </ol>
      {editing ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={noteId} className="text-sm font-medium">
              {t("planNote")}
            </label>
            <Textarea
              id={noteId}
              value={note}
              maxLength={2000}
              rows={3}
              placeholder={t("planNotePlaceholder")}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="bg-background/95 sticky bottom-0 flex flex-wrap gap-2 py-2 backdrop-blur">
            <Button type="submit" disabled={pending} className="max-sm:h-11 max-sm:flex-1">
              {t("save")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="max-sm:h-11"
              onClick={() => setEditing(false)}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        plan.note && (
          <div className="border-border bg-card rounded-xl border p-4">
            <p className="text-meta text-xs font-medium">{t("planNote")}</p>
            <p className="text-2sm mt-1 leading-relaxed whitespace-pre-line">{plan.note}</p>
          </div>
        )
      )}
    </form>
  );
}
