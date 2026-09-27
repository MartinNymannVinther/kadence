"use client";

import { ArrowDown, ArrowUp, CopyPlus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/**
 * Up, down, a copy below, out: the four moves every row in the builder
 * has, as buttons — never drag alone — so a thumb and a keyboard can do
 * all of it. `name` says which row, for a screen reader: "Flyt trin 2 op".
 */
export function ItemActions({
  name,
  index,
  count,
  onMove,
  onDuplicate,
  onRemove,
}: {
  name: string;
  index: number;
  count: number;
  onMove: (by: -1 | 1) => void;
  onDuplicate?: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("workouts.actions");
  const size = "size-11 sm:size-8";
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={size}
        disabled={index === 0}
        onClick={() => onMove(-1)}
        aria-label={t("up", { name })}
        title={t("up", { name })}
      >
        <ArrowUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={size}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
        aria-label={t("down", { name })}
        title={t("down", { name })}
      >
        <ArrowDown />
      </Button>
      {onDuplicate && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={size}
          onClick={onDuplicate}
          aria-label={t("duplicate", { name })}
          title={t("duplicate", { name })}
        >
          <CopyPlus />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={`${size} text-destructive`}
        onClick={onRemove}
        aria-label={t("remove", { name })}
        title={t("remove", { name })}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
