"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/workouts/number-field";
import { setThresholdsAction } from "@/modules/team/actions";

type Thresholds = {
  ftpWatts: number | null;
  thresholdHr: number | null;
  maxHr: number | null;
  restingHr: number | null;
  thresholdsOn: string | null;
};

/**
 * A rider's thresholds: what the zones are worked out from, so a session
 * written in zones reads as watts and pulse for this rider. The coach or
 * the rider sets them, with the date of the test they came from.
 */
export function ThresholdsForm({
  riderId,
  initial,
  today,
}: {
  riderId: string;
  initial: Thresholds;
  today: string;
}) {
  const t = useTranslations("riders.thresholds");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const dateId = useId();
  const [value, setValue] = useState(initial);
  const set = <K extends keyof Thresholds>(key: K, v: Thresholds[K]) =>
    setValue((current) => ({ ...current, [key]: v }));
  const numbers = [
    ["ftpWatts", t("ftp"), "W"],
    ["thresholdHr", t("thresholdHr"), t("bpm")],
    ["maxHr", t("maxHr"), t("bpm")],
    ["restingHr", t("restingHr"), t("bpm")],
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              () =>
                setThresholdsAction({
                  riderId,
                  ...value,
                  thresholdsOn: value.thresholdsOn || today,
                }),
              { success: common("saved") },
            );
          }}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {numbers.map(([key, label, suffix]) => (
              <NumberField
                key={key}
                label={label}
                value={value[key]}
                max={key === "ftpWatts" ? 700 : 240}
                suffix={suffix}
                onChange={(n) => set(key, n)}
                onClear={() => set(key, null)}
              />
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={dateId} className="text-label text-xs font-medium">
              {t("date")}
            </label>
            <Input
              id={dateId}
              type="date"
              value={value.thresholdsOn ?? ""}
              className="max-sm:h-11"
              onChange={(e) => set("thresholdsOn", e.target.value || null)}
            />
          </div>
          <p className="text-meta text-xs leading-relaxed">{t("hint")}</p>
          <Button type="submit" disabled={pending} className="self-start max-sm:h-11">
            {common("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
