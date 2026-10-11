"use client";

import { useTranslations } from "next-intl";

/** What an application or invitation says the workspace is (docs/adr/0080). */
export type KindInfo = {
  kind: string;
  birthYear: number | null;
  forWhom: string | null;
  childName: string | null;
};

/**
 * One line under a name in Adgang: nothing for a club, which the
 * organisation's name already says; for a personal workspace, for whom
 * and the rider's birth year, so the owner sees what they approve.
 */
export function KindNote({ info }: { info: KindInfo }) {
  const t = useTranslations("settings.access");
  if (info.kind !== "personal") return null;
  return (
    <p className="text-meta mt-0.5 text-xs">
      {info.forWhom === "child"
        ? t("personalChild", { child: info.childName ?? "", year: String(info.birthYear ?? "") })
        : t("personalMe", { year: String(info.birthYear ?? "") })}
    </p>
  );
}
