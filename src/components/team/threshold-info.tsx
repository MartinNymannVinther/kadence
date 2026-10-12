"use client";

import { Popover } from "@base-ui/react/popover";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ThresholdKey } from "@/modules/load/threshold-estimate";

/**
 * A small "i" beside a threshold's label that says, in two or three
 * sentences, what the number is, why Kadence uses it and how it is found.
 * A real button: it opens on a click or Enter, and Escape or a click
 * outside closes it.
 */
export function ThresholdInfo({ which, name }: { which: ThresholdKey; name: string }) {
  const t = useTranslations("riders.thresholds");
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={t("explainLabel", { name })}
        className="focus-ring text-meta hover:text-foreground -m-1.5 inline-flex size-7 items-center justify-center rounded-full"
      >
        <Info aria-hidden className="size-3.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-50">
          <Popover.Popup className="border-border bg-popover text-popover-foreground w-72 max-w-[calc(100vw-2rem)] rounded-xl border p-3 shadow-lg outline-none">
            <Popover.Title className="mb-1 text-sm font-semibold">{name}</Popover.Title>
            <Popover.Description className="text-2sm leading-relaxed">
              {t(`explain.${which}`)}
            </Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
