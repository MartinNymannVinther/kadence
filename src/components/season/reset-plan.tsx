"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { resetSeasonPlanAction } from "@/modules/season/actions";
import { isSeniorBasis, referenceOf } from "@/modules/paradigms";
import { BasisSelect } from "./basis-select";
import { basisText } from "./basis-text";

/**
 * Which of DCU's columns the plan is measured against, and the way to fill
 * the months again from another one — behind one question, since it
 * replaces the months' own changes. A senior's plan offers the two
 * training profiles too (docs/adr/0091), and says "profilen", not DCU.
 */
export function ResetPlan({ planId, basis }: { planId: string; basis: string }) {
  const t = useTranslations("season");
  const { run } = useRun();
  const id = useId();
  const [chosen, setChosen] = useState(basis);
  const name = basisText(chosen, (k, v) => t(k, v));
  const ref = referenceOf(chosen);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-label text-xs font-medium">
          {t("basisLabel")}
        </label>
        <BasisSelect id={id} value={chosen} onChange={setChosen} senior={isSeniorBasis(basis)} />
      </div>
      <ConfirmButton
        title={t("reset.title", { ref })}
        body={t("reset.body", { basis: name, ref })}
        confirmLabel={t("reset.confirm")}
        variant="outline"
        size="default"
        onConfirm={() =>
          run(() => resetSeasonPlanAction({ planId, basis: chosen }), {
            success: t("reset.done", { ref }),
          })
        }
      >
        {t("reset.button", { ref })}
      </ConfirmButton>
    </div>
  );
}
