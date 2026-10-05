"use client";

import { Play, Square } from "lucide-react";
import { useCallback, useId } from "react";
import { useTranslations } from "next-intl";
import { useWidth } from "@/components/charts/use-width";
import { Button } from "@/components/ui/button";
import type { Lane, LaneCheck, Mood, PlanCheck } from "@/modules/calc/fuel-check";
import { cn } from "@/lib/utils";
import { EnergyRider, RIDER_WIDTH } from "./energy-rider";
import type { RiderLook } from "./energy-rider-head";
import { useRacePlayback } from "./use-race-playback";

/** An hour's share of the road and of the board below it; a short last hour keeps room to drop in. */
export const laneWeight = (lane: Lane) => Math.max(0.5, (lane.toMin - lane.fromMin) / 60);

/** The sky follows the temperature; light and dark each have their own. */
const SKY = {
  cold: "[--sky-top:#b9c8d6] [--sky-low:#eef2f6] dark:[--sky-top:#25323e] dark:[--sky-low:#3b4955]",
  mild: "[--sky-top:#8ccbec] [--sky-low:#e4f4fb] dark:[--sky-top:#1b3850] dark:[--sky-low:#33566c]",
  hot: "[--sky-top:#ffc861] [--sky-low:#fff0c7] dark:[--sky-top:#5e4119] dark:[--sky-low:#87602c]",
} as const;
const LAND =
  "[--hill-far:#a8d39e] [--hill-near:#83bd7b] [--road:#8b9097] dark:[--hill-far:#2d4f34] dark:[--hill-near:#3b6643] dark:[--road:#4b5058]";

/** A tired rider turns the cranks slower. */
const CADENCE: Record<Mood, number> = {
  good: 1,
  slosh: 0.8,
  hungry: 0.75,
  thirsty: 0.7,
  stomach: 0.6,
  empty: 0.4,
};

function laneTone(check: LaneCheck): string {
  if (check.carbState === "gut" || check.carbState === "under" || check.fluidState === "under")
    return "#c4492f";
  if (check.carbState === "over" || check.fluidState !== "ok") return "#e8a020";
  return "#4a6b53";
}

/**
 * The race as a road from start to finish, an hour post at the end of
 * each hour and the rider on it. At rest the rider waits at the start
 * while the plan is empty and stands over the line once it is not, with
 * the look of the last hour — arms in the air when every hour is on
 * target. "Kør løbet" rides the race in a few seconds, the look changing
 * hour by hour, the cranks slower when it goes badly. A line under the
 * road says the look in words, so nothing rests on the drawing alone.
 */
