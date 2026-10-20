import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { monthLong } from "@/components/charts/format";
import { MONTH_NOTES } from "@/modules/dcu/phases";
import type { Reference } from "@/modules/paradigms";
import { DeviationChip } from "./deviation-chip";
import type { PlanMonth } from "./types";

/** A note equal to DCU's own guidance is DCU's, shown in the reader's language; anything else is the plan's. */
export function ownNote(month: PlanMonth): string {
  const note = month.note.trim();
  return note && note !== MONTH_NOTES[month.month] ? note : "";
}

/**
 * One month of the season plan, read: the coach's goal beside what is
 * planned in the calendar, what was done and DCU's hours (ADR 0040), the
 * goal's deviation from DCU in words, the phase, DCU's guidance for the
 * month, and the plan's own note if it has one.
 */
export function MonthRow({
  month,
  dcu,
  reference = "dcu",
  ridden,
  scheduled,
}: {
  month: PlanMonth;
  /** Null when the team plans without DCU (ADR 0049). */
  dcu: number | null;
  /** Whose hours `dcu` is: DCU's, or a senior's profile's, which has no month notes (ADR 0091). */
  reference?: Reference;
  ridden: number | null;
  scheduled: number | null;
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
          {scheduled !== null && (
            <div className="flex items-baseline gap-1.5">
              <dt className="text-meta">{t("scheduled")}</dt>
              <dd className="tabular-nums">{hours(scheduled)}</dd>
            </div>
          )}
          {ridden !== null && (
            <div className="flex items-baseline gap-1.5">
              <dt className="text-meta">{t("ridden")}</dt>
              <dd className="tabular-nums">{hours(ridden)}</dd>
            </div>
          )}
          {dcu !== null && (
            <>
              <div className="flex items-baseline gap-1.5">
                <dt className="text-meta">{t("dcu", { ref: reference })}</dt>
                <dd className="tabular-nums">{hours(dcu)}</dd>
              </div>
              <div>
                <dt className="sr-only">{t("deviationLabel", { ref: reference })}</dt>
                <dd>
                  <DeviationChip planned={month.hours} dcu={dcu} reference={reference} />
                </dd>
              </div>
            </>
          )}
        </dl>
        {dcu !== null && reference === "dcu" && (
          <p className="text-meta text-xs leading-relaxed">
            <span className="font-medium">{t("dcuSays")}</span>{" "}
            {t(`monthNote.${month.month}` as "monthNote.1")}
          </p>
        )}
        {note && (
          <p className="text-2sm leading-relaxed">
            <span className="text-meta font-medium">{t("ownNote")}:</span> {note}
          </p>
        )}
      </div>
    </li>
  );
}
