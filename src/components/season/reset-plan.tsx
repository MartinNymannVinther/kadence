"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { resetSeasonPlanAction } from "@/modules/season/actions";
import { BasisSelect } from "./basis-select";
import { basisText } from "./basis-text";

/**
 * Which of DCU's columns the plan is measured against, and the way to fill
 * the months again from another one — behind one question, since it
 * replaces the months' own changes.
 */
export function ResetPlan({ planId, basis }: { planId: string; basis: string }) {
  const t = useTranslations("season");
  const { run } = useRun();
  const id = useId();
  const [chosen, setChosen] = useState(basis);
  const name = basisText(chosen, (k, v) => t(k, v));
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-label text-xs font-medium">
          {t("basisLabel")}
        </label>
        <BasisSelect id={id} value={chosen} onChange={setChosen} />
      </div>
      <ConfirmButton
        title={t("reset.title")}
        body={t("reset.body", { basis: name })}
        confirmLabel={t("reset.confirm")}
        variant="outline"
        size="default"
        onConfirm={() =>
          run(() => resetSeasonPlanAction({ planId, basis: chosen }), {
            success: t("reset.done"),
          })
        }
      >
        {t("reset.button")}
      </ConfirmButton>
    </div>
  );
}