export function EnergyScene({
  check,
  empty,
  celsius,
}: {
  check: PlanCheck;
  empty: boolean;
  celsius: number;
}) {
  const t = useTranslations("calculators.energy.builder.scene");
  const sky = `sky-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const { ref, width } = useWidth<HTMLDivElement>();
  const lanes = check.lanes;
  const minutes = lanes.at(-1)?.lane.toMin ?? 60;
  const hot = celsius >= 25;
  const weather = hot ? "hot" : celsius < 8 ? "cold" : "mild";

  const laneAt = useCallback(
    (p: number) => {
      const at = p * minutes;
      return lanes.find((c) => at <= c.lane.toMin) ?? lanes.at(-1)!;
    },
    [lanes, minutes],
  );
  const cadence = useCallback(
    (p: number) => (empty ? 1 : CADENCE[laneAt(p).mood]),
    [empty, laneAt],
  );
  const { progress, crankDeg, play, stop, playing } = useRacePlayback(minutes / 60, cadence);

  const scale = Math.min(1.15, Math.max(0.68, width / 620));
  const height = Math.round(72 + 104 * scale);
  const ground = height - 22;
  const half = (RIDER_WIDTH / 2) * scale;
  const weights = lanes.map((c) => laneWeight(c.lane));
  const sum = weights.reduce((a, b) => a + b, 0);
  const edges = weights.reduce<number[]>(
    (acc, w) => [...acc, (acc.at(-1) ?? 0) + (w / sum) * width],
    [],
  );

  const xAt = (p: number) => {
    const c = laneAt(p);
    const i = c.lane.index;
    const from = i === 0 ? 0 : edges[i - 1]!;
    const share = (p * minutes - c.lane.fromMin) / (c.lane.toMin - c.lane.fromMin);
    return from + Math.min(1, Math.max(0, share)) * (edges[i]! - from);
  };
  /** The rider waits with the rear wheel past the start post and stops with the front wheel on the line; the road between is the race. */
  const finishX = width - 14;
  const startX = 12 + half;
  const stopX = finishX - half;
  const finish = lanes.at(-1)!;
  const look: RiderLook = playing
    ? progress! < 0.04 || empty
      ? "good"
      : laneAt(progress!).mood
    : empty
      ? "ready"
      : check.podium
        ? "podium"
        : finish.mood;
  const x = playing ? startX + (xAt(progress!) / width) * (stopX - startX) : empty ? startX : stopX;
  const hour = playing ? laneAt(progress!).lane.index + 1 : null;
  const said = look === "thirsty" && hot ? "thirstyHot" : look;

  return (
    <figure className="flex flex-col gap-2">
      <div ref={ref} className={cn("w-full overflow-hidden rounded-lg", SKY[weather], LAND)}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden
          className="block"
        >
          <defs>
            <linearGradient id={sky} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--sky-top)" />
              <stop offset="1" stopColor="var(--sky-low)" />
            </linearGradient>
          </defs>
          <rect width={width} height={height} fill={`url(#${sky})`} />
          {weather !== "cold" && (
            <g transform={`translate(${Math.round(width * 0.38)} 30)`}>
              <circle r={hot ? 17 : 12} fill={hot ? "#ffb21f" : "#ffd84d"} />
              {hot &&
                Array.from({ length: 10 }, (_, i) => (
                  <line
                    key={i}
                    x1={0}
                    y1={-22}
                    x2={0}
                    y2={-29}
                    stroke="#ffb21f"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    transform={`rotate(${i * 36})`}
                  />
                ))}
            </g>
          )}
          {[0.18, 0.55, 0.82].map((f, i) => (
            <g
              key={f}
              fill="#ffffff"
              opacity={weather === "hot" ? 0.55 : 0.85}
              transform={`translate(${Math.round(f * width)} ${22 + i * 9})`}
            >
              <ellipse rx={20} ry={7} />
              <ellipse cx={12} cy={-4} rx={12} ry={7} />
              <ellipse cx={-10} cy={-2} rx={10} ry={6} />
            </g>
          ))}
          <path
            d={`M0 ${ground - 46} Q${width * 0.2} ${ground - 82} ${width * 0.42} ${ground - 50} T${width * 0.8} ${ground - 58} T${width} ${ground - 40} V${ground} H0 Z`}
            fill="var(--hill-far)"
          />
          <path
            d={`M0 ${ground - 22} Q${width * 0.3} ${ground - 48} ${width * 0.58} ${ground - 24} T${width} ${ground - 30} V${ground} H0 Z`}
            fill="var(--hill-near)"
          />
          <rect y={ground - 4} width={width} height={height - ground + 4} fill="var(--road)" />
          <line
            x1={0}
            y1={ground + 9}
            x2={width}
            y2={ground + 9}
            stroke="#ffffff99"
            strokeWidth={2}
            strokeDasharray="14 12"
          />
          {Array.from({ length: 10 }, (_, i) => (
            <rect
              key={i}
              x={finishX - 5 + (i % 2) * 5}
              y={ground - 4 + Math.floor(i / 2) * 5.2}
              width={5}
              height={5.2}
              fill={(i + Math.floor(i / 2)) % 2 ? "#ffffff" : "#2b2b33"}
            />
          ))}
          <line
            x1={width - 6}
            y1={ground - 4}
            x2={width - 6}
            y2={14}
            stroke="#2b2b33"
            strokeWidth={2}
          />
          <rect x={width - 46} y={14} width={40} height={15} rx={2} fill="#2b2b33" />
          <text
            x={width - 26}
            y={25}
            textAnchor="middle"
            fontSize={9}
            fontWeight={700}
            fill="#ffffff"
          >
            {t("finish")}
          </text>
          <line x1={6} y1={ground - 4} x2={6} y2={ground - 50} stroke="#2b2b33" strokeWidth={1.6} />
          <rect x={6} y={ground - 50} width={30} height={12} rx={2} fill="#e0533d" />
          <text
            x={21}
            y={ground - 41}
            textAnchor="middle"
            fontSize={8}
            fontWeight={700}
            fill="#ffffff"
          >
            {t("start")}
          </text>
          {lanes.slice(0, -1).map((c) => (
            <g
              key={c.lane.index}
              transform={`translate(${Math.round(edges[c.lane.index]!)} ${ground - 4})`}
            >
              <line y2={-26} stroke="#ffffff" strokeWidth={2} />
              <rect x={-12} y={-38} width={24} height={13} rx={3} fill="#ffffff" />
              <text y={-28.5} textAnchor="middle" fontSize={9} fontWeight={600} fill="#2b2b33">
                {t("post", { hours: c.lane.toMin / 60 })}
              </text>
            </g>
          ))}
          {!empty &&
            lanes.map((c) => (
              <circle
                key={c.lane.index}
                cx={Math.round(edges[c.lane.index]! - (c.lane.index === lanes.length - 1 ? 14 : 0))}
                cy={ground + 9}
                r={4.5}
                fill={laneTone(c)}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            ))}
          <EnergyRider
            x={x}
            ground={ground}
            scale={scale}
            look={look}
            crankDeg={crankDeg}
            hot={hot}
            moving={playing}
          />
        </svg>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-reading min-h-6 font-medium">
          {hour === null
            ? t(`look.${said}` as "start")
            : t("during", { hour, look: t(`look.${said}` as "start") })}
        </p>
        {playing ? (
          <Button variant="outline" size="sm" onClick={stop}>
            <Square aria-hidden />
            {t("stop")}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={play} disabled={empty}>
            <Play aria-hidden />
            {t("play")}
          </Button>
        )}
      </div>
      <figcaption className="text-meta text-2sm leading-relaxed">{t("caption")}</figcaption>
    </figure>
  );
}
