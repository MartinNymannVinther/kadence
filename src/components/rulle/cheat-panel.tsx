"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CheatWattBadge } from "./cheat-watt-badge";
import type { CheatMode, CheatState, Push } from "./ride/cheat";
import type { WattTune } from "./ride/watt-dial";

/**
 * The cheat code in the tiles' place (ADR 0045, 0073): while one is on,
 * the watts, the time and the body's numbers make way for the cheat's
 * own, in the old arcade machine's colours and a little smaller — on
 * SPURT the bike's speed, on WATT its watts, W/kg and the avatar's weight
 * (`CheatWattBadge`) — with a press over to the other code and a cross
 * that turns it off. Turned off, the tiles come back.
 */
export function CheatPanel({
  state,
  kmh,
  onOff,
  onMode,
  onTune,
  onPush,
}: {
  state: NonNullable<CheatState>;
  /** The speed shown, km/h. */
  kmh: number;
  onOff: () => void;
  onMode: (mode: CheatMode) => void;
  onTune: (change: WattTune) => void;
  onPush: (push: Push) => void;
}) {
  const t = useTranslations("rulle.cheat");
  const watts = state.mode === "watts";
  const quiet = "text-background/80 hover:text-foreground";

  return (
    <section
      aria-label={t("title")}
      className="bg-foreground/90 text-background border-sticky/70 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border-2 px-4 py-3 shadow-surface sm:px-5 lg:px-6 lg:py-4"
    >
      <span className="text-sticky text-sm font-black tracking-[0.25em] uppercase">
        {t("badge")}
      </span>
      {watts ? (
        <CheatWattBadge state={state} kmh={kmh} onTune={onTune} onPush={onPush} />
      ) : (
        <span className="flex items-baseline gap-2">
          <span className="text-ride-value leading-none font-black tracking-tight tabular-nums">
            {Math.round(kmh)}
          </span>
          <span className="text-ride-label opacity-80">{t("unit")}</span>
        </span>
      )}
      <span className="ml-auto flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className={quiet}
          onClick={() => onMode(watts ? "speed" : "watts")}
        >
          {watts ? t("toSpeed") : t("toWatts")}
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
      </span>
    </section>
  );
}
