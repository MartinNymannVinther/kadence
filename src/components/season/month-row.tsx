import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { monthLong } from "@/components/charts/format";
import { MONTH_NOTES } from "@/modules/dcu/phases";
import { DeviationChip } from "./deviation-chip";
import type { PlanMonth } from "./types";

/** A note equal to DCU's own guidance is DCU's, shown in the reader's language; anything else is the plan's. */
export function ownNote(month: PlanMonth): string {
  const note = month.note.trim();
  return note && note !== MONTH_NOTES[month.month] ? note : "";
}

/**
 * One month of the season plan, read: the plan's hours beside DCU's and
 * what was ridden, the deviation in words, the phase, DCU's guidance for
 * the month, and the plan's own note if it has one.
 */
export function MonthRow({
  month,
  dcu,
  ridden,
}: {
  month: PlanMonth;
  dcu: number;
  ridden: number | null;
}) {
  const t = useTranslations("season");
  const locale = useLocale();
  const hours = (value: number) => t("hours", { hours: num(value, locale, 1) });
  const note = ownNote(month);
  return (
    <li className="grid gap-2 px-4 py-3.5 @3xl:grid-cols-[9rem_minmax(0,1fr)] @3xl:gap-5">
      <div className="flex flex-wrap items-baseline gap-x-2 @3xl:flex-col @3xl:gap-1">
        <h3 className="text-sm font-semibold first-letter:uppercase">
          {monthLong(month.month, locale)}
        </h3>
        <span className="text-meta text-xs">{t(`phase.${month.phase}` as "phase.season")}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <dl className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-2sm">
          <div className="flex items-baseline gap-1.5">
            <dt className="text-meta">{t("plan")}</dt>
            <dd className="font-semibold tabular-nums">{hours(month.hours)}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-meta">{t("dcu")}</dt>
            <dd className="tabular-nums">{hours(dcu)}</dd>
          </div>
          {ridden !== null && (
            <div className="flex items-baseline gap-1.5">
              <dt className="text-meta">{t("ridden")}</dt>
              <dd className="tabular-nums">{hours(ridden)}</dd>
            </div>
          )}
          <div>
            <dt className="sr-only">{t("deviationLabel")}</dt>
            <dd>
              <DeviationChip planned={month.hours} dcu={dcu} />
            </dd>
          </div>
        </dl>
        <p className="text-meta text-xs leading-relaxed">
          <span className="font-medium">{t("dcuSays")}</span>{" "}
          {t(`monthNote.${month.month}` as "monthNote.1")}
        </p>
        {note && (
          <p className="text-2sm leading-relaxed">
            <span className="text-meta font-medium">{t("ownNote")}:</span> {note}
          </p>
        )}
      </div>
    </li>
  );
}
