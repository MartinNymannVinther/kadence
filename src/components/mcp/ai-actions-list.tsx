"use client";

import { Undo2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRun } from "@/components/common/use-run";
import { Button } from "@/components/ui/button";
import { undoAiActionAction } from "@/modules/mcp/actions";

export type AiActionItem = {
  id: string;
  tool: string;
  label: string;
  createdAt: string;
  undone: boolean;
};

/**
 * What the person's assistant wrote or deleted in the last 30 days, the
 * newest first, each with "Fortryd" (docs/adr/0120). An undo that would
 * overwrite somebody else's later change is refused and says so.
 */
export function AiActionsList({ actions }: { actions: AiActionItem[] }) {
  const t = useTranslations("aiConnections.actions");
  const locale = useLocale();
  const { run, pending } = useRun();
  const when = (iso: string) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Copenhagen",
    }).format(new Date(iso));
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-semibold">{t("title")}</h3>
      <p className="text-meta text-2sm leading-relaxed">{t("hint")}</p>
      {actions.length === 0 ? (
        <p className="text-meta text-2sm">{t("empty")}</p>
      ) : (
        <ul className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-surface">
          {actions.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
            >
              <span className="flex min-w-0 flex-col text-2sm">
                <span className="font-medium">
                  {t(`tool.${a.tool}` as "tool.save_my_checkin")}
                  {a.label && <span className="text-meta font-normal"> · {a.label}</span>}
                </span>
                <span className="text-meta text-xs">{when(a.createdAt)}</span>
              </span>
              {a.undone ? (
                <span className="text-meta text-xs">{t("undone")}</span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  className="max-sm:h-11"
                  onClick={() =>
                    void run(() => undoAiActionAction({ id: a.id }), { success: t("undoneNow") })
                  }
                >
                  <Undo2 data-icon="inline-start" />
                  {t("undo")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
