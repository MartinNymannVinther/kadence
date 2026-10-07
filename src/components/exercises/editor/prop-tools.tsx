"use client";

import { useId, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { canAddProp, MAX_PROPS, PROP_KINDS } from "@/modules/exercises/pose-props";
import type { Pose, Prop } from "@/modules/exercises/types";

/**
 * What the figure stands on and uses: the floor, a wall, a mat, a bench,
 * a step, an elastic band, a ball, a kettlebell, and the strength room's
 * barbell, dumbbell, TRX straps and pull-up bar — up to six, one floor,
 * wall, barbell, TRX and bar each. A new one lands beside the figure and
 * is moved on the drawing.
 */
export function PropTools({
  pose,
  onAdd,
  onRemove,
  onTurn,
}: {
  pose: Pose;
  onAdd: (kind: Prop["kind"]) => void;
  onRemove: (index: number) => void;
  /** The barbell seen from the side or the front. */
  onTurn: (index: number) => void;
}) {
  const t = useTranslations("exercises.editor");
  const kindId = useId();
  const props = pose.props ?? [];
  const available = PROP_KINDS.filter((kind) => canAddProp(pose, kind));
  const [kind, setKind] = useState<Prop["kind"]>("bench");
  const chosen = available.includes(kind) ? kind : available[0];

  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="text-sm font-medium">{t("props")}</legend>
      {props.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {props.map((prop, index) => (
            <li
              key={`${prop.kind}-${index}`}
              className="border-border bg-card flex items-center gap-1 rounded-full border py-0.5 pr-0.5 pl-3 text-2sm"
            >
              {t(`prop.${prop.kind}`)}
              {prop.kind === "barbell" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-10 rounded-full sm:size-7"
                  aria-label={t(
                    (prop.view ?? "side") === "side" ? "barbellToFront" : "barbellToSide",
                  )}
                  title={t((prop.view ?? "side") === "side" ? "barbellToFront" : "barbellToSide")}
                  onClick={() => onTurn(index)}
                >
                  <RefreshCw />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-destructive size-10 rounded-full sm:size-7"
                aria-label={t("removeProp", { name: t(`prop.${prop.kind}`) })}
                title={t("removeProp", { name: t(`prop.${prop.kind}`) })}
                onClick={() => onRemove(index)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {chosen ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor={kindId} className="text-label text-xs font-medium">
              {t("propKind")}
            </label>
            <NativeSelect
              id={kindId}
              variant="sm"
              className="w-44 max-sm:h-11"
              value={chosen}
              onChange={(e) => setKind(e.target.value as Prop["kind"])}
            >
              {available.map((k) => (
                <option key={k} value={k}>
                  {t(`prop.${k}`)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-sm:h-11"
            onClick={() => onAdd(chosen)}
          >
            <Plus data-icon="inline-start" />
            {t("addProp")}
          </Button>
        </div>
      ) : (
        props.length >= MAX_PROPS && <p className="text-meta text-xs">{t("maxProps")}</p>
      )}
    </fieldset>
  );
}
