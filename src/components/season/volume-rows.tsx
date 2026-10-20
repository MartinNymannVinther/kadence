"use client";

import { useLocale, useTranslations } from "next-intl";
import { BarRows, type BarRow } from "@/components/charts/bar-rows";
import { num } from "@/components/charts/format";
import { referenceOf } from "@/modules/paradigms";
import { dcuState, type Volume } from "@/modules/season/volume";

/**
 * The four numbers for one rider's week as labelled rows on one scale
 * (docs/adr/0104): Sæsonplan, Lagt ind, Kørt and the frame of DCU or the
 * training profile, each with its own bar and value, and under them where
 * the week is heading. The same marks as the compact bar (volume-bar.tsx)
 * in the team's rows and on the season page — the plan in green, put in
 * as an outline and ridden filled in brown, the frame as a pale span — so
 * a reader who has learnt the rows can read the small bar too.
 */

const DONE = "var(--series-2)";
const GOAL = "var(--series-1)";
const FRAME = "color-mix(in oklch, var(--series-1) 35%, transparent)";

export function VolumeRows({ volume }: { volume: Volume }) {
  const t = useTranslations("volume");
  const locale = useLocale();
  const h = (v: number) => num(v, locale, 1);
  const hours = (v: number) => t("hours", { hours: h(v) });
  const ref = referenceOf(volume.basis);
  const frame = volume.dcu && volume.dcu.high > 0 ? volume.dcu : null;

  const rows: BarRow[] = [
    {
      key: "goal",
      label: t("goal"),
      value: volume.goal !== null ? hours(volume.goal) : t("noGoalRow"),
      bar: volume.goal !== null ? { from: 0, to: volume.goal } : null,
      mark: "fill",
      color: GOAL,
    },
    {
      key: "planned",
      label: t("planned"),
      value: hours(volume.planned),
      bar: { from: 0, to: volume.planned },
      mark: "outline",
      color: DONE,
    },
    {
      key: "done",
      label: t("done"),
      value: hours(volume.done),
      bar: { from: 0, to: volume.done },
      mark: "fill",
      color: DONE,
    },
    {
      key: "frame",
      label: t("frame", { ref }),
      // October's "pause og frit" is a frame of nothing, not a class without hours.
      value: frame
        ? t("range", { low: h(frame.low), high: h(frame.high) })
        : volume.dcu
          ? t("breakRow")
          : t("noDcu"),
      bar: frame ? { from: frame.low, to: frame.high } : null,
      mark: "fill",
      color: FRAME,
    },
  ];

  const state = dcuState(volume);
  const off = volume.goal !== null ? volume.expected - volume.goal : null;
  const near = off !== null && Math.abs(off) <= Math.max(0.5, (volume.goal ?? 0) * 0.1);
  const verdict = [
    off === null
      ? null
      : near
        ? t("toGoal.on")
        : t(off > 0 ? "toGoal.over" : "toGoal.under", { hours: h(Math.abs(off)) }),
    state ? t(`state.${state}`, { ref }) : null,
  ].filter(Boolean);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <BarRows rows={rows} />
      {verdict.length > 0 && (
        <p className="text-meta text-xs leading-relaxed">
          {t("expected", { hours: h(volume.expected) })} {verdict.join(", ")}.
        </p>
      )}
    </div>
  );
}
