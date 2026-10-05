"use client";

import { Play } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { useWidth } from "@/components/charts/use-width";
import { Button } from "@/components/ui/button";
import { rolloutM, wheelTurns } from "@/modules/calc/gearing";
import { BIKE_AHEAD_M, BIKE_BEHIND_M, BIKE_HEIGHT_M, RolloutBike } from "./rollout-bike";
import { usePedalStroke } from "./use-pedal-stroke";

const SIDE = 8;
const TOP = 30;
const BELOW = 30;

/**
 * One turn of the pedals, drawn to scale: the bike stands with a pedal
 * straight down, as the commissaire sets it, turns the cranks once and
 * rolls its rollout along a ruler in metres, past or short of the
 * class's limit. A faint bike stays where it started. The distance is
 * counted as it rolls; how far past the limit is said in words beside
 * the drawing, never by its colour alone.
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
  const from = -BIKE_BEHIND_M - 0.1;
  const to = Math.max(8, Math.ceil(Math.max(rollout + BIKE_AHEAD_M, (limit ?? 0) + 0.8)));
  const scale = (width - 2 * SIDE) / (to - from);
  const X = (m: number) => SIDE + (m - from) * scale;
  const ground = TOP + BIKE_HEIGHT_M * scale + 6;
  const height = ground + BELOW;

  const travelled = progress * rollout;
  const step = scale < 30 ? 2 : 1;
  const ticks = Array.from({ length: Math.floor(to - 0.4) + 1 }, (_, m) => m).filter(
    (m) => m % step === 0,
  );
  const limitAnchor = limit !== null && X(limit) > width - 90 ? "end" : "middle";

  return (
    <figure className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div aria-hidden className="flex flex-col">
          <span className="text-3xl font-semibold tabular-nums">
            {t("distance", { m: num(travelled, locale, 2) })}
          </span>
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
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={
            limit === null
              ? t("labelFree", { rollout: num(rollout, locale, 2), turns: num(turns, locale, 2) })
              : t("label", {
                  rollout: num(rollout, locale, 2),
                  turns: num(turns, locale, 2),
                  class: className,
                  limit: num(limit, locale, 2),
                })
          }
          className="block"
        >
          <line
            x1={SIDE}
            x2={width - SIDE}
            y1={ground}
            y2={ground}
            stroke="var(--input)"
            strokeWidth={1.5}
          />
          {ticks.map((m) => (
            <g key={m}>
              <line
                x1={X(m)}
                x2={X(m)}
                y1={ground}
                y2={ground + (m === 0 ? 10 : 6)}
                stroke={m === 0 ? "var(--foreground)" : "var(--input)"}
                strokeWidth={m === 0 ? 2 : 1}
              />
              <text
                x={X(m)}
                y={ground + 22}
                textAnchor="middle"
                className={
                  m === 0 ? "fill-foreground text-2xs font-semibold" : "fill-meta text-2xs"
                }
              >
                {m === ticks.at(-1) ? t("metres", { m }) : m}
              </text>
            </g>
          ))}
          <line
            x1={X(0)}
            x2={X(limit === null ? travelled : Math.min(travelled, limit))}
            y1={ground + 3}
            y2={ground + 3}
            stroke="var(--primary)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          {limit !== null && travelled > limit && (
            <line
              x1={X(limit)}
              x2={X(travelled)}
              y1={ground + 3}
              y2={ground + 3}
              stroke="var(--destructive)"
              strokeWidth={4}
              strokeLinecap="round"
            />
          )}
          {limit !== null && (
            <g>
              <line
                x1={X(limit)}
                x2={X(limit)}
                y1={TOP - 6}
                y2={ground + 8}
                stroke="var(--destructive)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              <text
                x={X(limit) + (limitAnchor === "end" ? 4 : 0)}
                y={TOP - 12}
                textAnchor={limitAnchor}
                className="fill-destructive text-2xs font-semibold"
              >
                {t("limit", { class: className, limit: num(limit, locale, 2) })}
              </text>
            </g>
          )}
          <g opacity={0.22}>
            <RolloutBike
              x={X(0)}
              ground={ground}
              scale={scale}
              circumferenceMm={circumferenceMm}
              ring={ring}
              cog={cog}
              wheelDeg={0}
              crankDeg={0}
            />
          </g>
          <RolloutBike
            x={X(travelled)}
            ground={ground}
            scale={scale}
            circumferenceMm={circumferenceMm}
            ring={ring}
            cog={cog}
            wheelDeg={progress * turns * 360}
            crankDeg={progress * 360}
          />
        </svg>
      </div>
      <figcaption className="text-meta text-2sm leading-relaxed">{t("caption")}</figcaption>
    </figure>
  );
}
