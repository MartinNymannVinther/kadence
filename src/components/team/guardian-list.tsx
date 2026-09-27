"use client";

import { useTranslations } from "next-intl";
import { InvitationLink } from "@/components/common/invitation-link";
import { useRun } from "@/components/common/use-run";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { removeGuardianAction } from "@/modules/team/actions";
import { AddGuardianDialog } from "./add-guardian-dialog";
import { GuardianBadge } from "./guardian-badge";
import type { GuardianState } from "./guardian-state";

export type GuardianView = {
  id: string;
  name: string;
  relation: string;
  state: GuardianState;
  invitation: { url: string; email: string } | null;
};

/**
 * A rider's parents and where each link stands: invited, waiting for the
 * rider's confirmation, confirmed. The coach adds and removes; only the
 * rider confirms (ADR 0011).
 */
export function GuardianList({
  riderId,
  riderName,
  guardians,
}: {
  riderId: string;
  riderName: string;
  guardians: GuardianView[];
}) {
  const t = useTranslations("riders.guardians");
  const relations = useTranslations("riders.relation");
  const common = useTranslations("common");
  const { run } = useRun();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("body")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {guardians.length === 0 ? (
          <p className="text-meta text-2sm">{t("empty")}</p>
        ) : (
          <ul className="divide-hairline flex flex-col divide-y">
            {guardians.map((g) => (
              <li key={g.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-semibold">{g.name}</span>
                    <span className="text-meta text-xs">{relations(g.relation as "mother")}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <GuardianBadge state={g.state} />
                    <ConfirmButton
                      title={t("removeTitle", { name: g.name })}
                      body={t("removeBody")}
                      confirmLabel={t("remove")}
                      variant="ghost"
                      onConfirm={() => run(() => removeGuardianAction({ guardianId: g.id }))}
                    >
                      {common("delete")}
                    </ConfirmButton>
                  </span>
                </div>
                {g.invitation && (
                  <InvitationLink url={g.invitation.url} email={g.invitation.email} />
                )}
              </li>
            ))}
          </ul>
        )}
        <div>
          <AddGuardianDialog riderId={riderId} riderName={riderName} />
        </div>
      </CardContent>
    </Card>
  );
}
