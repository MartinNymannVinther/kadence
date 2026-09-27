"use client";

import { Repeat as RepeatIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Thresholds } from "@/modules/load";
import type { BikeStructure, Step } from "@/modules/workouts/structure";
import { clockText } from "@/components/training/duration";
import { ProfileChart } from "./profile-chart";
import { zoneFill, zoneOfTarget } from "./step-zone";
import { useTargetText } from "./use-target-text";

/**
 * A bike session to ride from: the profile, then every step with its
 * length and target, in watts and beats for this rider where their
 * thresholds are known.
 */
export function BikeView({
  structure,
  rider,
}: {
  structure: BikeStructure;
  rider: Thresholds | null;
}) {
  const t = useTranslations("workouts.view");
  const needsThresholds = structure.steps.some((item) =>
    (item.kind === "step" ? [item] : item.steps).some(
      (s) => s.target.kind !== "rpe" && s.target.kind !== "open",
    ),
  );
  const missing = needsThresholds && !(rider?.ftp || rider?.thresholdHr);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ProfileChart structure={structure} />
      <ol className="flex flex-col gap-1.5">
        {structure.steps.map((item, i) =>
          item.kind === "step" ? (
            <li key={i}>
              <StepLine step={item} rider={rider} />
            </li>
          ) : (
            <li key={i} className="border-input rounded-lg border border-dashed p-2">
              <p className="text-2sm mb-1.5 flex items-center gap-1.5 font-semibold">
                <RepeatIcon aria-hidden className="size-3.5" />
                {t("repeat", { times: item.times })}
              </p>
              <ol className="flex flex-col gap-1.5">
                {item.steps.map((step, j) => (
                  <li key={j}>
                    <StepLine step={step} rider={rider} />
                  </li>
                ))}
              </ol>
            </li>
          ),
        )}
      </ol>
      {missing && <p className="text-meta text-xs leading-relaxed">{t("noThresholds")}</p>}
    </div>
  );
}

function StepLine({ step, rider }: { step: Step; rider: Thresholds | null }) {
  const t = useTranslations("workouts.view");
  const intents = useTranslations("workouts.intent");
  const targetText = useTargetText();
  const { main, detail } = targetText(step.target, rider);
  const cadence =
    step.cadenceLow || step.cadenceHigh
      ? t("cadence", {
          low: step.cadenceLow ?? step.cadenceHigh ?? 0,
          high: step.cadenceHigh ?? step.cadenceLow ?? 0,
        })
      : null;
  return (
    <div
      className="bg-card border-border grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 rounded-md border border-l-4 px-3 py-2"
      style={{ borderLeftColor: zoneFill(zoneOfTarget(step.target, step.intent)) }}
    >
      <span className="text-2sm font-semibold tabular-nums">{clockText(step.seconds)}</span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-2sm">
          <span className="font-medium">{step.label || intents(step.intent)}</span>
          <span className="text-meta"> · {main}</span>
        </span>
        {(detail || cadence) && (
          <span className="text-meta text-xs tabular-nums">
            {[detail, cadence].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>
    </div>
  );
}
