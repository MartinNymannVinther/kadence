"use client";

import { useRef } from "react";
import { MoveUpRight, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MAX_ARROWS } from "@/modules/exercises/pose-edit";
import type { Pose } from "@/modules/exercises/types";

/**
 * The arrows that show the movement: up to three, each with a slider that
 * bends it to one side or the other, and a button to take it away. Its
 * ends are moved on the drawing. A slide with a pointer is one step to
 * undo; each press of a key on the slider is one.
 */
export function ArrowTools({
  pose,
  onAdd,
  onRemove,
  onBend,
  onSlide,
}: {
  pose: Pose;
  onAdd: () => void;
  onRemove: (index: number) => void;
  /** `live` while a pointer slides it, between `onSlide("begin")` and `onSlide("end")`. */
  onBend: (index: number, bend: number, live: boolean) => void;
  onSlide: (phase: "begin" | "end") => void;
}) {
  const t = useTranslations("exercises.editor");
  const sliding = useRef(false);
  const slide = (phase: "begin" | "end") => {
    if (sliding.current === (phase === "begin")) return;
    sliding.current = phase === "begin";
    onSlide(phase);
  };
  const arrows = pose.arrows ?? [];
  const full = arrows.length >= MAX_ARROWS;

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="text-sm font-medium">{t("arrows")}</legend>
      <p className="text-meta -mt-1 text-xs">{t("arrowsHint")}</p>
      {arrows.map((arrow, index) => {
        const n = index + 1;
        const id = `arrow-bend-${index}`;
        return (
          <div
            key={index}
            className="border-border flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-1.5"
          >
            <span className="text-2sm w-12 shrink-0 font-medium">{t("arrow", { n })}</span>
            <label htmlFor={id} className="text-label text-xs">
              {t("bend")}
            </label>
            <input
              id={id}
              type="range"
              min={-1}
              max={1}
              step={0.05}
              value={arrow.bend ?? 0}
              aria-valuetext={String(Math.round((arrow.bend ?? 0) * 100))}
              className="accent-warning h-11 min-w-24 flex-1 sm:h-8"
              onPointerDown={() => slide("begin")}
              onPointerUp={() => slide("end")}
              onPointerCancel={() => slide("end")}
              onBlur={() => slide("end")}
              onChange={(e) => onBend(index, Number(e.target.value), sliding.current)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive size-11 sm:size-8"
              aria-label={t("removeArrow", { n })}
              title={t("removeArrow", { n })}
              onClick={() => onRemove(index)}
            >
              <Trash2 />
            </Button>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-sm:h-11"
          disabled={full}
          onClick={onAdd}
        >
          <MoveUpRight data-icon="inline-start" />
          {t("addArrow")}
        </Button>
        {full && <span className="text-meta text-xs">{t("maxArrows")}</span>}
      </div>
    </fieldset>
  );
}
