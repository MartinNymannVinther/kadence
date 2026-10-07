"use client";

import { Cloud, CloudOff, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatClock, formatDay, todayInCopenhagen } from "@/core/dates";
import type { SharedDraft } from "@/modules/training/week-plan-draft";
import type { SharedDraftState } from "./use-shared-draft";

/**
 * Where the week plan stands with the team's other coaches (ADR 0043,
 * amended 2026-10-07): "Sidst gemt af Mads kl. 14.32", a plain word when
 * someone else's newer draft has just replaced the one shown, and what
 * still works when the server cannot be reached — the plan is kept on
 * this device and shared when the connection is back.
 */
export function DraftStatus({ state, today }: { state: SharedDraftState; today: string }) {
  const t = useTranslations("weekPlan.draft");
  const locale = useLocale();
  const when = (iso: string) => {
    const at = new Date(iso);
    const time = formatClock(at, locale);
    return todayInCopenhagen(at) === today
      ? t("today", { time })
      : t("onDay", { date: formatDay(at, locale), time });
  };
  const savedBy = (draft: SharedDraft) =>
    draft.by.me
      ? t("savedMine", { when: when(draft.updatedAt) })
      : draft.by.name
        ? t("saved", { name: draft.by.name, when: when(draft.updatedAt) })
        : t("savedGone", { when: when(draft.updatedAt) });

  const { notice, server, offline } = state;
  let news: string | null = null;
  if (notice?.kind === "laidIn") news = t("laidIn");
  else if (notice?.kind === "newer") {
    const at = when(notice.at);
    news = notice.by.me
      ? t("newerMine", { when: at })
      : notice.by.name
        ? t("newer", { name: notice.by.name, when: at })
        : t("newerGone", { when: at });
    if (notice.lost) news = `${news} ${t("lost")}`;
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {news && (
        <Alert role="status" className="bg-secondary/60">
          <Users aria-hidden />
          <AlertDescription className="text-foreground text-2sm">{news}</AlertDescription>
        </Alert>
      )}
      <p className="text-meta flex items-start gap-1.5 text-2sm" role="status">
        {offline ? (
          <CloudOff aria-hidden className="mt-0.5 size-4 shrink-0" />
        ) : (
          <Cloud aria-hidden className="mt-0.5 size-4 shrink-0" />
        )}
        <span>{offline ? t("offline") : server ? savedBy(server) : t("hint")}</span>
      </p>
    </div>
  );
}
