"use client";

import { useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { confirmGuardianAction, removeGuardianAction } from "@/modules/team/actions";
import { GuardianBadge } from "./guardian-badge";
import type { GuardianState } from "./guardian-state";

export type MyGuardian = { id: string; name: string; relation: string; state: GuardianState };

/**
 * The rider's parents, and the rider's yes to each (ADR 0011): nothing is
 * shown to a parent before it, and from the year the rider turns 18 the
 * yes is given again, as an adult, or the link lapses.
 */
export function MyGuardians({ guardians }: { guardians: MyGuardian[] }) {
  const t = useTranslations("settings.me.guardians");
  const relations = useTranslations("riders.relation");
  const { run, pending } = useRun();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </CardHeader>
      <CardContent>
        {guardians.length === 0 ? (
          <p className="text-meta text-2sm">{t("empty")}</p>
        ) : (
          <ul className="divide-hairline flex flex-col divide-y">
            {guardians.map((g) => (
              <li key={g.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">{g.name}</span>
                    <span className="text-meta text-xs">{relations(g.relation as "mother")}</span>
                  </span>
                  <GuardianBadge
                    state={g.state}
                    label={
                      g.state === "waiting"
                        ? t("waiting")
                        : g.state === "lapsed"
                          ? t("lapsed")
                          : undefined
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(g.state === "waiting" || g.state === "lapsed") && (
                    <Button
                      size="sm"
                      className="max-sm:h-11"
                      disabled={pending}
                      onClick={() =>
                        run(() => confirmGuardianAction({ guardianId: g.id }), {
                          success: t("confirmed", { name: g.name }),
                        })
                      }
                    >
                      {g.state === "lapsed" ? t("confirmAdult") : t("confirm")}
                    </Button>
                  )}
                  <ConfirmButton
                    title={t("removeTitle", { name: g.name })}
                    body={t("removeBody")}
                    confirmLabel={t("remove")}
                    variant="ghost"
                    onConfirm={() => run(() => removeGuardianAction({ guardianId: g.id }))}
                  >
                    {t("remove")}
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
