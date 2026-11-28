"use client";

import { Bot, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { removeAiConnectionAction } from "@/modules/mcp/actions";

export type ConnectionItem = {
  id: string;
  clientName: string;
  clientHost: string;
  createdAt: string;
  lastUsedAt: string | null;
};

/**
 * The person's assistants on "Din AI" (docs/adr/0118): each with its name
 * as it gave it, where it returns to, when it was connected and last used,
 * and a way to remove it, which holds at once.
 */
export function ConnectionsList({ connections }: { connections: ConnectionItem[] }) {
  const t = useTranslations("aiConnections");
  const locale = useLocale();
  const { run } = useRun();
  const format = (iso: string, withTime: boolean) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
      day: "numeric",
      month: "short",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : { year: "numeric" }),
      timeZone: "Europe/Copenhagen",
    }).format(new Date(iso));

  if (connections.length === 0)
    return <p className="text-meta text-2sm leading-relaxed">{t("empty")}</p>;

  return (
    <ul className="flex flex-col gap-3">
      {connections.map((c) => (
        <li
          key={c.id}
          className="border-border bg-card flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4 shadow-surface"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-2 font-medium break-words">
              <Bot aria-hidden className="size-4 shrink-0" />
              {c.clientName}
            </span>
            <span className="text-meta text-2sm break-all">{c.clientHost}</span>
            <span className="text-2sm">{t("created", { date: format(c.createdAt, false) })}</span>
            <span className="text-2sm">
              {c.lastUsedAt ? t("lastUsed", { when: format(c.lastUsedAt, true) }) : t("neverUsed")}
            </span>
          </div>
          <ConfirmButton
            title={t("removeTitle", { name: c.clientName })}
            body={t("removeBody")}
            confirmLabel={t("remove")}
            variant="outline"
            size="default"
            onConfirm={() =>
              run(() => removeAiConnectionAction({ id: c.id }), { success: t("removed") })
            }
          >
            <Trash2 data-icon="inline-start" />
            {t("remove")}
            <span className="sr-only">{` ${c.clientName}`}</span>
          </ConfirmButton>
        </li>
      ))}
    </ul>
  );
}
