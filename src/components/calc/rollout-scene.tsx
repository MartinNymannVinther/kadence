"use client";

import { CircleAlert, CircleCheck, Play, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { useWidth } from "@/components/charts/use-width";
import { Button } from "@/components/ui/button";
import { gearStatus, rolloutM, wheelTurns, type GearStatus } from "@/modules/calc/gearing";
import { cn } from "@/lib/utils";
import { RolloutDrawing } from "./rollout-drawing";
import { usePedalStroke } from "./use-pedal-stroke";

const BADGE: Record<GearStatus, { tone: string; Icon: typeof CircleCheck }> = {
  over: { tone: "bg-destructive text-card", Icon: CircleAlert },
  close: { tone: "bg-sticky text-sticky-ink", Icon: TriangleAlert },
  within: { tone: "bg-secondary text-foreground", Icon: CircleCheck },
  free: { tone: "bg-secondary text-foreground", Icon: CircleCheck },
};

/**
 * One turn of the pedals, drawn to scale: the bike stands with a pedal
 * straight down, as the commissaire sets it, turns the cranks once and
 * rolls its rollout along a ruler in metres, past or short of the
 * class's limit. A faint bike stays where it started. The distance is
 * counted as it rolls, and a badge beside it says over, close or within
 * in words and with an icon — the moment the bike passes the limit, or
 * when the turn is done.
 */
export function RolloutScene({
  ring,
  cog,
  circumferenceMm,
  limit,
  className,
}: {
  ring: number;
  cog: number;
  circumferenceMm: number;
  limit: number | null;
  className: string;
}) {
  const t = useTranslations("calculators.gearing.scene");
  const locale = useLocale();
  const { ref, width } = useWidth<HTMLDivElement>();
  const { progress, play } = usePedalStroke();

  const rollout = rolloutM(ring, cog, circumferenceMm);
  const turns = wheelTurns(ring, cog);
  const travelled = progress * rollout;
  const over = limit !== null && travelled > limit;
  const status: GearStatus | null =
    over || progress >= 1 ? gearStatus(over ? travelled : rollout, limit) : null;
  const badge = status ? BADGE[status] : null;

  return (
    <figure className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div aria-hidden className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("text-3xl font-semibold tabular-nums", over && "text-destructive")}>
              {t("distance", { m: num(travelled, locale, 2) })}
            </span>
            {status && badge && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                  badge.tone,
                )}
              >
                <badge.Icon className="size-3.5" />
                {t(`status.${status}` as "play")}
              </span>
            )}
          </div>
          <span className="text-meta text-xs tabular-nums">
            {t("wheel", { turns: progress * turns })}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={play}>
          <Play aria-hidden />
          {t("play")}
        </Button>
      </div>
      <div ref={ref} className="w-full">
        <RolloutDrawing
          width={width}
          ring={ring}
          cog={cog}
          circumferenceMm={circumferenceMm}
          limit={limit}
          className={className}
          rollout={rollout}
          turns={turns}
          progress={progress}
          status={status}
        />
      </div>
      <figcaption className="text-meta text-2sm leading-relaxed">{t("caption")}</figcaption>
    </figure>
  );
}
