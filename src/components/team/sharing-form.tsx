"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setSharingAction } from "@/modules/team/actions";
import { SwitchRow } from "./switch-row";

/**
 * "Hvad dine forældre kan se" (ADR 0011): the rider's own choice, and no
 * one else's. Training is shared unless the rider says no; how the rider
 * is doing only if they say yes. The coach sees everything either way,
 * and the card says that too.
 */
export function SharingForm({
  initial,
}: {
  initial: { shareTraining: boolean; shareWellbeing: boolean };
}) {
  const t = useTranslations("settings.me.sharing");
  const common = useTranslations("common");
  const { run, pending } = useRun();
  const [value, setValue] = useState(initial);

  async function change(next: typeof value) {
    setValue(next);
    const saved = await run(() => setSharingAction(next), { success: common("saved") });
    if (saved === null) setValue(value);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </CardHeader>
      <CardContent className="divide-hairline flex flex-col divide-y">
        <SwitchRow
          label={t("training")}
          hint={t("trainingHint")}
          checked={value.shareTraining}
          disabled={pending}
          stateText={value.shareTraining ? t("on") : t("off")}
          onChange={(shareTraining) => change({ ...value, shareTraining })}
        />
        <SwitchRow
          label={t("wellbeing")}
          hint={t("wellbeingHint")}
          checked={value.shareWellbeing}
          disabled={pending}
          stateText={value.shareWellbeing ? t("on") : t("off")}
          onChange={(shareWellbeing) => change({ ...value, shareWellbeing })}
        />
        <p className="text-meta pt-3 text-xs leading-relaxed">{t("coach")}</p>
      </CardContent>
    </Card>
  );
}
