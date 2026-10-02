"use client";

import { Minus, Plus, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { CheatMode, CheatState } from "./ride/cheat";

export type WattTune = "unit" | "heavier" | "lighter";

/**
 * The WATT cheat code's badge (ADR 0048): the watts the avatar rides at in
 * big digits — in watts or in watts per kilo, a press switches — the other
 * of the two and the speed they give beside them, and the avatar's weight
 * with a button either side. The weight is the avatar's, chosen here and
 * kept nowhere else.
 */
export function CheatWattBadge({
  state,
  kmh,
  onTune,
  onMode,
  onOff,
}: {
  state: NonNullable<CheatState>;
  /** The speed shown, km/h. */
  kmh: number;
  onTune: (change: WattTune) => void;
  onMode: (mode: CheatMode) => void;
  onOff: () => void;
}) {
  const t = useTranslations("rulle.cheat");
  const format = useFormatter();
  const watts = Math.round(state.watts);
  const wkg = format.number(state.watts / state.kg, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const inWkg = state.unit === "wkg";
  const quiet = "text-background/80 hover:text-foreground";

  return (
    <div className="bg-foreground/85 absolute top-3 left-1/2 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl py-1.5 pr-1.5 pl-4 shadow-[var(--surface-shadow)]">
      <span className="text-sticky text-xs font-black tracking-[0.25em] uppercase">
        {t("badge")}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-background text-ride-value leading-none font-black tabular-nums">
          {inWkg ? wkg : watts}
        </span>
        <span className="text-background/80 text-ride-label">{inWkg ? t("wkg") : t("w")}</span>
      </span>
      <span className="text-background/80 text-sm tabular-nums">
        {inWkg ? `${watts} ${t("w")}` : `${wkg} ${t("wkg")}`} · {Math.round(kmh)} {t("unit")}
      </span>
      <Button size="sm" variant="ghost" className={quiet} onClick={() => onTune("unit")}>
        {inWkg ? t("showW") : t("showWkg")}
      </Button>
      <span className="flex items-center gap-0.5" role="group" aria-label={t("weight")}>
        <Button
          size="icon-sm"
          variant="ghost"
          className={quiet}
          aria-label={t("lighter")}
          onClick={() => onTune("lighter")}
        >
          <Minus />
        </Button>
        <span className="text-background min-w-14 text-center text-sm tabular-nums">
          {t("kg", { kg: state.kg })}
        </span>
        <Button
          size="icon-sm"
          variant="ghost"
          className={quiet}
          aria-label={t("heavier")}
          onClick={() => onTune("heavier")}
        >
          <Plus />
        </Button>
      </span>
      <Button size="sm" variant="ghost" className={quiet} onClick={() => onMode("speed")}>
        {t("toSpeed")}
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        className={quiet}
        aria-label={t("off")}
        onClick={onOff}
      >
        <X />
      </Button>
    </div>
  );
}
