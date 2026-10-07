import { Check, ExternalLink, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { SLEEP_URL } from "./guide-links";

const CAN = ["training", "wellbeing", "comments", "calendar"] as const;
const CANNOT = ["others", "change", "hidden"] as const;

/**
 * Three short things every parent of a young rider can use: sleep, school
 * beside sport, and what a parent can and cannot see in Kadence — and why
 * the rider decides (ADR 0011).
 */
export function ParentBasics() {
  const t = useTranslations("parents.basics");
  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <section className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-surface">
        <h3 className="text-sm font-semibold">{t("sleepTitle")}</h3>
        <p className="text-2sm leading-relaxed">{t("sleepBody")}</p>
        <a
          href={SLEEP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring text-primary inline-flex min-h-9 w-fit items-center gap-1.5 text-2sm font-medium hover:underline"
        >
          {t("sleepLink")}
          <ExternalLink aria-hidden className="size-3.5" />
        </a>
      </section>
      <section className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-surface">
        <h3 className="text-sm font-semibold">{t("schoolTitle")}</h3>
        <p className="text-2sm leading-relaxed">{t("schoolBody")}</p>
      </section>
      <section className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-surface @3xl:col-span-2">
        <h3 className="text-sm font-semibold">{t("seeTitle")}</h3>
        <div className="grid gap-4 @2xl:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h4 className="text-label text-xs font-medium">{t("canLabel")}</h4>
            <ul className="flex flex-col gap-2">
              {CAN.map((key) => (
                <li key={key} className="flex gap-2 text-2sm leading-relaxed">
                  <Check aria-hidden className="text-success mt-0.5 size-4 shrink-0" />
                  <span>{t(`can.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="text-label text-xs font-medium">{t("cannotLabel")}</h4>
            <ul className="flex flex-col gap-2">
              {CANNOT.map((key) => (
                <li key={key} className="flex gap-2 text-2sm leading-relaxed">
                  <X aria-hidden className="text-destructive mt-0.5 size-4 shrink-0" />
                  <span>{t(`cannot.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-meta text-2sm leading-relaxed">{t("why")}</p>
      </section>
    </div>
  );
}
