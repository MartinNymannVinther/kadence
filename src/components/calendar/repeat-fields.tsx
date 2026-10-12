"use client";

import { useId, useState } from "react";
import { BarChart3, CircleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { PlanPreview } from "@/components/season/plan-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dayMonth, weekdayShort } from "@/components/training/day-label";
import { addDaysIso, weekNumber } from "@/core/dates";
import { isSeniorBasis, type SeniorBasis } from "@/modules/paradigms";
import { previewSessionsAction } from "@/modules/season/actions";
import type { RiderPlanPreview } from "@/modules/season/preview";
import {
  isoWeekday,
  MAX_REPEAT_WEEKS,
  MAX_SERIES_ROWS,
  repeatDates,
  repeatProblem,
  strengthNotes,
  WEEKDAYS,
  type Repeat,
} from "@/modules/training/recurrence";
import { cn } from "@/lib/utils";
import type { RiderOption } from "./types";

/** The adults' profile when every chosen rider is on the same one; else none. */
function commonProfile(chosen: RiderOption[]): SeniorBasis | null {
  const first = chosen[0]?.basis;
  return isSeniorBasis(first) && chosen.every((r) => r.basis === first) ? first : null;
}

/** A Monday to name the weekdays from: 1 is Monday, 7 Sunday. */
const A_MONDAY = "2026-01-05";
const dayOf = (weekday: number) => addDaysIso(A_MONDAY, weekday - 1);

/**
 * "Gentag" (ADR 0041): the same session on chosen weekdays from the
 * chosen day until a last one — every Tuesday and Thursday through the
 * winter. Says how many sessions it makes, what the guardrails would say
 * about a strength series, and — for a bike series — what it does to each
 * rider's hours against the season plan before anything is made. When
 * every rider chosen is an adult on the same training profile, a strength
 * series is measured against the profile's rhythm (ADR 0092).
 */
export function RepeatFields({
  start,
  sport,
  plannedMinutes,
  riderIds,
  riders = [],
  value,
  onChange,
}: {
  start: string;
  sport: string | null;
  plannedMinutes: number;
  riderIds: string[];
  /** The riders to choose from, with their basis where the page knows it. */
  riders?: RiderOption[];
  value: Repeat | null;
  onChange: (value: Repeat | null) => void;
}) {
  const t = useTranslations("calendar.repeat");
  const locale = useLocale();
  const id = useId();
  const { run, pending } = useRun();
  const [preview, setPreview] = useState<RiderPlanPreview[] | null>(null);
  const change = (next: Repeat | null) => {
    setPreview(null);
    onChange(next);
  };

  const problem = value ? repeatProblem(start, value) : null;
  const days = value && !problem ? repeatDates(start, value) : [];
  const total = days.length * Math.max(1, riderIds.length);
  const profile = commonProfile(riders.filter((r) => riderIds.includes(r.id)));
  const notes =
    value && !problem && sport === "strength" ? strengthNotes(start, value, profile) : [];
  const day = (weekday: number) => weekdayShort(dayOf(weekday), locale);

  async function look() {
    const result = await run(
      () =>
        previewSessionsAction({
          riderIds,
          sessions: days.map((onDate) => ({ onDate, sport: "bike", plannedMinutes })),
        }),
      { refresh: false },
    );
    if (result) setPreview(result);
  }

  return (
    <fieldset className="border-border flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      <legend className="sr-only">{t("toggle")}</legend>
      <label className="flex min-h-9 items-center gap-2 text-sm font-medium max-sm:min-h-11">
        <input
          type="checkbox"
          className="accent-primary size-4"
          checked={value !== null}
          onChange={(e) =>
            change(
              e.target.checked
                ? { weekdays: [isoWeekday(start)], until: addDaysIso(start, 8 * 7 - 1) }
                : null,
            )
          }
        />
        {t("toggle")}
      </label>
      {value && (
        <>
          <div role="group" aria-label={t("weekdays")} className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((weekday) => {
              const on = value.weekdays.includes(weekday);
              return (
                <button
                  key={weekday}
                  type="button"
                  aria-pressed={on}
                  className={cn(
                    "focus-ring min-w-11 rounded-md border px-2.5 py-1.5 text-2sm first-letter:uppercase max-sm:min-h-11",
                    on
                      ? "border-primary bg-primary text-primary-foreground font-semibold"
                      : "border-border bg-card hover:bg-accent",
                  )}
                  onClick={() =>
                    change({
                      ...value,
                      weekdays: on
                        ? value.weekdays.filter((w) => w !== weekday)
                        : [...value.weekdays, weekday].sort((a, b) => a - b),
                    })
                  }
                >
                  {day(weekday)}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-until`} className="text-sm font-medium">
              {t("until")}
            </label>
            <Input
              id={`${id}-until`}
              type="date"
              required
              min={start}
              max={addDaysIso(start, MAX_REPEAT_WEEKS * 7 - 1)}
              value={value.until}
              className="max-w-48 max-sm:h-11"
              onChange={(e) => change({ ...value, until: e.target.value })}
            />
          </div>
          <p className="text-2sm" role="status">
            {value.weekdays.length === 0
              ? t("problem.empty")
              : problem
                ? t(`problem.${problem}`, { weeks: MAX_REPEAT_WEEKS })
                : total > MAX_SERIES_ROWS
                  ? t("problem.tooMany")
                  : riderIds.length > 1
                    ? t("summaryRiders", { count: days.length, total })
                    : t("summary", { count: days.length })}
          </p>
          {notes.map((note) => (
            <p
              key={note.kind}
              className="bg-sticky text-sticky-ink flex gap-2 rounded-md px-3 py-2 text-2sm leading-relaxed"
            >
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {note.kind === "close"
                ? note.profile
                  ? t("closeProfile", { first: day(note.first), second: day(note.second) })
                  : t("close", { first: day(note.first), second: day(note.second) })
                : t(note.profile ? "tooManyStrengthProfile" : "tooManyStrength", {
                    week: weekNumber(note.from),
                    date: dayMonth(note.from, locale),
                    max: note.max,
                    perWeek: note.perWeek,
                    profile: note.profile ?? "",
                  })}
            </p>
          ))}
          <p className="text-meta text-xs leading-relaxed">{t("hint")}</p>
          {sport === "bike" && plannedMinutes > 0 && days.length > 0 && riderIds.length > 0 && (
            <>
              {!preview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending || total > MAX_SERIES_ROWS}
                  className="self-start max-sm:h-11"
                  onClick={() => void look()}
                >
                  <BarChart3 data-icon="inline-start" />
                  {t("preview")}
                </Button>
              )}
              {preview && <PlanPreview previews={preview} period="month" />}
            </>
          )}
        </>
      )}
    </fieldset>
  );
}
