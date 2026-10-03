"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { useRun } from "@/components/common/use-run";
import { removeRoundAction } from "@/modules/club/actions";

/** A round taken out again, results and all, behind one question. */
export function RemoveRound({ roundId }: { roundId: string }) {
  const t = useTranslations("club.round");
  const { run } = useRun();
  return (
    <ConfirmButton
      variant="ghost"
      title={t("removeTitle")}
      body={t("removeBody")}
      confirmLabel={t("remove")}
      onConfirm={() => run(() => removeRoundAction({ roundId }), { success: t("removed") })}
    >
      <Trash2 data-icon="inline-start" />
      {t("remove")}
    </ConfirmButton>
  );
}
