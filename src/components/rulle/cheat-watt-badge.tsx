"use client";

import { Minus, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { CheatState } from "./ride/cheat";

export type WattTune = "unit" | "heavier" | "lighter";

/** One of the cheat's smaller numbers, under what it is, the way a tile has it. */
export function CheatReadout({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="text-ride-label leading-tight font-medium tracking-wide uppercase opacity-80">
        {label}
      </span>
      <span className="text-ride-value leading-none font-semibold tabular-nums">{children}</span>
    </span>
  );
}

/**
 * The WATT cheat code's numbers (ADR 0048), in the panel that takes the
 * tiles' place (`CheatPanel`): the watts the avatar rides at in big
 * digits — in watts or in watts per kilo, a press switches — the other of
 * the two and the speed they give beside them, and the avatar's weight
 * with a button either side. The weight is the avatar's, chosen here and
 * kept nowhere else.
 */
export function CheatWattBadge({
  state,
  kmh,
  onTune,
}: {
  state: NonNullable<CheatState>;
  /** The speed shown, km/h. */
  kmh: number;
  onTune: (change: WattTune) => void;
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
    <>
      <span className="flex items-baseline gap-2">
        <span className="text-ride-hero leading-none font-black tracking-tight tabular-nums">
          {inWkg ? wkg : watts}
        </span>
        <span className="text-ride-label opacity-80">{inWkg ? t("wkg") : t("w")}</span>
      </span>
      <CheatReadout label={inWkg ? t("w") : t("wkg")}>{inWkg ? watts : wkg}</CheatReadout>
      <CheatReadout label={t("speed")}>
        {Math.round(kmh)} <span className="text-ride-label opacity-80">{t("unit")}</span>
      </CheatReadout>
      <CheatReadout label={t("weight")}>
        <span className="flex items-center gap-1">
          <Button
            size="icon-lg"
            variant="ghost"
            className={quiet}
            aria-label={t("lighter")}
            onClick={() => onTune("lighter")}
          >
            <Minus />
          </Button>
          <span className="min-w-[3ch] text-center">{state.kg}</span>
          <span className="text-ride-label opacity-80">{t("kgUnit")}</span>
          <Button
            size="icon-lg"
            variant="ghost"
            className={quiet}
            aria-label={t("heavier")}
            onClick={() => onTune("heavier")}
          >
            <Plus />
          </Button>
        </span>
      </CheatReadout>
      <Button size="lg" variant="ghost" className={quiet} onClick={() => onTune("unit")}>
        {inWkg ? t("showW") : t("showWkg")}
      </Button>
    </>
  );
}
