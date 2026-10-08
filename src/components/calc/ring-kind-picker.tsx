"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import type { ChainringFamily } from "@/modules/calc/gear-products";
import { cn } from "@/lib/utils";
import { RingGlyph } from "./ring-list";

type Kind = ChainringFamily["kind"];

const KINDS: readonly Kind[] = ["double", "single"];

/**
 * Two rings in front or one: the reader chooses which builds to see, so
 * a bike with a front derailleur is not mixed up with one without. Each
 * choice is drawn and explained in a line. Radio buttons underneath, as
 * the class buttons.
 */
export function RingKindPicker({ value, onChange }: { value: Kind; onChange: (k: Kind) => void }) {
  const t = useTranslations("calculators.gearing.products.kind");
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-label mb-2 text-xs font-medium">{t("label")}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {KINDS.map((kind) => (
          <label
            key={kind}
            className={cn(
              "border-border bg-card flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors duration-[120ms] ease-out",
              "hover:bg-secondary has-[:checked]:border-primary has-[:checked]:bg-secondary has-[:checked]:ring-primary has-[:checked]:ring-1",
              "has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
            )}
          >
            <input
              type="radio"
              name={name}
              value={kind}
              checked={value === kind}
              onChange={() => onChange(kind)}
              className="sr-only"
            />
            <RingGlyph kind={kind} className="text-primary size-9" />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{t(kind)}</span>
              <span className="text-meta text-xs leading-relaxed">
                {kind === "double" ? t("doubleHelp") : t("singleHelp")}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
