"use client";

import { useId, useState } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import type { TemplateOption } from "@/components/calendar/template-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { addDaysIso, mondayOf } from "@/core/dates";
import { loadRiderWeekAction } from "@/modules/training/week-actions";
import { fromInput, newKey, type PlanItem, type PlanRider } from "./types";

export type PlanBlock = {
  id: string;
  name: string;
  weeks: number;
  items: Array<{ day: number; templateId: string }>;
};

/**
 * A week to start from instead of an empty one: a week of one of the
 * library's blocks (ADR 0025), or one rider's week — "a week like last
 * week's for Emma" for the whole group. What comes in replaces the plan,
 * and can then be changed before it is laid in.
 */
export function StartFrom({
  monday,
  blocks,
  riders,
  templates,
  onLoad,
}: {
  monday: string;
  blocks: PlanBlock[];
  riders: PlanRider[];
  templates: TemplateOption[];
  onLoad: (items: PlanItem[]) => void;
}) {
  const t = useTranslations("weekPlan.start");
  const id = useId();
  const { run, pending } = useRun();
  const [source, setSource] = useState<"block" | "rider">(blocks.length > 0 ? "block" : "rider");
  const [blockId, setBlockId] = useState(blocks[0]?.id ?? "");
  const [week, setWeek] = useState(1);
  const [riderId, setRiderId] = useState(riders[0]?.id ?? "");
  const [day, setDay] = useState(addDaysIso(monday, -7));
  const block = blocks.find((b) => b.id === blockId);

  async function load() {
    if (source === "block") {
      if (!block) return;
      const from = (week - 1) * 7;
      onLoad(
        block.items
          .filter((i) => i.day >= from && i.day < from + 7)
          .flatMap((i) => {
            const item = fromInput(
              { kind: "template", day: i.day - from, templateId: i.templateId },
              templates,
            );
            return item ? [{ ...item, key: newKey() }] : [];
          }),
      );
      return;
    }
    if (!riderId || !day) return;
    const items = await run(() => loadRiderWeekAction({ riderId, monday: mondayOf(day) }), {
      refresh: false,
    });
    if (items) onLoad(items.flatMap((i) => fromInput(i, templates) ?? []));
  }

  return (
    <div className="border-border flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-source`} className="text-label text-xs font-medium">
            {t("source")}
          </label>
          <NativeSelect
            id={`${id}-source`}
            value={source}
            variant="sm"
            className="w-44 max-sm:h-11"
            onChange={(e) => setSource(e.target.value as "block" | "rider")}
          >
            {blocks.length > 0 && <option value="block">{t("block")}</option>}
            <option value="rider">{t("rider")}</option>
          </NativeSelect>
        </div>
        {source === "block" ? (
          <>
            <NativeSelect
              aria-label={t("block")}
              value={blockId}
              variant="sm"
              className="w-52 max-sm:h-11"
              onChange={(e) => {
                setBlockId(e.target.value);
                setWeek(1);
              }}
            >
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label={t("week")}
              value={week}
              variant="sm"
              className="w-28 max-sm:h-11"
              onChange={(e) => setWeek(Number(e.target.value))}
            >
              {Array.from({ length: block?.weeks ?? 1 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {t("weekN", { n: i + 1 })}
                </option>
              ))}
            </NativeSelect>
          </>
        ) : (
          <>
            <NativeSelect
              aria-label={t("rider")}
              value={riderId}
              variant="sm"
              className="w-44 max-sm:h-11"
              onChange={(e) => setRiderId(e.target.value)}
            >
              {riders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </NativeSelect>
            <Input
              type="date"
              aria-label={t("weekOf")}
              value={day}
              className="h-9 w-44 max-sm:h-11"
              onChange={(e) => setDay(e.target.value)}
            />
          </>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          className="max-sm:h-11"
          onClick={() => void load()}
        >
          <Download data-icon="inline-start" />
          {t("load")}
        </Button>
      </div>
      <p className="text-meta text-xs">{t("hint")}</p>
    </div>
  );
}
