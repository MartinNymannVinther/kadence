"use client";

import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { removeGuardianAction } from "@/modules/team/actions";
import { GuardianBadge } from "./guardian-badge";

/**
 * A parent's links to their children and where each stands. Until the
 * rider has confirmed, the database does not even tell the parent the
 * child's name here — the row says who it waits for instead.
 */
export function MyChildren({
  links,
}: {
  links: Array<{ guardianId: string; name: string | null; confirmed: boolean }>;
}) {
  const t = useTranslations("settings.me.children");
  const { run } = useRun();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-hairline flex flex-col divide-y">
          {links.map((child) => (
            <li
              key={child.guardianId}
              className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
            >
              <span className="text-sm font-semibold">{child.name ?? t("unnamed")}</span>
              <span className="flex items-center gap-2">
                <GuardianBadge state={child.confirmed ? "confirmed" : "waiting"} />
                <ConfirmButton
                  title={t("removeTitle")}
                  body={t("removeBody")}
                  confirmLabel={t("remove")}
                  variant="ghost"
                  onConfirm={() =>
                    run(() => removeGuardianAction({ guardianId: child.guardianId }))
                  }
                >
                  {t("remove")}
                </ConfirmButton>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
