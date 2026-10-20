"use client";

import { Check, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { mailInvitationAction } from "@/modules/team/actions";

/**
 * "Send på mail" beside "Del" (docs/adr/0086), where the installation
 * sends mail: the invitation's link to the address it is bound to. The
 * browser names the invitation and nothing else; the server finds the
 * address, checks that the caller coaches the team, and sends.
 */
export function MailInvitationButton({
  invitationId,
  name,
}: {
  invitationId: string;
  name: string;
}) {
  const t = useTranslations("riders.recipients");
  const { run, pending } = useRun();
  const [sent, setSent] = useState(false);

  async function send() {
    const done = await run(() => mailInvitationAction({ invitationId }), { refresh: false });
    if (done) setSent(true);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="max-sm:h-11"
      aria-label={t("mailLabel", { name })}
      disabled={pending}
      onClick={() => void send()}
    >
      {sent ? <Check data-icon="inline-start" /> : <Mail data-icon="inline-start" />}
      {sent ? t("mailed") : t("mail")}
    </Button>
  );
}
