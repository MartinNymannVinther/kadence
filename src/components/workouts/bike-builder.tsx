"use client";

import { Plus, Repeat as RepeatIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { TextToSteps } from "@/components/assist/text-to-steps";
import { Button } from "@/components/ui/button";
import { durationText } from "@/components/training/duration";
import { structureMinutes, type BikeStructure } from "@/modules/workouts/structure";
import { newRepeat, newStep } from "./defaults";
import { ItemActions } from "./item-actions";
import { duplicateItem, moveItem, removeItem, replaceItem } from "./list-ops";
import { ProfileChart } from "./profile-chart";
import { RepeatEditor } from "./repeat-editor";
import { StepEditor } from "./step-editor";

const MAX_ITEMS = 60;

/**
 * A bike session, built on a phone as well as at a desk: the profile and
 * the total time on top, live, and below them the steps and repeats in
 * riding order, each with its own up, down, copy and remove. New steps
 * land at the end, before the cool-down if there is one. "Skriv det som
 * du plejer" reads the coach's shorthand into steps that replace these.
 */
export function BikeBuilder({
  structure,
  onChange,
}: {
  structure: BikeStructure;
  onChange: (structure: BikeStructure) => void;
}) {
  const t = useTranslations("workouts.bike");
  const duration = useTranslations("training.duration");
  const items = structure.steps;
  const set = (steps: BikeStructure["steps"]) => onChange({ ...structure, steps });

  /** Before a closing cool-down, so "add" means "add to the work". */
  function add(item: BikeStructure["steps"][number]) {
    const last = items.at(-1);
    const at =
      last?.kind === "step" && last.intent === "cooldown" ? items.length - 1 : items.length;
    const next = [...items];
    next.splice(at, 0, item);
    set(next);
  }

  // Steps and repeats are numbered each on their own: "Trin 3", "Gentagelse 1".
  const numbers = items.map(
    (item, i) => items.slice(0, i + 1).filter((other) => other.kind === item.kind).length,
  );

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <TextToSteps onUse={(parsed) => onChange({ ...structure, steps: parsed.steps })} />
      <div className="flex flex-col gap-2">
        <ProfileChart structure={structure} />
        <p className="text-2sm flex items-center justify-between" aria-live="polite">
          <span className="text-meta">{t("total")}</span>
          <span className="font-semibold tabular-nums">
            {durationText(structureMinutes(structure), duration)}
          </span>
        </p>
      </div>

      <ol className="flex flex-col gap-2">
        {items.map((item, i) => {
          const n = numbers[i] ?? i + 1;
          const name = item.kind === "step" ? t("stepName", { n }) : t("repeatName", { n });
          const actions = (
            <ItemActions
              name={name}
              index={i}
              count={items.length}
              onMove={(by) => set(moveItem(items, i, by))}
              onDuplicate={
                items.length < MAX_ITEMS ? () => set(duplicateItem(items, i)) : undefined
              }
              onRemove={() => set(removeItem(items, i))}
            />
          );
          return (
            <li key={i}>
              {item.kind === "step" ? (
                <StepEditor
                  step={item}
                  title={name}
                  onChange={(next) => set(replaceItem(items, i, next))}
                  actions={actions}
                />
              ) : (
                <RepeatEditor
                  repeat={item}
                  title={t("repeatTitle", { n, times: item.times })}
                  onChange={(next) => set(replaceItem(items, i, next))}
                  actions={actions}
                />
              )}
            </li>
          );
        })}
      </ol>

      {items.length === 0 && <p className="text-meta text-2sm">{t("empty")}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="max-sm:h-11 max-sm:flex-1"
          size="sm"
          disabled={items.length >= MAX_ITEMS}
          onClick={() => add(newStep("work"))}
        >
          <Plus data-icon="inline-start" />
          {t("addStep")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="max-sm:h-11 max-sm:flex-1"
          size="sm"
          disabled={items.length >= MAX_ITEMS}
          onClick={() => add(newRepeat())}
        >
          <RepeatIcon data-icon="inline-start" />
          {t("addRepeat")}
        </Button>
      </div>
    </div>
  );
}
