"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import type { TemplateOption } from "@/components/calendar/template-picker";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { Button } from "@/components/ui/button";
import { addDaysIso } from "@/core/dates";
import { useRouter } from "@/i18n/navigation";
import type { ClassBasis } from "@/modules/dcu";
import { ApplyPlan } from "./apply-plan";
import { ItemSheet } from "./item-sheet";
import { PlanDays } from "./plan-days";
import { RiderChoice } from "./rider-choice";
import { SaveAsBlock } from "./save-as-block";
import { StartFrom, type StartMode } from "./start-from";
import type { PlanBlock, PlanItem, PlanRider } from "./types";
import { usePlanDraft } from "./use-plan-draft";

/** As many sessions as one press may lay in (src/modules/training/week-plan.ts). */
const MAX_ITEMS = 21;

/**
 * The one place to plan a week (ADR 0043, 0059): who the week is for —
 * the team, a class, or the one rider it was opened for — the week itself,
 * started empty, from last week, from a block or from the AI, what it does
 * to each rider's four numbers (ADR 0040), and one press that lays it into
 * every chosen rider's calendar, for as many weeks in a row as asked. The
 * week can be kept as a block. The plan is kept on the device until then.
 */
export function WeekPlanner({
  monday,
  riders,
  templates,
  blocks,
  backHref,
  preselect,
  start,
}: {
  monday: string;
  riders: PlanRider[];
  templates: TemplateOption[];
  blocks: PlanBlock[];
  backHref: string;
  /** The rider whose calendar the planner was opened from. */
  preselect?: string;
  /** Where the week starts; "ai" when a rider's "Foreslå ugen" led here. */
  start?: StartMode;
}) {
  const t = useTranslations("weekPlan");
  const locale = useLocale();
  const router = useRouter();
  const { draft, setDraft, clear } = usePlanDraft(
    monday,
    { riderIds: preselect ? [preselect] : riders.map((r) => r.id), items: [] },
    preselect,
  );
  const [editing, setEditing] = useState<{ day: number; item?: PlanItem } | null>(null);
  const [undo, setUndo] = useState<PlanItem[] | null>(null);
  const { riderIds, items } = draft;
  const dayLabel = (day: number) => {
    const date = addDaysIso(monday, day);
    return `${weekdayShort(date, locale)} ${dayMonth(date, locale)}`;
  };
  const bases = riders
    .filter((r) => riderIds.includes(r.id) && r.basis)
    .map((r) => r.basis as ClassBasis);

  const change = (next: Partial<typeof draft>) => setDraft({ ...draft, ...next });
  /** A whole new week in — empty, last week, a block or the AI — with the old one a press away. */
  const replace = (next: PlanItem[]) => {
    setUndo(items);
    change({ items: next.slice(0, MAX_ITEMS) });
  };

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
          riderIds={riderIds}
          bases={bases}
          blocks={blocks}
          templates={templates}
          initial={start}
          onLoad={replace}
        />
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
        <SaveAsBlock monday={monday} items={items} />
      </section>

      <section aria-labelledby="plan-apply" className="flex flex-col gap-3">
        <h2 id="plan-apply" className="text-lg font-semibold">
          {t("apply.title")}
        </h2>
        <ApplyPlan
          monday={monday}
          riderIds={riderIds}
          items={items}
          onApplied={(sessions) => {
            toast.success(t("applied", { count: sessions, riders: riderIds.length }));
            clear();
            router.push(backHref);
          }}
        />
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
