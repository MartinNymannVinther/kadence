"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCopy } from "./use-copy";

/**
 * An invitation link to copy and send by hand. No mail is sent by
 * Kadence — the box says so, every time, so nobody waits for one.
 */
export function InvitationLink({ url, email }: { url: string; email?: string }) {
  const t = useTranslations("common.invitation");
  const { copy, copied } = useCopy();
  const done = copied === url;
  return (
    <div className="bg-accent/60 border-border flex flex-col gap-2 rounded-lg border p-3 text-sm">
      <p className="font-medium">{email ? t("titleFor", { email }) : t("title")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="bg-card border-border max-w-full min-w-0 flex-1 truncate rounded border px-2 py-1.5 text-xs">
          {url}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="max-sm:h-11"
          onClick={() => void copy(url)}
        >
          {done ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
          {done ? t("copied") : t("copy")}
        </Button>
      </div>
      <p className="text-meta text-xs leading-relaxed">{t("noMail")}</p>
    </div>
  );
}
