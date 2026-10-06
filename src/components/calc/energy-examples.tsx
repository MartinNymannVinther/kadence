"use client";

import { useTranslations } from "next-intl";
import { exampleContent, type Example } from "@/modules/calc/fuel-examples";
import { ITEM_COLOUR, ItemIcon } from "./energy-item-icon";

/**
 * A few meals that fit a window, each with its food drawn, what it is in
 * words and how much carbohydrate (and, after, protein) it holds — counted
 * from the food database, so the rider can take more or less of one.
 */
export function EnergyExamples({
  examples,
  protein = false,
}: {
  examples: readonly Example[];
  protein?: boolean;
}) {
  const t = useTranslations("calculators.energy.examples");
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {examples.map((example) => {
        const content = exampleContent(example, 750);
        return (
          <li
            key={example.id}
            className="border-border bg-card flex items-start gap-3 rounded-lg border p-2.5"
          >
            <span aria-hidden className="flex shrink-0 gap-1">
              {example.portions.map((portion) => (
                <span
                  key={portion.item}
                  style={{ "--tint": ITEM_COLOUR[portion.item] } as React.CSSProperties}
                  className="relative flex size-9 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--tint)_50%,var(--border))] bg-[color-mix(in_oklab,var(--tint)_18%,var(--card))]"
                >
                  <ItemIcon id={portion.item} className="size-6" />
                  {portion.count > 1 && (
                    <span className="bg-foreground text-background absolute -right-1 -bottom-1 rounded-full px-1 text-2xs leading-4 font-semibold">
                      ×{portion.count}
                    </span>
                  )}
                </span>
              ))}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-2sm font-semibold">
                {t(`${example.id}.name` as "riceHoney.name")}
              </span>
              <span className="text-meta text-xs leading-snug">
                {t(`${example.id}.amount` as "riceHoney.amount")}
              </span>
              <span className="text-xs font-medium tabular-nums">
                {protein
                  ? t("carbsProtein", { g: content.carbs, p: content.protein })
                  : t("carbs", { g: content.carbs })}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
