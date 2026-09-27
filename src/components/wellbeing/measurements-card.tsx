"use client";

import { useId, useState } from "react";
import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { num } from "@/components/charts/format";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { dayMonth } from "@/components/training/day-label";
import { addDaysIso } from "@/core/dates";
import { addMeasurementAction, deleteMeasurementAction } from "@/modules/wellbeing/actions";
import { GrowthChart } from "./growth-chart";

export type MeasurementRow = {
  id: string;
  measuredOn: string;
  kind: "height_cm" | "weight_kg";
  value: number;
};

/**
 * Height through the growth spurt (ADR 0013): a line of measurements, how
 * much the rider grew in the last year, and a short form to add one.
 * Weight is offered only where the team allows it for a rider under 19 —
 * the service refuses it otherwise, and the card says why.
 */
export function MeasurementsCard({
  riderId,
  today,
  rows,
  weightAllowed,
}: {
  riderId: string;
  today: string;
  rows: MeasurementRow[];
  weightAllowed: boolean;
}) {
  const t = useTranslations("measurements");
  const common = useTranslations("common");
  const locale = useLocale();
  const { run, pending } = useRun();
  const ids = { kind: useId(), value: useId(), date: useId() };
  const [kind, setKind] = useState<MeasurementRow["kind"]>("height_cm");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(today);
  const heights = rows.filter((r) => r.kind === "height_cm");
  const weights = rows.filter((r) => r.kind === "weight_kg");
  const yearAgo = heights.filter((h) => h.measuredOn <= addDaysIso(today, -300)).at(-1);
  const latest = heights.at(-1);
  const grown = yearAgo && latest ? latest.value - yearAgo.value : null;
  const unit = (row: MeasurementRow) =>
    row.kind === "height_cm"
      ? t("cm", { value: num(row.value, locale, 1) })
      : t("kg", { value: num(row.value, locale, 1) });

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const done = await run(
      () =>
        addMeasurementAction({
          riderId,
          measuredOn: date,
          kind,
          value: Number(value.replace(",", ".")),
          note: "",
        }),
      { success: common("saved") },
    );
    if (done !== null) setValue("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {grown !== null && grown > 0 && (
          <p className="text-2sm font-medium">{t("grown", { cm: num(grown, locale, 1) })}</p>
        )}
        <GrowthChart points={heights.map((h) => ({ date: h.measuredOn, value: h.value }))} />
        {rows.length === 0 ? (
          <p className="text-meta text-2sm">{t("empty")}</p>
        ) : (
          <ul className="divide-hairline flex flex-col divide-y text-2sm">
            {[...heights, ...weights]
              .sort((a, b) => b.measuredOn.localeCompare(a.measuredOn))
              .slice(0, 8)
              .map((row) => (
                <li key={row.id} className="flex min-h-11 items-center justify-between gap-3">
                  <span className="text-meta w-24 shrink-0">
                    {dayMonth(row.measuredOn, locale)}
                  </span>
                  <span className="flex-1">
                    {t(row.kind === "height_cm" ? "height" : "weight")}: {unit(row)}
                  </span>
                  <ConfirmButton
                    title={t("deleteTitle")}
                    body={t("deleteBody")}
                    confirmLabel={common("delete")}
                    variant="ghost"
                    size="icon-lg"
                    onConfirm={() => run(() => deleteMeasurementAction({ measurementId: row.id }))}
                  >
                    <Trash2 aria-hidden />
                    <span className="sr-only">
                      {t("delete", { date: dayMonth(row.measuredOn, locale) })}
                    </span>
                  </ConfirmButton>
                </li>
              ))}
          </ul>
        )}
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[auto_8rem_auto_auto] sm:items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.kind} className="text-label text-xs font-medium">
              {t("kind")}
            </label>
            <NativeSelect
              id={ids.kind}
              value={kind}
              className="max-sm:h-11"
              onChange={(e) => setKind(e.target.value as MeasurementRow["kind"])}
            >
              <option value="height_cm">{t("height")}</option>
              {weightAllowed && <option value="weight_kg">{t("weight")}</option>}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.value} className="text-label text-xs font-medium">
              {kind === "height_cm" ? t("valueCm") : t("valueKg")}
            </label>
            <Input
              id={ids.value}
              inputMode="decimal"
              required
              value={value}
              className="max-sm:h-11"
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.date} className="text-label text-xs font-medium">
              {t("date")}
            </label>
            <Input
              id={ids.date}
              type="date"
              required
              max={today}
              value={date}
              className="max-sm:h-11"
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending || !value} className="max-sm:h-11">
            {t("add")}
          </Button>
        </form>
        {!weightAllowed && <p className="text-meta text-xs leading-relaxed">{t("weightOff")}</p>}
      </CardContent>
    </Card>
  );
}
