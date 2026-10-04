"use client";

import { Minus, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { CheatState, Push } from "./ride/cheat";
import type { WattTune } from "./ride/watt-dial";

const QUIET = "text-background/80 hover:text-foreground";

/** One of the cheat's smaller numbers, under what it is, the way a tile has it. */
export function CheatReadout({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="text-sm leading-tight font-medium tracking-wide uppercase opacity-80">
        {label}
      </span>
      <span className="text-3xl leading-none font-semibold tabular-nums lg:text-4xl">
        {children}
      </span>
    </span>
  );
}

/**
 * A step of the watts: once when pressed, and on and on while held, as a
 * key is (`WattDial.hold`). From the keyboard or a screen reader, a press
 * is one step.
 */
function StepButton({
  direction,
  label,
  onPush,
  onTune,
}: {
  direction: -1 | 1;
  label: string;
  onPush: (push: Push) => void;
  onTune: (change: WattTune) => void;
}) {
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      className={`${QUIET} touch-none select-none`}
      aria-label={label}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        onPush(direction);
      }}
      onPointerUp={() => onPush(0)}
      onPointerCancel={() => onPush(0)}
      onClick={(event) => {
        if (event.detail === 0) onTune(direction > 0 ? "more" : "less");
      }}
    >
      {direction > 0 ? <Plus /> : <Minus />}
    </Button>
  );
}

/**
 * The WATT cheat code's numbers (ADR 0048), in the panel that takes the
 * tiles' place (`CheatPanel`): the watts the avatar rides at, with a step
 * down and up either side — 5 W, or 0.1 W/kg — in watts or in watts per
 * kilo, a press switches; the other of the two and the speed they give
 * beside them; and the avatar's weight with a button either side. The
 * weight is the avatar's, chosen here and kept nowhere else.
 */
export function CheatWattBadge({
  state,
  kmh,
  onTune,
  onPush,
}: {
  state: NonNullable<CheatState>;
  /** The speed shown, km/h. */
  kmh: number;
  onTune: (change: WattTune) => void;
  onPush: (push: Push) => void;
}) {
  const t = useTranslations("rulle.cheat");
  const format = useFormatter();
  const watts = Math.round(state.watts);
  const wkg = format.number(state.watts / state.kg, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const inWkg = state.unit === "wkg";

  return (
    <>
      <span className="flex items-center gap-1">
        <StepButton direction={-1} label={t("less")} onPush={onPush} onTune={onTune} />
        <span className="flex items-baseline gap-1.5">
          <span className="text-ride-value leading-none font-black tracking-tight tabular-nums">
            {inWkg ? wkg : watts}
          </span>
          <span className="text-ride-label opacity-80">{inWkg ? t("wkg") : t("w")}</span>
        </span>
        <StepButton direction={1} label={t("more")} onPush={onPush} onTune={onTune} />
      </span>
      <CheatReadout label={inWkg ? t("w") : t("wkg")}>{inWkg ? watts : wkg}</CheatReadout>
      <CheatReadout label={t("speed")}>
        {Math.round(kmh)} <span className="text-sm opacity-80">{t("unit")}</span>
      </CheatReadout>
      <CheatReadout label={t("weight")}>
        <span className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            className={QUIET}
            aria-label={t("lighter")}
            onClick={() => onTune("lighter")}
          >
            <Minus />
          </Button>
          <span className="min-w-[3ch] text-center">{state.kg}</span>
          <span className="text-sm opacity-80">{t("kgUnit")}</span>
          <Button
            size="icon-sm"
            variant="ghost"
            className={QUIET}
            aria-label={t("heavier")}
            onClick={() => onTune("heavier")}
          >
            <Plus />
          </Button>
        </span>
      </CheatReadout>
      <Button size="sm" variant="ghost" className={QUIET} onClick={() => onTune("unit")}>
        {inWkg ? t("showW") : t("showWkg")}
      </Button>
    </>
  );
}
