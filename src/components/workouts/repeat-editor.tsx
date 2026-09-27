"use client";

import { Plus, Repeat as RepeatIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Repeat } from "@/modules/workouts/structure";
import { newStep } from "./defaults";
import { ItemActions } from "./item-actions";
import { duplicateItem, moveItem, removeItem, replaceItem } from "./list-ops";
import { NumberField } from "./number-field";
import { StepEditor } from "./step-editor";

/**
 * A block ridden several times: how many, and the steps inside it, each
 * with the same moves as a step of its own. A repeat keeps at least one
 * step; removing the last one is done by removing the repeat.
 */
export function RepeatEditor({
  repeat,
  title,
  onChange,
  actions,
}: {
  repeat: Repeat;
  title: string;
  onChange: (repeat: Repeat) => void;
  actions: React.ReactNode;
}) {
  const t = useTranslations("workouts.repeat");
  const steps = repeat.steps;
  const set = (next: Repeat["steps"]) => onChange({ ...repeat, steps: next });

  return (
    <div className="border-input bg-secondary/40 flex min-w-0 flex-col gap-3 rounded-lg border border-dashed p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 truncate text-2sm font-semibold">
          <RepeatIcon aria-hidden className="size-3.5 shrink-0" />
          {title}
        </p>
        {actions}
      </div>
      <NumberField
        label={t("times")}
        value={repeat.times}
        min={1}
        max={50}
        suffix="×"
        className="max-w-40"
        onChange={(times) => onChange({ ...repeat, times: Math.max(1, times) })}
      />
      <ol className="flex flex-col gap-2">
        {steps.map((step, i) => {
          const name = t("stepName", { n: i + 1 });
          return (
            <li key={i}>
              <StepEditor
                step={step}
                title={name}
                onChange={(next) => set(replaceItem(steps, i, next))}
                actions={
                  <ItemActions
                    name={name}
                    index={i}
                    count={steps.length}
                    onMove={(by) => set(moveItem(steps, i, by))}
                    onDuplicate={steps.length < 20 ? () => set(duplicateItem(steps, i)) : undefined}
                    onRemove={() => steps.length > 1 && set(removeItem(steps, i))}
                  />
                }
              />
            </li>
          );
        })}
      </ol>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start max-sm:h-11"
        disabled={steps.length >= 20}
        onClick={() => set([...steps, newStep("work")])}
      >
        <Plus data-icon="inline-start" />
        {t("addStep")}
      </Button>
    </div>
  );
}
