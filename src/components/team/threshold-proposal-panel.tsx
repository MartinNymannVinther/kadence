"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import type { RideName } from "@/modules/activities/ride-name";
import { proposedKeys } from "@/modules/load/threshold-apply";
import {
  THRESHOLD_KEYS,
  type ThresholdEstimates,
  type ThresholdKey,
} from "@/modules/load/threshold-estimate";
import { proposeThresholdsAction } from "@/modules/training/threshold-actions";
import { ThresholdProposalRow } from "./threshold-proposal-row";

/**
 * "Foreslå ud fra mine ture" (docs/adr/0094): asks for Kadence's proposal,
 * shows it number by number beside what is saved, and hands the ticked
 * numbers to the form with "Brug forslaget". It saves nothing: the form's
 * own Gem does that, when the person presses it.
 */
export function ThresholdProposalPanel({
  riderId,
  own,
  names,
  units,
  current,
  autoOpen = false,
  onUse,
}: {
  riderId: string;
  own: boolean;
  names: Record<ThresholdKey, string>;
  units: Record<ThresholdKey, string>;
  current: Record<ThresholdKey, number | null>;
  /** Open with the proposal already asked for — from a ride's "Se forslaget". */
  autoOpen?: boolean;
  onUse: (estimates: ThresholdEstimates, ticked: ThresholdKey[]) => void;
}) {
  const t = useTranslations("riders.thresholds.propose");
  const { run, pending } = useRun();
  const [estimates, setEstimates] = useState<ThresholdEstimates | null>(null);
  const [rideNames, setRideNames] = useState<Record<string, RideName>>({});
  const [ticked, setTicked] = useState<Set<ThresholdKey>>(new Set());
  const asked = useRef(false);

  async function ask() {
    const result = await run(() => proposeThresholdsAction({ riderId }), { refresh: false });
    if (!result) return;
    setEstimates(result.estimates);
    setRideNames(result.rideNames);
    setTicked(new Set(proposedKeys(result.estimates)));
  }

  useEffect(() => {
    if (!autoOpen || asked.current) return;
    asked.current = true;
    void ask();
    // Once, on the way in from a ride's page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  if (!estimates) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => void ask()}
        className="self-start max-sm:h-11"
      >
        <TrendingUp data-icon="inline-start" aria-hidden />
        {own ? t("own") : t("coach")}
      </Button>
    );
  }

  const any = proposedKeys(estimates).length > 0;
  return (
    <section
      aria-labelledby={`proposal-${riderId}`}
      className="border-border bg-muted/40 flex flex-col gap-3 rounded-xl border p-3 sm:p-4"
    >
      <div className="flex flex-col gap-1">
        <h3 id={`proposal-${riderId}`} className="text-sm font-semibold">
          {t("title")}
        </h3>
        <p className="text-meta text-2sm leading-relaxed">{any ? t("intro") : t("noneProposed")}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {THRESHOLD_KEYS.map((key) => (
          <ThresholdProposalRow
            key={key}
            name={names[key]}
            unit={units[key]}
            current={current[key]}
            estimate={estimates[key]}
            rideNames={rideNames}
            ticked={ticked.has(key)}
            onTick={(on) =>
              setTicked((was) => {
                const next = new Set(was);
                if (on) next.add(key);
                else next.delete(key);
                return next;
              })
            }
          />
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {any && (
          <Button
            type="button"
            disabled={ticked.size === 0}
            onClick={() => {
              onUse(estimates, [...ticked]);
              setEstimates(null);
            }}
            className="max-sm:h-11"
          >
            {t("use")}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={() => setEstimates(null)}
          className="max-sm:h-11"
        >
          {t("close")}
        </Button>
      </div>
    </section>
  );
}
