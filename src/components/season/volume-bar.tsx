"use client";

import { useLocale, useTranslations } from "next-intl";
import { LegendKey, type LegendItem } from "@/components/charts/chart-legend";
import { num } from "@/components/charts/format";
import { cn } from "@/lib/utils";
import { dcuState, type Volume } from "@/modules/season/volume";

/**
 * The four numbers on one bar (ADR 0040), drawn the same wherever they
 * stand — the calendar's week, the team's rows, the season's months. A
 * bullet bar: DCU's corridor as the band behind, the coach's goal as an
 * upright marker, the planned hours as an outline and the done hours
 * filling it. The bar is a picture of the numbers beside it, never the
 * only place they are: every value is also written out, with a key drawn
 * like its mark.
 */

const DONE = "var(--series-2)";
const GOAL = "var(--series-1)";
const BAND = "var(--accent)";

const MARKS: Record<"done" | "planned" | "goal" | "dcu", Pick<LegendItem, "mark" | "color">> = {
  done: { mark: "bar", color: DONE },
  planned: { mark: "outline", color: DONE },
  goal: { mark: "marker", color: GOAL },
  dcu: { mark: "band", color: BAND },
};

function Track({ volume, className }: { volume: Volume; className?: string }) {
  const top =
    Math.max(
      1,
      volume.dcu?.high ?? 0,
      volume.goal ?? 0,
      volume.planned,
      volume.done,
      volume.expected,
    ) * 1.1;
  const pct = (v: number) => `${Math.min(100, (Math.max(0, v) / top) * 100)}%`;
  return (
    <div aria-hidden className={cn("bg-secondary relative rounded-full", className)}>
      {volume.dcu && volume.dcu.high > 0 && (
        <span
          className="absolute inset-y-0 rounded-full"
          style={{
            left: pct(volume.dcu.low),
            width: `calc(${pct(volume.dcu.high)} - ${pct(volume.dcu.low)})`,
            background: BAND,
          }}
        />
      )}
      {volume.planned > 0 && (
        <span
          className="absolute inset-y-0 left-0 rounded-full border-2"
          style={{ width: pct(volume.planned), borderColor: DONE }}
        />
      )}
      {volume.done > 0 && (
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: pct(volume.done), background: DONE }}
        />
      )}
      {volume.goal !== null && volume.goal > 0 && (
        <span
          className="absolute -inset-y-1 w-[3px] rounded-full ring-2 ring-[var(--card)]"
          style={{ left: `calc(${pct(volume.goal)} - 1.5px)`, background: GOAL }}
        />
      )}
    </div>
  );
}

export function VolumeBar({
  volume,
  compact = false,
  className,
}: {
  volume: Volume;
  /** One short line under a thin bar, for a row in the team's week. */
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("volume");
  const locale = useLocale();
  const h = (v: number) => num(v, locale, 1);
  const dcu = volume.dcu && volume.dcu.high > 0 ? volume.dcu : null;
  // A DCU number of nothing is October's "pause + frit", not a class without hours.
  const dcuText = dcu
    ? t("range", { low: h(dcu.low), high: h(dcu.high) })
    : volume.dcu
      ? t("dcuBreak")
      : t("noDcu");
  const goalText = volume.goal !== null ? t("hours", { hours: h(volume.goal) }) : t("noGoal");
  const said = t("said", {
    done: h(volume.done),
    planned: h(volume.planned),
    goal: goalText,
    dcu: dcuText,
  });

  if (compact)
    return (
      <div className={cn("flex min-w-0 flex-col gap-1", className)}>
        <Track volume={volume} className="h-2" />
        <p aria-hidden className="text-xs font-medium tabular-nums">
          {t("compact", { done: h(volume.done), planned: h(volume.planned) })}
        </p>
        <p aria-hidden className="text-meta truncate text-2xs tabular-nums">
          {[
            volume.goal !== null ? t("goalShort", { hours: h(volume.goal) }) : null,
            dcu
              ? t("dcuShort", { low: h(dcu.low), high: h(dcu.high) })
              : volume.dcu
                ? t("dcuBreak")
                : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <span className="sr-only">{said}</span>
      </div>
    );

  const state = dcuState(volume);
  const off = volume.goal !== null ? volume.expected - volume.goal : null;
  const near = off !== null && Math.abs(off) <= Math.max(0.5, (volume.goal ?? 0) * 0.1);
  const verdict = [
    state ? t(`state.${state}`) : null,
    off === null
      ? null
      : near
        ? t("toGoal.on")
        : t(off > 0 ? "toGoal.over" : "toGoal.under", { hours: h(Math.abs(off)) }),
  ].filter(Boolean);
  const items = [
    { key: "done", value: t("hours", { hours: h(volume.done) }) },
    { key: "planned", value: t("hours", { hours: h(volume.planned) }) },
    { key: "goal", value: goalText },
    { key: "dcu", value: dcuText },
  ] as const;

  return (
    <div className={cn("flex min-w-0 flex-col gap-2.5", className)}>
      <Track volume={volume} className="mt-1 h-3" />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-2sm sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.key} className="flex min-w-0 items-center gap-1.5">
            <LegendKey {...MARKS[item.key]} />
            <dt className="text-meta">{t(item.key)}</dt>
            <dd className="font-medium tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
      {verdict.length > 0 && (
        <p className="text-meta text-xs leading-relaxed">
          {t("expected", { hours: h(volume.expected) })} {verdict.join(", ")}.
        </p>
      )}
    </div>
  );
}
