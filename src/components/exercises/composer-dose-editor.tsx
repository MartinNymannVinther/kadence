"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { SegmentedChoice } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import type { Dose } from "@/modules/exercises/types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

/**
 * One item's dose in "sammensæt dit eget" (docs/plan-ovelser-og-programmer.md):
 * time or reps, the amount, per side, and sets — the same shape the
 * contract stores (types.ts, doseSchema), edited in place.
 */
export function ComposerDoseEditor({
  dose,
  onChange,
}: {
  dose: Dose;
  onChange: (next: Dose) => void;
}) {
  const t = useTranslations("exercises.compose");
  const amountId = useId();
  const setsId = useId();
  const amount = dose.kind === "time" ? dose.seconds : dose.reps;
  const sets = dose.sets ?? 1;
  const perSide = dose.perSide ?? false;

  function setKind(kind: "time" | "reps") {
    if (kind === dose.kind) return;
    // The load, when the exercise has one, stays with the new kind.
    const load = dose.load ? { load: dose.load } : {};
    onChange(
      kind === "time"
        ? { kind: "time", seconds: clamp(amount, 5, 600), perSide, sets, ...load }
        : { kind: "reps", reps: clamp(amount, 1, 100), perSide, sets, ...load },
    );
  }

  function setAmount(value: number) {
    onChange(
      dose.kind === "time"
        ? { ...dose, seconds: clamp(value, 5, 600) }
        : { ...dose, reps: clamp(value, 1, 100) },
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <SegmentedChoice
        label={t("doseTime")}
        value={dose.kind}
        onChange={setKind}
        options={[
          { value: "time", label: t("doseTime") },
          { value: "reps", label: t("doseReps") },
        ]}
      />
      <div className="flex flex-col gap-1">
        <Label htmlFor={amountId}>{dose.kind === "time" ? t("seconds") : t("reps")}</Label>
        <NumberInput
          id={amountId}
          min={dose.kind === "time" ? 5 : 1}
          max={dose.kind === "time" ? 600 : 100}
          value={amount}
          onChange={setAmount}
          className="w-20"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={setsId}>{t("sets")}</Label>
        <NumberInput
          id={setsId}
          min={1}
          max={10}
          value={sets}
          onChange={(n) => onChange({ ...dose, sets: clamp(n, 1, 10) })}
          className="w-16"
        />
      </div>
      <Label className="min-h-10 sm:min-h-9">
        <Switch
          checked={perSide}
          onChange={(e) => onChange({ ...dose, perSide: e.target.checked })}
        />
        {t("perSide")}
      </Label>
    </div>
  );
}
