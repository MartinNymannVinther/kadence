"use client";

import { useState } from "react";
import { BarChart3, CalendarCheck, Undo2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRun } from "@/components/common/use-run";
import type { TemplateOption } from "@/components/calendar/template-picker";
import { PlanPreview } from "@/components/season/plan-preview";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { Button } from "@/components/ui/button";
import { addDaysIso } from "@/core/dates";
import { useRouter } from "@/i18n/navigation";
import type { ClassBasis } from "@/modules/dcu";
import type { RiderPlanPreview } from "@/modules/season/preview";
import { applyWeekPlanAction, previewWeekPlanAction } from "@/modules/training/week-actions";
import { GroupWeekAi } from "./group-week-ai";
import { ItemSheet } from "./item-sheet";
import { PlanDays } from "./plan-days";
import { RiderChoice } from "./rider-choice";
import { StartFrom, type PlanBlock } from "./start-from";
import { toInput, type PlanItem, type PlanRider } from "./types";
import { usePlanDraft } from "./use-plan-draft";

/** As many sessions as one press may lay in (src/modules/training/week-plan.ts). */
const MAX_ITEMS = 21;

/**
 * The team's week plan (ADR 0043): who the week is for, the week itself —
 * from nothing, from a block or a rider's week, or proposed by the AI —
 * what it does to each rider's four numbers (ADR 0040), and one press
 * that lays it into every chosen rider's calendar. The plan is kept on the
 * device until then.
 */
export function WeekPlanner({
  monday,
  riders,
  templates,
  blocks,
  backHref,
}: {
  monday: string;
  riders: PlanRider[];
  templates: TemplateOption[];
  blocks: PlanBlock[];
  backHref: string;
}) {
  const t = useTranslations("weekPlan");
  const locale = useLocale();
  const router = useRouter();
  const { run, pending } = useRun();
  const { draft, setDraft, clear } = usePlanDraft(monday, {
    riderIds: riders.map((r) => r.id),
    items: [],
  });
  const [editing, setEditing] = useState<{ day: number; item?: PlanItem } | null>(null);
  const [preview, setPreview] = useState<RiderPlanPreview[] | null>(null);
  const [undo, setUndo] = useState<PlanItem[] | null>(null);
  const { riderIds, items } = draft;
  const input = { riderIds, monday, items: items.map(toInput) };
  const dayLabel = (day: number) => {
    const date = addDaysIso(monday, day);
    return `${weekdayShort(date, locale)} ${dayMonth(date, locale)}`;
  };
  const bases = riders
    .filter((r) => riderIds.includes(r.id) && r.basis)
    .map((r) => r.basis as ClassBasis);

  const change = (next: Partial<typeof draft>) => {
    setPreview(null);
    setDraft({ ...draft, ...next });
  };
  /** A whole new week in — from a block, a rider or the AI — with the old one a press away. */
  const replace = (next: PlanItem[]) => {
    setUndo(items);
    change({ items: next });
  };

  async function look() {
    const result = await run(() => previewWeekPlanAction(input), { refresh: false });
    if (result) setPreview(result);
  }

  async function apply() {
    const done = await run(() => applyWeekPlanAction(input));
    if (done) {
      toast.success(t("applied", { count: done.sessions, riders: riderIds.length }));
      clear();
      router.push(backHref);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-7">
      <section aria-labelledby="plan-riders" className="flex flex-col gap-3">
        <h2 id="plan-riders" className="text-lg font-semibold">
          {t("riders.title")}
        </h2>
        <RiderChoice
          riders={riders}
          selected={riderIds}
          onChange={(ids) => change({ riderIds: ids })}
        />
      </section>

      <section aria-labelledby="plan-week" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="plan-week" className="text-lg font-semibold">
            {t("week.title")}
          </h2>
          <p className="text-meta text-2sm">{t("week.body")}</p>
        </div>
        <StartFrom
          monday={monday}
          blocks={blocks}
          riders={riders}
          templates={templates}
          onLoad={replace}
        />
        <GroupWeekAi monday={monday} bases={bases} templates={templates} onUse={replace} />
        {undo && (
          <p className="text-meta flex items-center gap-1 text-2sm" role="status">
            {t("week.replaced")}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="max-sm:h-11"
              onClick={() => {
                change({ items: undo });
                setUndo(null);
              }}
            >
              <Undo2 data-icon="inline-start" />
              {t("week.undo")}
            </Button>
          </p>
        )}
        <PlanDays
          monday={monday}
          items={items}
          onAdd={(day) => setEditing({ day })}
          onEdit={(item) => setEditing({ day: item.day, item })}
          onRemove={(key) => change({ items: items.filter((i) => i.key !== key) })}
          full={items.length >= MAX_ITEMS}
        />
      </section>

      <section aria-labelledby="plan-apply" className="flex flex-col gap-3">
        <h2 id="plan-apply" className="text-lg font-semibold">
          {t("apply.title")}
        </h2>
        {items.length === 0 || riderIds.length === 0 ? (
          <p className="text-meta text-2sm">{t("apply.empty")}</p>
        ) : (
          <>
            <p className="text-2sm">
              {t("apply.summary", { sessions: items.length, riders: riderIds.length })}
            </p>
            {preview ? (
              <PlanPreview previews={preview} period="week" />
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                className="self-start max-sm:h-11"
                onClick={() => void look()}
              >
                <BarChart3 data-icon="inline-start" />
                {t("apply.preview")}
              </Button>
            )}
            <Button
              type="button"
              disabled={pending}
              className="self-start max-sm:h-11"
              onClick={() => void apply()}
            >
              <CalendarCheck data-icon="inline-start" />
              {t("apply.confirm", { riders: riderIds.length })}
            </Button>
          </>
        )}
      </section>

      {editing && (
        <ItemSheet
          key={editing.item?.key ?? `new-${editing.day}`}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          day={editing.day}
          dayLabel={dayLabel(editing.day)}
          templates={templates}
          item={editing.item}
          onSave={(item) =>
            change({
              items: editing.item
                ? items.map((i) => (i.key === item.key ? item : i))
                : [...items, item],
            })
          }
        />
      )}
    </div>
  );
}
