"use client";

import { useId } from "react";
import { useLocale, useTranslations } from "next-intl";
import { monthLong } from "@/components/charts/format";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { PHASES } from "@/modules/dcu/phases";
import type { Reference } from "@/modules/paradigms";
import { DeviationChip } from "./deviation-chip";
import type { PlanMonth } from "./types";

/**
 * One month of the season plan, being changed: hours, phase and the
 * plan's own note, with DCU's hours and the deviation live beside them so
 * a change is never made blind.
 */
export function MonthEditor({
  month,
  dcu,
  reference = "dcu",
  onChange,
}: {
  month: PlanMonth;
  /** Null when the team plans without DCU (ADR 0049). */
  dcu: number | null;
  /** Whose hours `dcu` is: DCU's, or a senior's profile's (docs/adr/0091). */
  reference?: Reference;
  onChange: (month: PlanMonth) => void;
}) {
  const t = useTranslations("season");
  const locale = useLocale();
  const name = monthLong(month.month, locale);
  const ids = { hours: useId(), phase: useId(), note: useId() };
  return (
    <li className="grid gap-3 px-4 py-3.5 @3xl:grid-cols-[9rem_minmax(0,1fr)] @3xl:gap-5">
      <h3 className="text-sm font-semibold first-letter:uppercase @3xl:pt-7">{name}</h3>
      <div className="grid gap-3 sm:grid-cols-[7rem_minmax(0,12rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.hours} className="text-label text-xs font-medium">
            {t("hoursLabel")}
          </label>
          <Input
            id={ids.hours}
            type="number"
            inputMode="decimal"
            min={0}
            max={200}
            step="any"
            value={month.hours}
            aria-describedby={dcu === null ? undefined : `${ids.hours}-dcu`}
            className="max-sm:h-11 tabular-nums"
            onChange={(e) =>
              onChange({ ...month, hours: Math.max(0, Number(e.target.value) || 0) })
            }
          />
          {dcu !== null && (
            <span id={`${ids.hours}-dcu`} className="flex flex-col gap-1 pt-0.5">
              <span className="text-meta text-xs">
                {t("dcuHours", { hours: dcu, ref: reference })}
              </span>
              <DeviationChip planned={month.hours} dcu={dcu} reference={reference} />
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.phase} className="text-label text-xs font-medium">
            {t("phaseLabel")}
          </label>
          <NativeSelect
            id={ids.phase}
            value={month.phase}
            className="max-sm:h-11"
            onChange={(e) => onChange({ ...month, phase: e.target.value })}
          >
            {PHASES.map((phase) => (
              <option key={phase} value={phase}>
                {t(`phase.${phase}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.note} className="text-label text-xs font-medium">
            {t("noteLabel")}
          </label>
          <Input
            id={ids.note}
            value={month.note}
            maxLength={500}
            placeholder={t("notePlaceholder")}
            className="max-sm:h-11"
            onChange={(e) => onChange({ ...month, note: e.target.value })}
          />
        </div>
      </div>
    </li>
  );
}
