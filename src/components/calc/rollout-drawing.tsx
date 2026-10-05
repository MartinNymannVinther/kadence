"use client";

import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import type { GearStatus } from "@/modules/calc/gearing";
import { BIKE_AHEAD_M, BIKE_BEHIND_M, BIKE_HEIGHT_M, RolloutBike } from "./rollout-bike";

const SIDE = 8;
/** Two rows above the bike: the limit's label, then how far under or over. */
const ROW_LIMIT = 11;
const ROW_MARGIN = 34;
const TOP = 52;
const BELOW = 30;
const PILL_H = 19;

/** The colours a margin label takes for each state; the words carry the state too. */
const PILL: Record<Exclude<GearStatus, "free">, { fill: string; ink: string }> = {
  over: { fill: "var(--destructive)", ink: "var(--card)" },
  close: { fill: "var(--sticky)", ink: "var(--sticky-ink)" },
  within: { fill: "var(--secondary)", ink: "var(--foreground)" },
};

/**
 * The ruler, the limit and the bikes, in real pixels. The limit is a solid
 * line with its value on a label; once the bike has passed it, the
 * stretch beyond is hatched, the bike is drawn in the warning ink and a
 * label says how many centimetres over. A finished turn short of the
 * limit says how many under, in yellow when it is close.
 */
export function RolloutDrawing({
  width,
  ring,
  cog,
  circumferenceMm,
  limit,
  className,
  rollout,
  turns,
  progress,
  status,
}: {
  width: number;
  ring: number;
  cog: number;
  circumferenceMm: number;
  limit: number | null;
  className: string;
  rollout: number;
  turns: number;
  progress: number;
  /** The state to mark, or null while the bike is still short of the limit. */
  status: GearStatus | null;
}) {
  const t = useTranslations("calculators.gearing.scene");
  const locale = useLocale();
  const hatch = `hatch-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const from = -BIKE_BEHIND_M - 0.1;
  const to = Math.max(8, Math.ceil(Math.max(rollout + BIKE_AHEAD_M, (limit ?? 0) + 0.8)));
  const scale = (width - 2 * SIDE) / (to - from);
  const X = (m: number) => SIDE + (m - from) * scale;
  const ground = TOP + BIKE_HEIGHT_M * scale + 6;
  const height = ground + BELOW;

  const travelled = progress * rollout;
  const over = limit !== null && travelled > limit;
  const step = scale < 30 ? 2 : 1;
  const ticks = Array.from({ length: Math.floor(to - 0.4) + 1 }, (_, m) => m).filter(
    (m) => m % step === 0,
  );
  const cm = limit === null ? 0 : Math.round(Math.abs(limit - travelled) * 100);
  const marked = limit !== null && status !== null && status !== "free" ? status : null;

  return (
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
      <defs>
        <pattern
          id={hatch}
          width={7}
          height={7}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1={0} y1={0} x2={0} y2={7} stroke="var(--destructive)" strokeWidth={2.5} />
        </pattern>
      </defs>

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
            className={m === 0 ? "fill-foreground text-2xs font-semibold" : "fill-meta text-2xs"}
          >
            {m === ticks.at(-1) ? t("metres", { m }) : m}
          </text>
        </g>
      ))}

      {limit !== null && over && (
        <rect
          x={X(limit)}
          y={ROW_MARGIN + PILL_H / 2 + 4}
          width={X(travelled) - X(limit)}
          height={ground - ROW_MARGIN - PILL_H / 2 - 4}
          fill={`url(#${hatch})`}
          opacity={0.28}
        />
      )}
      <line
        x1={X(0)}
        x2={X(limit === null ? travelled : Math.min(travelled, limit))}
        y1={ground + 3}
        y2={ground + 3}
        stroke="var(--primary)"
        strokeWidth={4}
        strokeLinecap="round"
      />
      {limit !== null && over && (
        <line
          x1={X(limit)}
          x2={X(travelled)}
          y1={ground + 3}
          y2={ground + 3}
          stroke="var(--destructive)"
          strokeWidth={5}
          strokeLinecap="round"
        />
      )}

      {limit !== null && (
        <>
          <line
            x1={X(limit)}
            x2={X(limit)}
            y1={ROW_LIMIT + PILL_H / 2}
            y2={ground + 10}
            stroke="var(--destructive)"
            strokeWidth={2}
          />
          <Pill
            x={X(limit)}
            y={ROW_LIMIT}
            width={width}
            side="centre"
            fill="var(--warning-tint)"
            ink="var(--destructive)"
            stroke="var(--destructive)"
            text={t("limit", { class: className, limit: num(limit, locale, 2) })}
          />
        </>
      )}
      {limit !== null && marked && (
        <Pill
          x={X(limit)}
          y={ROW_MARGIN}
          width={width}
          side={marked === "over" ? "right" : "left"}
          fill={PILL[marked].fill}
          ink={PILL[marked].ink}
          text={marked === "over" ? t("over", { cm }) : t("under", { cm })}
        />
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
        ink={over ? "var(--destructive)" : undefined}
      />
    </svg>
  );
}

/**
 * A label on a filled pill, centred on `x` or beside it, kept inside the
 * drawing. Its width is estimated from the text, which is near enough at
 * this size.
 */
function Pill({
  x,
  y,
  width,
  side,
  fill,
  ink,
  stroke,
  text,
}: {
  x: number;
  y: number;
  width: number;
  side: "centre" | "left" | "right";
  fill: string;
  ink: string;
  stroke?: string;
  text: string;
}) {
  const w = text.length * 6.1 + 16;
  const wanted = side === "centre" ? x - w / 2 : side === "left" ? x - w - 5 : x + 5;
  const left = Math.min(width - SIDE - w, Math.max(SIDE, wanted));
  return (
    <g>
      <rect
        x={left}
        y={y - PILL_H / 2}
        width={w}
        height={PILL_H}
        rx={PILL_H / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke ? 1 : 0}
      />
      <text
        x={left + w / 2}
        y={y + 3.8}
        textAnchor="middle"
        fill={ink}
        className="text-2xs font-semibold tabular-nums"
      >
        {text}
      </text>
    </g>
  );
}
