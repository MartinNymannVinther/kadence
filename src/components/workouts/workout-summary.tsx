"use client";

import { useTranslations } from "next-intl";
import { durationText } from "@/components/training/duration";
import { plannedLoad } from "@/modules/load";
import {
  EXERCISE_GROUPS,
  flattenSteps,
  structureMinutes,
  ZONES,
  type Structure,
} from "@/modules/workouts/structure";
import { zoneFill, zoneOfTarget } from "./step-zone";

/**
 * The session at a glance beside the builder on a wide screen (ADR 0044):
 * how long it takes and the load the model expects of it (ADR 0016) —
 * and for a bike session the time in each zone, for a strength session
 * the sets per group. It follows every change in the builder.
 */
export function WorkoutSummary({ structure }: { structure: Structure }) {
  const t = useTranslations("workouts.summary");
  const zones = useTranslations("training.zone");
  const groups = useTranslations("workouts.group");
  const duration = useTranslations("training.duration");
  const minutes = structureMinutes(structure);

  let detail: React.ReactNode = null;
  if (structure.kind === "bike") {
    const seconds = new Map<number | null, number>();
    for (const step of flattenSteps(structure)) {
      const zone = zoneOfTarget(step.target, step.intent);
      seconds.set(zone, (seconds.get(zone) ?? 0) + step.seconds);
    }
    const rows = [...ZONES, null]
      .map((zone) => ({ zone, seconds: seconds.get(zone) ?? 0 }))
      .filter((r) => r.seconds > 0);
    const most = Math.max(1, ...rows.map((r) => r.seconds));
    detail = rows.length > 0 && (
      <section className="flex flex-col gap-2">
        <h3 className="text-label text-xs font-medium">{t("zones")}</h3>
        <ul className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <li key={r.zone ?? "open"} className="flex flex-col gap-0.5 text-xs">
              <span className="flex justify-between gap-2">
                <span>
                  {r.zone === null ? t("open") : `Z${r.zone} ${zones(String(r.zone) as "1")}`}
                </span>
                <span className="tabular-nums">
                  {durationText(Math.round(r.seconds / 60), duration)}
                </span>
              </span>
              <span aria-hidden className="bg-secondary h-1.5 overflow-hidden rounded-full">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${(r.seconds / most) * 100}%`, background: zoneFill(r.zone) }}
                />
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  } else if (structure.kind === "strength") {
    const sets = EXERCISE_GROUPS.map((group) => ({
      group,
      sets: structure.exercises
        .filter((e) => e.group === group)
        .reduce((sum, e) => sum + e.sets, 0),
    })).filter((g) => g.sets > 0);
    detail = (
      <section className="flex flex-col gap-1.5">
        <h3 className="text-label text-xs font-medium">
          {t("exercises", { count: structure.exercises.length })}
        </h3>
        <ul className="flex flex-col gap-1 text-xs">
          {sets.map((g) => (
            <li key={g.group} className="flex justify-between gap-2">
              <span>{groups(g.group)}</span>
              <span className="tabular-nums">{t("sets", { count: g.sets })}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <aside
      aria-label={t("title")}
      className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 shadow-[var(--surface-shadow)]"
    >
      <h2 className="text-sm font-semibold">{t("title")}</h2>
      <dl className="grid grid-cols-2 gap-3 text-2sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-meta text-xs">{t("time")}</dt>
          <dd className="font-semibold tabular-nums">{durationText(minutes, duration)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-meta text-xs">{t("load")}</dt>
          <dd className="font-semibold tabular-nums">{plannedLoad(structure, minutes)}</dd>
        </div>
      </dl>
      {detail}
      <p className="text-meta text-xs leading-relaxed">{t("loadHint")}</p>
    </aside>
  );
}
