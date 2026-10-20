"use client";

import { useLocale, useTranslations } from "next-intl";
import { dayMonthYear } from "@/components/training/day-label";
import { Link } from "@/i18n/navigation";
import { rideNameText, type RideName } from "@/modules/activities/ride-name";
import type { Estimate } from "@/modules/load/threshold-shared";

/**
 * One number in Kadence's proposal (docs/adr/0094): the proposal beside
 * what is saved now, how it was found, over which days, how sure it is,
 * and the rides it came from — or, plainly, why there is none.
 */
export function ThresholdProposalRow({
  name,
  unit,
  current,
  estimate,
  rideNames,
  ticked,
  onTick,
}: {
  name: string;
  unit: string;
  current: number | null;
  estimate: Estimate;
  /** The source rides' telling names, by id (docs/adr/0098). */
  rideNames: Record<string, RideName>;
  ticked: boolean;
  onTick: (ticked: boolean) => void;
}) {
  const t = useTranslations("riders.thresholds.propose");
  const locale = useLocale();
  const words = useTranslations("activities.names");
  const rideTitle = (s: { activityId: string | null; title: string }) => {
    const known = s.activityId ? rideNames[s.activityId] : undefined;
    return known ? rideNameText(known, words) : s.title;
  };
  const now = t("now", { value: current === null ? t("nothing") : `${current} ${unit}` });

  if (estimate.value === null) {
    return (
      <li className="border-border flex flex-col gap-1 rounded-lg border border-dashed p-3">
        <span className="flex flex-wrap items-baseline gap-x-2 text-2sm">
          <span className="font-semibold">{name}</span>
          <span className="text-meta text-xs">{now}</span>
        </span>
        {estimate.missing && (
          <span className="text-meta text-2sm leading-relaxed">
            {t(`missing.${estimate.missing}`)}
          </span>
        )}
      </li>
    );
  }

  return (
    <li>
      <label className="border-border bg-card has-checked:border-primary has-focus-visible:outline-ring flex cursor-pointer gap-3 rounded-lg border p-3 has-focus-visible:outline-2">
        <input
          type="checkbox"
          checked={ticked}
          aria-label={t("tick", { name })}
          className="accent-primary mt-0.5 size-5 shrink-0"
          onChange={(e) => onTick(e.target.checked)}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-2sm font-semibold">{name}</span>
            <span className="text-base font-semibold tabular-nums">
              {estimate.value} {unit}
            </span>
            <span className="text-meta text-xs tabular-nums">{now}</span>
          </span>
          {estimate.method && (
            <span className="text-2sm leading-relaxed">{t(`method.${estimate.method}`)}</span>
          )}
          <span className="text-meta text-xs">
            {t("window", { days: estimate.windowDays === 90 ? "d90" : "d365" })}
            {estimate.confidence && ` · ${t(`confidence.${estimate.confidence}`)}`}
          </span>
          {estimate.notes.map((note) => (
            <span key={note} className="text-meta text-xs leading-relaxed">
              {t(`note.${note}`)}
            </span>
          ))}
          {estimate.sources.length > 0 && (
            <span className="text-meta flex flex-wrap gap-x-2 text-xs">
              <span>{t("from")}</span>
              {estimate.sources.map((s) =>
                s.activityId ? (
                  <Link
                    key={s.activityId}
                    href={`/activities/${s.activityId}`}
                    className="focus-ring text-primary font-medium hover:underline"
                  >
                    {rideTitle(s) || dayMonthYear(s.onDate, locale)}
                    {rideTitle(s) ? ` (${dayMonthYear(s.onDate, locale)})` : ""}
                  </Link>
                ) : (
                  <span key={s.onDate}>
                    {t("measuredOn", { date: dayMonthYear(s.onDate, locale) })}
                  </span>
                ),
              )}
            </span>
          )}
        </span>
      </label>
    </li>
  );
}
