"use client";

import { Share2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatStamp } from "@/core/dates";
import { firstName, type Recipient, type RecipientLink } from "./invitation-recipients";

/**
 * "Del": one person's invitation as a short text and the link, through
 * the phone's own share sheet (SMS, chat) where there is one, copied to
 * the clipboard where there is not. Kadence sends nothing itself (ADR
 * 0032); the text says what the person is invited as, which address the
 * account must use, and until when the link works.
 */
export function ShareInvitationButton({
  recipient,
  link,
  team,
}: {
  recipient: Recipient;
  link: RecipientLink;
  team: string;
}) {
  const t = useTranslations("riders.recipients");
  const locale = useLocale();

  function text(): string {
    const until = formatStamp(new Date(link.expiresAt), locale);
    const name = firstName(recipient.name);
    const message =
      recipient.kind === "rider"
        ? t("textRider", { name, team, email: link.email, until })
        : t("textParent", {
            name,
            team,
            email: link.email,
            until,
            children: new Intl.ListFormat(locale === "en" ? "en-GB" : "da-DK", {
              type: "conjunction",
            }).format(recipient.children.map(firstName)),
            count: recipient.children.length,
          });
    return `${message}\n\n${link.url}`;
  }

  async function share() {
    const body = text();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text: body });
        return;
      } catch (error) {
        // Closing the share sheet is a choice, not a failure.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(body);
      toast.success(t("copied"));
    } catch {
      toast.error(t("failed"));
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="max-sm:h-11"
      aria-label={t("shareLabel", { name: recipient.name })}
      onClick={() => void share()}
    >
      <Share2 data-icon="inline-start" />
      {t("share")}
    </Button>
  );
}
