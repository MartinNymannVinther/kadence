"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { ExerciseLookup } from "@/modules/exercises/view";
import type { Dose, ProgramPart } from "@/modules/exercises/types";
import { ComposerDoseEditor } from "./composer-dose-editor";

/**
 * What has been added so far, by part, with its order and its dose
 * (docs/plan-ovelser-og-programmer.md): move up or down, change the dose,
 * or take it back out. No drag and drop — two buttons do the ordering.
 */
export function ComposerBuilder({
  parts,
  resolve,
  onMove,
  onRemove,
  onDoseChange,
}: {
  parts: ProgramPart[];
  resolve: ExerciseLookup;
  onMove: (partIndex: number, itemIndex: number, direction: -1 | 1) => void;
  onRemove: (partIndex: number, itemIndex: number) => void;
  onDoseChange: (partIndex: number, itemIndex: number, dose: Dose) => void;
}) {
  const t = useTranslations("exercises");
  const tc = useTranslations("exercises.compose");

  if (parts.length === 0) return <p className="text-meta text-2sm">{tc("builderEmpty")}</p>;

  return (
    <div className="flex flex-col gap-6">
      {parts.map((part, partIndex) => (
        <div key={part.key} className="flex flex-col gap-3">
          <h3 className="text-reading text-sm font-semibold">{t(`parts.${part.key}`)}</h3>
          <ul className="flex flex-col gap-3">
            {part.items.map((item, itemIndex) => {
              const view = resolve(item.exercise);
              if (!view) return null;
              const dose = item.dose ?? view.dose;
              return (
                <li
                  key={`${item.exercise}-${itemIndex}`}
                  className="border-border bg-card flex flex-col gap-2.5 rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-reading text-sm font-medium">{view.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={itemIndex === 0}
                        aria-label={tc("moveUp", { name: view.name })}
                        onClick={() => onMove(partIndex, itemIndex, -1)}
                      >
                        <ChevronUp aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={itemIndex === part.items.length - 1}
                        aria-label={tc("moveDown", { name: view.name })}
                        onClick={() => onMove(partIndex, itemIndex, 1)}
                      >
                        <ChevronDown aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={tc("remove", { name: view.name })}
                        onClick={() => onRemove(partIndex, itemIndex)}
                      >
                        <X aria-hidden />
                      </Button>
                    </div>
                  </div>
                  <ComposerDoseEditor
                    dose={dose}
                    onChange={(next) => onDoseChange(partIndex, itemIndex, next)}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
