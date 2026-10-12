"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/workouts/number-field";
import { applyProposal } from "@/modules/load/threshold-apply";
import type { ThresholdKey } from "@/modules/load/threshold-estimate";
import { setThresholdsAction } from "@/modules/team/actions";
import { ThresholdInfo } from "./threshold-info";
import { ThresholdProposalPanel } from "./threshold-proposal-panel";

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
 * the rider sets them, with the date of the test they came from. Each
 * number has a short explanation beside its label, and when the rider
 * has ridden in the last year Kadence can propose the numbers from the
 * rides (docs/adr/0094) — into the fields, never saved until Gem.
 */
export function ThresholdsForm({
  riderId,
  initial,
  today,
  own = false,
  canPropose = false,
  autoPropose = false,
}: {
  riderId: string;
  initial: Thresholds;
  today: string;
  /** The rider's own form ("mine ture") rather than a coach's ("turene"). */
  own?: boolean;
  /** Whether the rider has a ride in the last year to propose from. */
  canPropose?: boolean;
  autoPropose?: boolean;
}) {
  const t = useTranslations("riders.thresholds");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const dateId = useId();
  const [value, setValue] = useState(initial);
  const [filled, setFilled] = useState(false);
  const set = <K extends keyof Thresholds>(key: K, v: Thresholds[K]) =>
    setValue((current) => ({ ...current, [key]: v }));
  const numbers = [
    ["ftpWatts", t("ftp"), "W"],
    ["thresholdHr", t("thresholdHr"), t("bpm")],
    ["maxHr", t("maxHr"), t("bpm")],
    ["restingHr", t("restingHr"), t("bpm")],
  ] as const;
  const names = Object.fromEntries(numbers.map(([k, name]) => [k, name])) as Record<
    ThresholdKey,
    string
  >;
  const units = Object.fromEntries(numbers.map(([k, , unit]) => [k, unit])) as Record<
    ThresholdKey,
    string
  >;

  return (
    <Card id="thresholds" className="scroll-mt-6">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {canPropose && (
          <ThresholdProposalPanel
            riderId={riderId}
            own={own}
            names={names}
            units={units}
            current={value}
            autoOpen={autoPropose}
            onUse={(estimates, ticked) => {
              setValue((current) => applyProposal(current, estimates, ticked, today));
              setFilled(true);
            }}
          />
        )}
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setFilled(false);
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
                labelAddon={<ThresholdInfo which={key} name={label} />}
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
          <div className="flex flex-col gap-1">
            <p className="text-meta text-xs leading-relaxed">{t("hint")}</p>
            <p role="status" className="text-primary text-2sm font-medium">
              {filled ? t("propose.filled") : ""}
            </p>
          </div>
          <Button type="submit" disabled={pending} className="self-start max-sm:h-11">
            {common("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
