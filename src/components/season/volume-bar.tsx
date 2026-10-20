"use client";

import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { cn } from "@/lib/utils";
import { referenceOf } from "@/modules/paradigms";
import type { Volume } from "@/modules/season/volume";

/**
 * The four numbers on one small bar (ADR 0040, named as in ADR 0062),
 * drawn the same wherever a row is short of room — a rider's row in the
 * team's week, the season page's months, the plan's preview. A bullet
 * bar: DCU's corridor as the band behind, the season plan as an upright
 * marker, the hours put in the calendar as an outline and the hours
 * ridden filling it. For a senior the band is the training profile's, and
 * the words say so (docs/adr/0091). Under it the numbers in a short line,
 * and all of them for a screen reader. The calendar's week for one rider
 * has room for a row per number and shows them so (volume-rows.tsx,
 * docs/adr/0104), in the same marks.
 */

const DONE = "var(--series-2)";
const GOAL = "var(--series-1)";
const BAND = "var(--accent)";

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

export function VolumeBar({ volume, className }: { volume: Volume; className?: string }) {
  const t = useTranslations("volume");
  const locale = useLocale();
  const h = (v: number) => num(v, locale, 1);
  const ref = referenceOf(volume.basis);
  const dcu = volume.dcu && volume.dcu.high > 0 ? volume.dcu : null;
  // A DCU number of nothing is October's "pause + frit", not a class without hours.
  const dcuText = dcu
    ? t("range", { low: h(dcu.low), high: h(dcu.high) })
    : volume.dcu
      ? t("dcuBreak", { ref })
      : t("noDcu");
  const goalText = volume.goal !== null ? t("hours", { hours: h(volume.goal) }) : t("noGoal");
  const said = t("said", {
    done: h(volume.done),
    planned: h(volume.planned),
    goal: goalText,
    dcu: dcuText,
    ref,
  });

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <Track volume={volume} className="h-2" />
      <p aria-hidden className="text-xs font-medium tabular-nums">
        {t("compact", { done: h(volume.done), planned: h(volume.planned) })}
      </p>
      {/* Two short items that wrap onto two lines in a narrow column rather than cut off. */}
      <p aria-hidden className="text-meta flex flex-wrap gap-x-2.5 text-2xs tabular-nums">
        {[
          volume.goal !== null ? t("goalShort", { hours: h(volume.goal) }) : null,
          dcu
            ? t("dcuShort", { low: h(dcu.low), high: h(dcu.high), ref })
            : volume.dcu
              ? t("dcuBreak", { ref })
              : null,
        ]
          .filter(Boolean)
          .map((item) => (
            <span key={item} className="whitespace-nowrap">
              {item}
            </span>
          ))}
      </p>
      <span className="sr-only">{said}</span>
    </div>
  );
}
