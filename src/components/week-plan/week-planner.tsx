"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import type { TemplateOption } from "@/components/calendar/template-picker";
import { dayMonth, weekdayLong, weekdayShort } from "@/components/training/day-label";
import { Button } from "@/components/ui/button";
import { addDaysIso } from "@/core/dates";
import { useRouter } from "@/i18n/navigation";
import { isPlanBasis, isSeniorBasis } from "@/modules/paradigms";
import type { SharedDraft } from "@/modules/training/week-plan-draft";
import { ApplyPlan } from "./apply-plan";
import { appliedWords, type PlanAudience } from "./audience";
import { DraftStatus } from "./draft-status";
import { ItemSheet } from "./item-sheet";
import { moveItem, type Move } from "./move";
import { PlanDays } from "./plan-days";
import { RiderChoice } from "./rider-choice";
import { SaveAsBlock } from "./save-as-block";
import { StartFrom, type StartMode } from "./start-from";
import { itemTitle, type PlanBlock, type PlanItem, type PlanRider } from "./types";
import { useSharedDraft } from "./use-shared-draft";

/** As many sessions as one press may lay in (src/modules/training/week-plan.ts). */
const MAX_ITEMS = 21;

/**
 * The last change that can be taken back with "Fortryd", while no other
 * coach's draft has replaced the week since: a whole week put in by
 * "Start fra", or one session moved to another day.
 */
type Undo = { replaced: number } & (
  { kind: "week"; items: PlanItem[] } | { kind: "move"; move: Move }
);

/**
 * The one place to plan a week (ADR 0043, 0059): who the week is for —
 * the team, a class, or the one rider it was opened for — the week itself,
 * started empty, from last week, from a block or from the AI, what it does
 * to each rider's four numbers (ADR 0040), and one press that lays it into
 * every chosen rider's calendar, for as many weeks in a row as asked. A
 * session moves between days by dragging or "Flyt til" (ADR 0059, amended
 * 2026-10-12). The week can be kept as a block. In a personal workspace
 * the week is the person's own, or their child's: there is no one to
 * choose, and the words say "din kalender" (ADR 0080). Until it is laid
 * in, the plan is a draft the team's coaches share, kept on the server
 * and on this device (ADR 0043, amended 2026-10-07).
 */
export function WeekPlanner({
  monday,
  today,
  scope,
  shared,
  riders,
  templates,
  blocks,
  backHref,
  preselect,
  start,
  audience,
}: {
  monday: string;
  today: string;
  /** "team", or the rider the planner was opened for: whose draft this is. */
  scope: string;
  /** The shared draft as the server had it when the page was made. */
  shared: SharedDraft | null;
  riders: PlanRider[];
  templates: TemplateOption[];
  blocks: PlanBlock[];
  backHref: string;
  /** The rider whose calendar the planner was opened from. */
  preselect?: string;
  /** Where the week starts; "ai" when a rider's "Foreslå ugen" led here. */
  start?: StartMode;
  /** A team's riders, or the one person whose own week this is (audience.ts). */
  audience: PlanAudience;
}) {
  const t = useTranslations("weekPlan");
  const locale = useLocale();
  const router = useRouter();
  const [editing, setEditing] = useState<{ day: number; item?: PlanItem } | null>(null);
  const [undo, setUndo] = useState<Undo | null>(null);
  const { draft, state, setDraft, clear } = useSharedDraft({
    monday,
    scope,
    initial: { riderIds: preselect ? [preselect] : riders.map((r) => r.id), items: [] },
    first: shared,
    templates,
    hold: editing !== null,
  });
  const { items } = draft;
  // In a personal workspace the week is the one rider's, whatever an older draft held.
  const choose = audience.kind === "team";
  const riderIds = choose ? draft.riderIds : riders.map((r) => r.id);
  const dayLabel = (day: number) => {
    const date = addDaysIso(monday, day);
    return `${weekdayShort(date, locale)} ${dayMonth(date, locale)}`;
  };
  // The group's AI draft reads DCU's class-years and a senior's profile (ADR 0092).
  const bases = riders
    .filter((r) => riderIds.includes(r.id))
    .flatMap((r) => (isPlanBasis(r.basis) ? [r.basis] : []));
  // The profiles are offered to the AI only where the team has an adult.
  const seniors = riders.some((r) => isSeniorBasis(r.basis));

  const change = (next: Partial<typeof draft>) => setDraft({ ...draft, ...next });
  /** A whole new week in — empty, last week, a block or the AI — with the old one a press away. */
  const replace = (next: PlanItem[]) => {
    setUndo({ kind: "week", items, replaced: state.replaced });
    change({ items: next.slice(0, MAX_ITEMS) });
  };
  /** One session to another day, dragged or by "Flyt til"; told, and a press away from back. */
  const move = (key: string, day: number) => {
    const item = items.find((i) => i.key === key);
    const next = moveItem(items, key, day);
    if (!item || next === items) return;
    change({ items: next });
    const moved = { key, title: itemTitle(item), from: item.day, to: day };
    setUndo({ kind: "move", move: moved, replaced: state.replaced });
  };
  const undone = () => {
    if (!undo) return;
    change({
      items: undo.kind === "week" ? undo.items : moveItem(items, undo.move.key, undo.move.from),
    });
    setUndo(null);
  };
  const shownUndo = undo?.replaced === state.replaced ? undo : null;
  const undoText = !shownUndo
    ? ""
    : shownUndo.kind === "week"
      ? t("week.replaced")
      : t("week.moved", {
          title: shownUndo.move.title,
          day: weekdayLong(addDaysIso(monday, shownUndo.move.to), locale),
        });

  return (
    <div className="flex min-w-0 flex-col gap-7">
      <DraftStatus state={state} today={today} personal={!choose} />
      {choose && (
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
      )}

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
          seniors={seniors}
          blocks={blocks}
          templates={templates}
          initial={start}
          onLoad={replace}
        />
        {/* Always there, so a screen reader hears a move or a new week as soon as it is made. */}
        <p aria-live="polite" className="sr-only">
          {undoText}
        </p>
        {shownUndo && (
          <p className="text-meta flex flex-wrap items-center gap-1 text-2sm">
            {undoText}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="max-sm:h-11"
              onClick={undone}
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
          onMove={move}
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
          audience={audience}
          onApplied={(sessions) => {
            const note = appliedWords(
              audience,
              { count: sessions, riders: riderIds.length },
              locale === "en" ? "en" : "da",
            );
            toast.success(t(note.key, note.values));
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
