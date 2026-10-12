"use client";

import { useId, useState } from "react";
import { Sparkle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { createSeasonPlanAction } from "@/modules/season/actions";
import { isSeniorBasis } from "@/modules/paradigms";
import { BasisSelect } from "./basis-select";

/**
 * "Opret fra DCU": a season plan filled from DCU's 2025 hours for the
 * rider's class and year in it (ADR 0014), or from another class-year the
 * coach or rider picks — a rider who starts late, say. A senior starts
 * from their training profile, Kadence's own hours (docs/adr/0091).
 */
export function CreatePlan({
  riderId,
  seasonStartYear,
  riderBasis,
  guided = true,
}: {
  riderId: string;
  seasonStartYear: number;
  /** The rider's own class this season, a senior's profile, or null for a youth rider. */
  riderBasis: string | null;
  /** Whether the team plans by DCU (ADR 0049); without, the months start empty. */
  guided?: boolean;
}) {
  const t = useTranslations("season");
  const { run, pending } = useRun();
  const id = useId();
  const [basis, setBasis] = useState(riderBasis ?? "");
  const senior = guided && isSeniorBasis(riderBasis);
  return (
    <div className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5 shadow-surface">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{t("none.title")}</h2>
        <p className="text-meta text-2sm leading-relaxed">
          {t(senior ? "senior.body" : guided ? "none.body" : "none.bodyOwn")}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          {t("basisLabel")}
        </label>
        <BasisSelect
          id={id}
          value={basis}
          onChange={setBasis}
          withEmpty={!riderBasis}
          senior={isSeniorBasis(riderBasis)}
        />
        <p className="text-meta text-xs leading-relaxed">
          {senior ? t("senior.basisHint") : riderBasis ? t("basisHint") : t("noClass")}
        </p>
      </div>
      <Button
        type="button"
        className="self-start max-sm:h-11"
        disabled={pending || !basis}
        onClick={() =>
          run(() => createSeasonPlanAction({ riderId, seasonStartYear, basis }), {
            success: t(senior ? "senior.created" : "created"),
          })
        }
      >
        <Sparkle data-icon="inline-start" />
        {t(senior ? "senior.create" : guided ? "create" : "createOwn")}
      </Button>
    </div>
  );
}
