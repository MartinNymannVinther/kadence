"use client";

import { useState } from "react";
import { Download, Eraser } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRun } from "@/components/common/use-run";
import type { TemplateOption } from "@/components/calendar/template-picker";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { SegmentedChoice } from "@/components/ui/segmented";
import type { ClassBasis } from "@/modules/dcu";
import { loadPreviousWeekAction } from "@/modules/training/week-actions";
import { GroupWeekAi } from "./group-week-ai";
import { fromInput, type PlanBlock, type PlanItem } from "./types";

export type StartMode = "empty" | "last" | "block" | "ai";

/**
 * Where the week starts (ADR 0058): an empty week, last week's sessions,
 * a week of one of the library's blocks, or the AI's proposal for the
 * group (ADR 0043) — the one AI path, also where a rider's "Foreslå
 * ugen" leads. What comes in replaces the plan, and can be changed before
 * it is laid in.
 */
export function StartFrom({
  monday,
  riderIds,
  bases,
  blocks,
  templates,
  initial,
  onLoad,
}: {
  monday: string;
  /** The riders the week is for: last week is theirs. */
  riderIds: string[];
  /** Their class-years, for the AI. */
  bases: ClassBasis[];
  blocks: PlanBlock[];
  templates: TemplateOption[];
  initial?: StartMode;
  onLoad: (items: PlanItem[]) => void;
}) {
  const t = useTranslations("weekPlan.start");
  const { run, pending } = useRun();
  const [mode, setMode] = useState<StartMode>(initial ?? "last");
  const [blockId, setBlockId] = useState(blocks[0]?.id ?? "");
  const [week, setWeek] = useState(1);
  // A block saved a moment ago arrives with the refresh; the first stands in until one is chosen.
  const block = blocks.find((b) => b.id === blockId) ?? blocks[0];
  const items = (list: Parameters<typeof fromInput>[0][]) =>
    list.flatMap((i) => fromInput(i, templates) ?? []);

  function loadBlock() {
    if (!block) return;
    const from = (week - 1) * 7;
    onLoad(
      items(
        block.items
          .filter((i) => i.day >= from && i.day < from + 7)
          .map((i) => ({ ...i, day: i.day - from })),
      ),
    );
  }

  async function loadLast() {
    if (riderIds.length === 0) return;
    const loaded = await run(() => loadPreviousWeekAction({ riderIds, monday }), {
      refresh: false,
    });
    if (!loaded) return;
    if (loaded.length === 0) toast.info(t("lastEmpty"));
    else onLoad(items(loaded));
  }

  return (
    <div className="border-border flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      <SegmentedChoice<StartMode>
        label={t("source")}
        value={mode}
        onChange={setMode}
        className="flex-wrap self-start [&>button]:max-sm:min-h-11"
        options={[
          { value: "empty", label: t("empty") },
          { value: "last", label: t("last") },
          { value: "block", label: t("block") },
          { value: "ai", label: t("ai") },
        ]}
      />
      {mode === "empty" && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-2sm">{t("emptyBody")}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-sm:h-11"
            onClick={() => onLoad([])}
          >
            <Eraser data-icon="inline-start" />
            {t("clear")}
          </Button>
        </div>
      )}
      {mode === "last" && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-2sm">{riderIds.length === 1 ? t("lastOne") : t("lastMany")}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || riderIds.length === 0}
            className="max-sm:h-11"
            onClick={() => void loadLast()}
          >
            <Download data-icon="inline-start" />
            {t("loadLast")}
          </Button>
        </div>
      )}
      {mode === "block" &&
        (blocks.length === 0 ? (
          <p className="text-meta text-2sm">{t("noBlocks")}</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <NativeSelect
              aria-label={t("block")}
              value={block?.id ?? ""}
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
            {(block?.weeks ?? 1) > 1 && (
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
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="max-sm:h-11"
              onClick={loadBlock}
            >
              <Download data-icon="inline-start" />
              {t("load")}
            </Button>
          </div>
        ))}
      {mode === "ai" && (
        <GroupWeekAi
          monday={monday}
          bases={bases}
          templates={templates}
          onUse={onLoad}
          defaultOpen
        />
      )}
      <p className="text-meta text-xs">{t("hint")}</p>
    </div>
  );
}
