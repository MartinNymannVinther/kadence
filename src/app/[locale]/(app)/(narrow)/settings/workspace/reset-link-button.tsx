"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCopy } from "@/components/common/use-copy";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createResetLinkAction } from "@/core/team/actions";

/**
 * "Link til ny adgangskode" (ADR 0032): a one-time link for a member who
 * forgot the password, for the coach to pass on by hand. It works once,
 * within the hour; the person can see that it was made and by whom, and
 * using it signs them out everywhere else. Kadence sends it nowhere.
 */
export function ResetLinkButton({ userId, name }: { userId: string; name: string }) {
  const t = useTranslations("settings.workspace.resetLink");
  const locale = useLocale();
  const { run, pending } = useRun();
  const { copy, copied } = useCopy();
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);

  async function make() {
    const made = await run(() => createResetLinkAction({ userId }), { refresh: false });
    if (made) setLink(made);
  }

  const until = link
    ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Copenhagen",
      }).format(new Date(link.expiresAt))
    : "";
  const done = link !== null && copied === link.url;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => void make()}
      >
        <KeyRound data-icon="inline-start" />
        {t("button")}
        <span className="sr-only">{` ${name}`}</span>
      </Button>
      <Dialog open={link !== null} onOpenChange={(open) => !open && setLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title", { name })}</DialogTitle>
            <DialogDescription>{t("body", { name, until })}</DialogDescription>
          </DialogHeader>
          {link && (
            <div className="bg-accent/60 border-border flex flex-wrap items-center gap-2 rounded-lg border p-3">
              <code className="bg-card border-border max-w-full min-w-0 flex-1 rounded border px-2 py-1.5 text-xs break-all">
                {link.url}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="max-sm:h-11"
                autoFocus
                onClick={() => void copy(link.url)}
              >
                {done ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                {done ? t("copied") : t("copy")}
              </Button>
            </div>
          )}
          <p className="text-meta text-xs leading-relaxed">{t("seen", { name })}</p>
          <DialogFooter>
            <Button type="button" className="max-sm:h-11" onClick={() => setLink(null)}>
              {t("done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
