"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { InvitationLink } from "@/components/common/invitation-link";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { inviteRiderAction } from "@/modules/team/actions";
import { AccountBadge, type AccountState } from "./account-badge";

/**
 * The rider's own account: there, invited (with the link to copy again),
 * or not yet — with a field for the address to invite. The rider lands on
 * this row when they join through the link.
 */
export function RiderAccount({
  riderId,
  state,
  pending: open,
}: {
  riderId: string;
  state: AccountState;
  /** The open invitation, when there is one. */
  pending: { url: string; email: string } | null;
}) {
  const t = useTranslations("riders.accountCard");
  const { run, pending } = useRun();
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [issued, setIssued] = useState<{ url: string; email: string } | null>(null);
  const link = issued ?? open;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t("title")}
          <AccountBadge state={issued ? "invited" : state} />
        </CardTitle>
        <CardDescription>{state === "account" ? t("hasAccount") : t("body")}</CardDescription>
      </CardHeader>
      {state !== "account" && (
        <CardContent className="flex flex-col gap-4">
          {link && <InvitationLink url={link.url} email={link.email} />}
          {!link && (
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const invitation = await run(() =>
                  inviteRiderAction({ riderId, email: email.trim() }),
                );
                if (invitation) setIssued({ url: invitation.url, email: invitation.email });
              }}
            >
              <div className="flex min-w-56 flex-1 flex-col gap-1.5">
                <label htmlFor={emailId} className="text-sm font-medium">
                  {t("email")}
                </label>
                <Input
                  id={emailId}
                  type="email"
                  required
                  maxLength={320}
                  value={email}
                  className="max-sm:h-11"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={pending || !email.trim()} className="max-sm:h-11">
                {state === "expired" ? t("resend") : t("send")}
              </Button>
            </form>
          )}
        </CardContent>
      )}
    </Card>
  );
}
