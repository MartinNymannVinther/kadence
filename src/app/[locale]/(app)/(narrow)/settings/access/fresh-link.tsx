"use client";

import { Check, Copy, Loader2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mailAccessInvitationAction, type IssuedLink } from "@/core/access/actions";

/**
 * The link just minted, shown once (ADR 0004): copy it, or, where the
 * installation sends mail, "Send linket" to the address it admits
 * (docs/adr/0086). The key goes back to the server, which sends it only
 * if it names an open invitation, and only to that invitation's address.
 */
export function FreshLink({ fresh, mailOn }: { fresh: IssuedLink; mailOn: boolean }) {
  const t = useTranslations("settings.access");
  const tCommon = useTranslations("common");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(fresh.url);
      toast.success(t("copiedToast"));
    } catch {
      toast.error(tCommon("error"));
    }
  }

  async function send() {
    const token = new URL(fresh.url).searchParams.get("invitation") ?? "";
    setSending(true);
    try {
      const result = await mailAccessInvitationAction(token);
      if (result.ok) {
        setSent(true);
        toast.success(t("mailedToast", { email: result.data.email }));
      } else toast.error(result.error === "rateLimited" ? t("mailTooMany") : t("mailFailed"));
    } catch {
      toast.error(t("mailFailed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-primary/40 bg-accent rounded-lg border p-4">
      <p className="text-sm font-semibold">{t("linkTitle", { email: fresh.email })}</p>
      <p className="text-meta mt-1 text-2sm leading-relaxed">
        {mailOn ? t("linkBodyMail") : t("linkBody")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Input readOnly value={fresh.url} className="min-w-0 flex-1 font-mono text-xs" />
        <Button type="button" size="sm" onClick={copy}>
          <Copy data-slot="icon" />
          {t("copy")}
        </Button>
        {mailOn ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={send}
            disabled={sending || sent}
          >
            {sending ? (
              <Loader2 data-slot="icon" className="animate-spin" />
            ) : sent ? (
              <Check data-slot="icon" />
            ) : (
              <Mail data-slot="icon" />
            )}
            {sent ? t("mailed") : t("mail")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
