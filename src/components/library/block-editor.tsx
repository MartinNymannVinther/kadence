"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { weekdayShort } from "@/components/training/day-label";
import { durationText } from "@/components/training/duration";
import { SportIcon } from "@/components/training/sport-icon";
import { addDaysIso } from "@/core/dates";
import { useRouter } from "@/i18n/navigation";
import { createBlockAction, updateBlockAction } from "@/modules/training/block-actions";
import type { BlockItemInputT } from "@/modules/training/blocks";
import { clockText } from "@/modules/training/time-place";

export type BlockDraft = {
  id: string | null;
  name: string;
  description: string;
  weeks: number;
  /** From the library, or a session kept in the block itself (ADR 0059). */
  items: BlockItemInputT[];
};
export type BlockTemplateOption = {
  id: string;
  name: string;
  sport: string;
  plannedMinutes: number;
};

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/**
 * A block laid out week by week: each day a list of sessions from the
 * library, added from a select and taken away with a press. A session
 * saved from the week planner without being in the library (ADR 0059) is
 * shown, kept and removed the same way. Works on a phone, one week at a
 * time in view. Saved as a whole; nothing reaches a calendar until the
 * block is applied.
 */
export function BlockEditor({
  initial,
  templates,
}: {
  initial: BlockDraft;
  templates: BlockTemplateOption[];
}) {
  const t = useTranslations("library.blocks");
  const locale = useLocale();
  // Any Monday: the names of the seven days, in the reader's language.
  const days = (d: number) => weekdayShort(addDaysIso("2026-09-28", d), locale);
  const duration = useTranslations("training.duration");
  const common = useTranslations("common");
  const router = useRouter();
  const { run, pending } = useRun();
  const ids = { name: useId(), description: useId(), weeks: useId() };
  const [draft, setDraft] = useState(initial);
  const byId = new Map(templates.map((tpl) => [tpl.id, tpl]));
  const shown = (item: BlockItemInputT) =>
    "templateId" in item
      ? {
          name: byId.get(item.templateId)?.name ?? "?",
          sport: byId.get(item.templateId)?.sport ?? "bike",
          minutes: byId.get(item.templateId)?.plannedMinutes ?? 0,
        }
      : {
          name: item.session.title,
          sport: item.session.sport,
          minutes: item.session.plannedMinutes,
        };
  const weeksHours = (week: number) =>
    draft.items
      .filter((i) => Math.floor(i.day / 7) === week)
      .map(shown)
      .reduce((s, i) => s + (i.sport === "bike" ? i.minutes / 60 : 0), 0);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const body = {
      name: draft.name,
      description: draft.description,
      weeks: draft.weeks,
      items: draft.items,
    };
    const options = { success: common("saved"), refresh: false };
    const done = draft.id
      ? await run(() => updateBlockAction({ blockId: draft.id!, block: body }), options)
      : await run(() => createBlockAction(body), options);
    if (done !== null) router.push("/library");
  }

  return (
    <form onSubmit={save} className="flex min-w-0 flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.name} className="text-label text-xs">
            {t("name")}
          </label>
          <Input
            id={ids.name}
            value={draft.name}
            required
            maxLength={80}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.weeks} className="text-label text-xs">
            {t("weeks")}
          </label>
          <NativeSelect
            id={ids.weeks}
            value={String(draft.weeks)}
            onChange={(e) => setDraft({ ...draft, weeks: Number(e.target.value) })}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {t("weekCount", { n })}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor={ids.description} className="text-label text-xs">
            {t("description")}
          </label>
          <Textarea
            id={ids.description}
            value={draft.description}
            maxLength={600}
            rows={2}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </div>
      </div>

      {Array.from({ length: draft.weeks }, (_, week) => (
        <section
          key={week}
          aria-labelledby={`block-week-${week}`}
          className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h3 id={`block-week-${week}`} className="text-sm font-semibold">
              {t("week", { n: week + 1 })}
            </h3>
            <p className="text-meta text-xs tabular-nums">
              {t("weekHours", { hours: durationText(weeksHours(week) * 60, duration) })}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-7">
            {DAYS.map((d) => {
              const day = week * 7 + d;
              const mine = draft.items
                .map((item, index) => ({ ...item, index }))
                .filter((i) => i.day === day);
              return (
                <div key={day} className="flex min-w-0 flex-col gap-1.5">
                  <p className="text-label text-xs">{days(d)}</p>
                  <ul className="flex flex-col gap-1">
                    {mine.map((item) => {
                      const tpl = shown(item);
                      const own = !("templateId" in item);
                      return (
                        <li
                          key={item.index}
                          title={own ? t("ownSession") : undefined}
                          className="bg-secondary flex min-w-0 items-center gap-1 rounded-md px-2 py-1 text-xs"
                        >
                          <SportIcon sport={tpl.sport} className="size-3 shrink-0" />
                          {item.startTime && (
                            <span className="shrink-0 tabular-nums">
                              {clockText(item.startTime, locale)}
                            </span>
                          )}
                          <span className="min-w-0 flex-1 truncate">
                            {tpl.name}
                            {own && <span className="sr-only"> ({t("ownSession")})</span>}
                          </span>
                          <button
                            type="button"
                            className="focus-ring text-meta hover:text-foreground -m-1 flex size-7 shrink-0 items-center justify-center rounded"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                items: draft.items.filter((_, i) => i !== item.index),
                              })
                            }
                            aria-label={t("remove", { name: tpl.name })}
                          >
                            <X aria-hidden className="size-3" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <NativeSelect
                    aria-label={t("addTo", { day: days(d), week: week + 1 })}
                    value=""
                    className="h-9 text-xs"
                    onChange={(e) => {
                      if (e.target.value)
                        setDraft({
                          ...draft,
                          items: [...draft.items, { day, templateId: e.target.value }],
                        });
                    }}
                  >
                    <option value="">{t("add")}</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || !draft.name.trim()}>
          {common("save")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/library")}>
          {common("cancel")}
        </Button>
      </div>
    </form>
  );
}
