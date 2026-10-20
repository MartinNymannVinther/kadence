"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { diagnose, type Diagnosis } from "./browser-push";

/**
 * One line under "Påmindelser" that says how this browser stands (P1-05):
 * the permission, whether Kadence's worker is registered, whether there is
 * a subscription and since when, and on an iPhone or iPad whether Kadence
 * was opened from the home screen. What it reads is this browser's own,
 * and the one date is this person's subscription on this team.
 */
export function RemindersDiagnosis({
  since,
  checked,
}: {
  /** When this browser's reminders were turned on here (ISO), or null. */
  since: string | null;
  /** Bumped by the card after anything that may have changed the answer. */
  checked: number;
}) {
  const t = useTranslations("reminders.diagnosis");
  const locale = useLocale();
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);

  useEffect(() => {
    let live = true;
    diagnose()
      .then((found) => live && setDiagnosis(found))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [checked]);

  if (!diagnosis) return null;
  const when = (iso: string) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Copenhagen",
    }).format(new Date(iso));

  const parts = [
    t(`permission.${diagnosis.permission}`),
    diagnosis.worker ? t("worker") : t("noWorker"),
    !diagnosis.subscription
      ? t("noSubscription")
      : since
        ? t("subscribedSince", { when: when(since) })
        : t("subscribedElsewhere"),
  ];
  if (diagnosis.ios) parts.push(diagnosis.standalone ? t("standalone") : t("notStandalone"));

  return (
    <p className="text-meta text-xs leading-relaxed" aria-live="polite">
      <span className="font-medium">{t("label")}</span> {parts.join(" · ")}
    </p>
  );
}
