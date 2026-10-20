"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChoiceRadios } from "@/components/access/choice-radios";
import { Button, buttonVariants } from "@/components/ui/button";
import { authClient } from "@/core/auth/client";
import { acceptInvitationAction, acceptWithHistoryAction } from "@/core/team/actions";
import { Link, useRouter } from "@/i18n/navigation";

/**
 * Somebody signed in: accept, or sign out first when it is the wrong
 * account. A rider with a personal workspace of their own is asked "Tag
 * din træning med over på holdet?" first (docs/adr/0081), yes by default;
 * the answer goes with the accept. When the history could not move, the
 * person is on the team all the same and is told where it still is.
 */
export function AcceptForm({
  invitationId,
  mode,
  history = null,
}: {
  invitationId: string;
  mode: "accept" | "switch";
  /** The personal workspace whose training could move along, when there is one. */
  history?: { workspaceName: string } | null;
}) {
  const t = useTranslations("join");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [take, setTake] = useState<"yes" | "no">("yes");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function toToday() {
    router.push("/today");
    router.refresh();
  }

  async function accept() {
    setPending(true);
    setError(null);
    if (!history) {
      const result = await acceptInvitationAction({ invitationId });
      if (result !== "accepted") {
        setPending(false);
        setError(result === "wrongPerson" ? t("wrongPerson") : t("invalidBody"));
        return;
      }
      return toToday();
    }
    const result = await acceptWithHistoryAction({ invitationId, takeHistory: take === "yes" });
    if (!result.ok) {
      setPending(false);
      setError(t("errorGeneric"));
      return;
    }
    const { outcome } = result.data;
    if (outcome === "accepted" || outcome === "moved") return toToday();
    if (outcome === "historyStayed") {
      setPending(false);
      setNotice(
        result.data.reason === "target_has_history"
          ? t("history.stayedTargetHasHistory")
          : t("history.stayed"),
      );
      return;
    }
    setPending(false);
    setError(outcome === "wrongPerson" ? t("wrongPerson") : t("invalidBody"));
  }

  async function switchAccount() {
    setPending(true);
    await authClient.signOut();
    router.refresh();
    setPending(false);
  }

  if (notice) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p role="status">{notice}</p>
        <Link href="/today" className={buttonVariants({ variant: "default" })}>
          {t("history.continue")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      {mode === "accept" && history ? (
        <div className="flex flex-col gap-2">
          <ChoiceRadios
            legend={t("history.legend")}
            value={take}
            onChange={setTake}
            options={[
              { value: "yes", label: t("history.yes") },
              { value: "no", label: t("history.no") },
            ]}
          />
          <p className="text-meta text-2sm leading-relaxed">
            {take === "yes"
              ? t("history.body", { workspace: history.workspaceName })
              : t("history.staysBody", { workspace: history.workspaceName })}
          </p>
        </div>
      ) : null}
      {mode === "accept" ? (
        <Button type="button" onClick={accept} disabled={pending} className="w-full">
          {pending ? <Loader2 data-slot="icon" className="animate-spin" /> : null}
          {t("accept")}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={switchAccount}
          disabled={pending}
          className="w-full"
        >
          {t("switchAccount")}
        </Button>
      )}
    </div>
  );
}
