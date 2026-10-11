"use client";

import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatDay } from "@/core/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  approveAccessRequestAction,
  declineAccessRequestAction,
  renewInvitationAction,
  type IssuedLink,
} from "@/core/access/actions";
import { invitationState } from "@/core/access/state";
import { useRouter } from "@/i18n/navigation";
import { FreshLink } from "./fresh-link";
import { InviteForm } from "./invite-form";
import { DecidedRequests } from "./decided-requests";
import { KindNote, type KindInfo } from "./kind-note";

export type RequestItem = KindInfo & {
  id: string;
  name: string;
  email: string;
  organizationName: string;
  message: string | null;
  status: "pending" | "approved" | "declined";
  createdAt: Date;
  decidedAt: Date | null;
};

export type InvitationItem = KindInfo & {
  id: string;
  email: string;
  organizationName: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

/**
 * Approve, decline, invite, and the one thing that cannot be looked up
 * later: the link (fresh-link.tsx), to copy or, with mail, to send. It is shown once, right after it is minted, because
 * only its hash is stored. "New link" mints another and retires the old.
 */
export function AccessAdmin({
  requests,
  invitations,
  mailOn,
}: {
  requests: RequestItem[];
  invitations: InvitationItem[];
  /** Whether the installation sends mail, so the link can be sent (docs/adr/0086). */
  mailOn: boolean;
}) {
  const t = useTranslations("settings.access");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [fresh, setFresh] = useState<IssuedLink | null>(null);

  const formatDate = (value: Date | string) => formatDay(new Date(value), locale);

  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending").slice(0, 10);

  // try/finally on both: an action that rejects rather than returns would
  // otherwise leave the row disabled for good, with nothing said about why.
  async function approve(id: string) {
    setBusy(id);
    try {
      const result = await approveAccessRequestAction(id);
      if (!result.ok) return void toast.error(tCommon("error"));
      setFresh(result.data);
      router.refresh();
    } catch (error) {
      console.error("access: approve failed", error);
      toast.error(tCommon("error"));
    } finally {
      setBusy(null);
    }
  }

  async function decline(id: string) {
    setBusy(id);
    try {
      const result = await declineAccessRequestAction(id);
      if (!result.ok) return void toast.error(tCommon("error"));
      toast.success(t("declinedToast"));
      router.refresh();
    } catch (error) {
      console.error("access: decline failed", error);
      toast.error(tCommon("error"));
    } finally {
      setBusy(null);
    }
  }

  async function renew(id: string) {
    setBusy(id);
    try {
      const result = await renewInvitationAction(id);
      if (!result.ok) return void toast.error(tCommon("error"));
      setFresh(result.data);
      router.refresh();
    } catch (error) {
      console.error("access: renew failed", error);
      toast.error(tCommon("error"));
    } finally {
      setBusy(null);
    }
  }

  const stateLabel = {
    open: t("stateOpen"),
    used: t("stateUsed"),
    expired: t("stateExpired"),
    revoked: t("stateRevoked"),
  } as const;

  return (
    <div className="flex flex-col gap-5">
      {fresh ? <FreshLink key={fresh.url} fresh={fresh} mailOn={mailOn} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("pendingTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("pendingEmpty")}</p>
          ) : (
            <ul className="flex flex-col">
              {pending.map((request) => (
                <li
                  key={request.id}
                  className="border-border flex flex-col gap-3 border-b py-3 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-start"
                >
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">
                      {request.name}{" "}
                      <span className="text-muted-foreground font-normal">
                        · {request.organizationName}
                      </span>
                    </p>
                    <p className="text-muted-foreground">{request.email}</p>
                    <KindNote info={request} />
                    {request.message ? (
                      <p className="mt-1.5 leading-relaxed whitespace-pre-line">
                        {request.message}
                      </p>
                    ) : null}
                    <p className="text-meta mt-1 text-xs">
                      {t("applied", { date: formatDate(request.createdAt) })}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      onClick={() => approve(request.id)}
                      disabled={busy === request.id}
                    >
                      {busy === request.id ? (
                        <Loader2 data-slot="icon" className="animate-spin" />
                      ) : (
                        <Check data-slot="icon" />
                      )}
                      {t("approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => decline(request.id)}
                      disabled={busy === request.id}
                    >
                      <X data-slot="icon" />
                      {t("decline")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <InviteForm
        onIssued={(link) => {
          setFresh(link);
          router.refresh();
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("invitationsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("invitationsEmpty")}</p>
          ) : (
            <ul className="flex flex-col">
              {invitations.map((invitation) => {
                const state = invitationState(invitation);
                return (
                  <li
                    key={invitation.id}
                    className="border-border flex items-center gap-3 border-b py-2.5 text-sm first:pt-0 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {invitation.email}{" "}
                        <span className="text-muted-foreground font-normal">
                          · {invitation.organizationName}
                        </span>
                      </p>
                      <KindNote info={invitation} />
                      <p className="text-meta text-xs">
                        {state === "used" && invitation.usedAt
                          ? t("used", { date: formatDate(invitation.usedAt) })
                          : t("expires", { date: formatDate(invitation.expiresAt) })}
                      </p>
                    </div>
                    <Badge variant={state === "open" ? "default" : "outline"}>
                      {stateLabel[state]}
                    </Badge>
                    {state === "open" || state === "expired" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === invitation.id}
                        onClick={() => renew(invitation.id)}
                      >
                        <RefreshCw data-slot="icon" />
                        {t("renew")}
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <DecidedRequests requests={decided} />
    </div>
  );
}
