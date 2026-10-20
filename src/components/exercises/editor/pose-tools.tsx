"use client";

import { useId } from "react";
import { FlipHorizontal2, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { BASE_POSES, type BasePose } from "@/modules/exercises/base-poses";
import { LIMBS, type Limb, type Pose } from "@/modules/exercises/types";

/**
 * The drawing as a whole: where it starts from, undo, mirror, and which
 * arms and legs show. A limb hidden goes behind the body; its joints stay
 * where they were.
 */
export function PoseTools({
  pose,
  canUndo,
  onBase,
  onUndo,
  onMirror,
  onLimb,
}: {
  pose: Pose;
  canUndo: boolean;
  onBase: (base: BasePose) => void;
  onUndo: () => void;
  onMirror: () => void;
  onLimb: (limb: Limb) => void;
}) {
  const t = useTranslations("exercises.editor");
  const ids = { base: useId(), hint: useId(), limbs: useId() };
  const hidden = new Set(pose.hidden ?? []);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-64">
          <label htmlFor={ids.base} className="text-label text-xs font-medium">
            {t("base")}
          </label>
          <NativeSelect
            id={ids.base}
            variant="sm"
            className="max-sm:h-11"
            aria-describedby={ids.hint}
            value=""
            onChange={(e) => {
              if (e.target.value) onBase(e.target.value as BasePose);
            }}
          >
            <option value="" disabled>
              {t("basePick")}
            </option>
            {BASE_POSES.map((base) => (
              <option key={base} value={base}>
                {t(`bases.${base}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-sm:h-11"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Undo2 data-icon="inline-start" />
          {t("undo")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-sm:h-11"
          onClick={onMirror}
        >
          <FlipHorizontal2 data-icon="inline-start" />
          {t("mirror")}
        </Button>
      </div>
      <p id={ids.hint} className="text-meta -mt-1 text-xs">
        {t("baseHint")}
      </p>
      <div role="group" aria-labelledby={ids.limbs} className="flex min-w-0 flex-col gap-1.5">
        <span id={ids.limbs} className="text-label text-xs font-medium">
          {t("limbs")}
        </span>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {LIMBS.map((limb) => (
            <label
              key={limb}
              className="border-border has-checked:border-primary has-checked:bg-accent/60 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-2sm sm:min-h-9"
            >
              <input
                type="checkbox"
                className="accent-primary size-4"
                checked={!hidden.has(limb)}
                onChange={() => onLimb(limb)}
              />
              {t(`limb.${limb}`)}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
