"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { SwitchRow } from "@/components/team/switch-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setWeekMailAction } from "@/modules/push/actions";

/**
 * "Ugen på mail" under Settings → Profil (docs/adr/0086): a parent's
 * choice to get the Sunday "der er nyt om ugen" by mail too, beside the
 * push (ADR 0060). For the account, not for a browser, so it works
 * without push; the mail carries a link and nothing about the child.
 */
export function WeekMailCard({ initial, email }: { initial: boolean; email: string | null }) {
  const t = useTranslations("reminders.weekMail");
  const states = useTranslations("reminders");
  const { run, pending } = useRun();
  const [on, setOn] = useState(initial);

  async function choose(next: boolean) {
    const before = on;
    setOn(next);
    const saved = await run(() => setWeekMailAction({ on: next }), { refresh: false });
    setOn(saved ? saved.on : before);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SwitchRow
          label={t("label")}
          hint={email ? t("hint", { email }) : t("hintPlain")}
          checked={on}
          disabled={pending}
          stateText={on ? states("switchOn") : states("switchOff")}
          onChange={(next) => void choose(next)}
        />
      </CardContent>
    </Card>
  );
}
