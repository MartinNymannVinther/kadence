"use client";

import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { LibraryExercise } from "@/modules/exercises/library";
import { MAX_ITEMS, type DraftPart } from "@/modules/exercises/program-draft";
import { PART_KEYS, type Dose, type PartKey } from "@/modules/exercises/types";
import { ItemRow } from "./item-row";

/**
 * One part of the programme — "Morgen", "Før", or just "Øvelser" — and
 * its exercises in order. A part's key is chosen among those no other
 * part has; a part can be taken out while there are others.
 */
export function PartEditor({
  part,
  usedKeys,
  known,
  removable,
  onKey,
  onRemove,
  onAdd,
  onMove,
  onRemoveItem,
  onDose,
}: {
  part: DraftPart;
  /** The keys the other parts have. */
  usedKeys: ReadonlySet<PartKey>;
  known: ReadonlyMap<string, LibraryExercise>;
  removable: boolean;
  onKey: (key: PartKey) => void;
  onRemove: () => void;
  onAdd: () => void;
  onMove: (item: number, by: -1 | 1) => void;
  onRemoveItem: (item: number) => void;
  onDose: (item: number, dose: Dose | undefined) => void;
}) {
  const t = useTranslations("exercises");
  const keyId = useId();
  const partName = t(`parts.${part.key}`);
  const full = part.items.length >= MAX_ITEMS;

  return (
    <section
      aria-label={partName}
      className="border-border bg-secondary/40 flex min-w-0 flex-col gap-3 rounded-xl border p-3"
    >
      <div className="flex items-end justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={keyId} className="text-label text-xs font-medium">
            {t("builder.partKey")}
          </label>
          <NativeSelect
            id={keyId}
            variant="sm"
            className="w-48 max-sm:h-11"
            value={part.key}
            onChange={(e) => onKey(e.target.value as PartKey)}
          >
            {PART_KEYS.filter((key) => key === part.key || !usedKeys.has(key)).map((key) => (
              <option key={key} value={key}>
                {t(`parts.${key}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
        {removable && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-destructive size-11 sm:size-9"
            aria-label={t("builder.removePart", { name: partName })}
            title={t("builder.removePart", { name: partName })}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        )}
      </div>
      {part.items.length === 0 ? (
        <p className="text-meta text-2sm">{t("builder.emptyPart")}</p>
      ) : (
        <ol className="flex min-w-0 flex-col gap-2">
          {part.items.map((item, i) => (
            <ItemRow
              key={`${item.exercise}-${i}`}
              item={item}
              exercise={known.get(item.exercise)}
              index={i}
              count={part.items.length}
              onMove={(by) => onMove(i, by)}
              onRemove={() => onRemoveItem(i)}
              onDose={(dose) => onDose(i, dose)}
            />
          ))}
        </ol>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-sm:h-11"
          disabled={full}
          onClick={onAdd}
        >
          <Plus data-icon="inline-start" />
          {t("builder.addExercise")}
        </Button>
        {full && <span className="text-meta text-xs">{t("builder.maxItems")}</span>}
      </div>
    </section>
  );
}
