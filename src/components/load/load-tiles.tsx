import { useLocale, useTranslations } from "next-intl";
import { ChartLegend, LegendKey } from "@/components/charts/chart-legend";
import { dayMonthShort, num, signed } from "@/components/charts/format";
import { FATIGUE_COLOUR, FITNESS_COLOUR, FORM_COLOUR, formState } from "./form-state";
import type { LoadPoint } from "./load-chart";

/**
 * The load chart's legend and readout in one: three tiles — kondition,
 * træthed, friskhed — each with its key drawn like its mark, the day's
 * number, and for friskhed the word (rested, a little tired, tired).
 * The date stands above; when the day is ahead of today it says so, and
 * the dashed key for "efter planen" sits beside it. A pointer or the
 * arrow keys move the day; a screen reader hears one sentence (ADR 0109).
 */
export function LoadTiles({
  shown,
  ahead,
  dashed,
  race,
}: {
  shown: LoadPoint;
  /** The shown day lies after today: the numbers are the plan's, not the rider's. */
  ahead: boolean;
  /** The chart continues dashed past today. */
  dashed: boolean;
  /** The chart marks a race day. */
  race: boolean;
}) {
  const t = useTranslations("load");
  const locale = useLocale();
  const state = formState(shown.form);
  const tiles = [
    {
      key: "fitness",
      colour: FITNESS_COLOUR,
      mark: "area" as const,
      value: num(shown.fitness, locale),
      word: null,
    },
    {
      key: "fatigue",
      colour: FATIGUE_COLOUR,
      mark: "line" as const,
      value: num(shown.fatigue, locale),
      word: null,
    },
    {
      key: "form",
      colour: FORM_COLOUR,
      mark: "line" as const,
      value: signed(shown.form, locale),
      word: t(`state.${state}`),
    },
  ];
  const date = dayMonthShort(shown.date, locale);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-2sm font-medium tabular-nums">
          {ahead ? t("dateAhead", { date }) : date}
        </p>
        {(dashed || race) && (
          <ChartLegend
            items={[
              ...(dashed
                ? [{ key: "ahead", label: t("ahead"), mark: "dash" as const, color: "var(--meta)" }]
                : []),
              ...(race
                ? [
                    {
                      key: "race",
                      label: t("race"),
                      mark: "marker" as const,
                      color: "var(--foreground)",
                    },
                  ]
                : []),
            ]}
          />
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {t(ahead ? "readoutAhead" : "readout", {
          date,
          fitness: num(shown.fitness, locale),
          fatigue: num(shown.fatigue, locale),
          form: signed(shown.form, locale),
        })}
      </p>
      <dl className="grid grid-cols-3 gap-2" aria-hidden>
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className="bg-background/70 flex min-w-0 flex-col gap-0.5 rounded-lg px-2.5 py-2"
          >
            <dt className="text-meta flex items-center gap-1.5 text-xs">
              <LegendKey mark={tile.mark} color={tile.colour} />
              <span className="truncate">{t(tile.key)}</span>
            </dt>
            <dd className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-lg font-semibold tabular-nums">{tile.value}</span>
              {tile.word && <span className="text-meta text-xs">{tile.word}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
