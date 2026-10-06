import { Compass } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { features } from "@/core/features";
import { Link } from "@/i18n/navigation";
import { shownTopics } from "@/modules/guides/hub";

/**
 * The way from inside Kadence to the open guides and calculators (ADR 0047).
 * It names the topics the hub shows on this installation, so a parked
 * guide is never promised (ADR 0057). Rendered on the server only: it
 * reads the installation's features.
 */
export function GuidesCard({ body }: { body: "fromParents" | "fromHelp" }) {
  const t = useTranslations("guides.hub");
  const locale = useLocale();
  const topics = new Intl.ListFormat(locale === "en" ? "en-GB" : "da-DK", {
    type: "conjunction",
  }).format(shownTopics(features()).map((key) => t(`items.${key}.topic`)));
  return (
    <Link
      href="/guides"
      className="focus-ring border-border bg-card hover:border-primary flex items-start gap-3 rounded-xl border p-4 shadow-surface"
    >
      <Compass aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
      <span className="flex flex-col gap-1">
        <span className="text-reading font-semibold">{t("title")}</span>
        <span className="text-meta text-2sm leading-relaxed">{t(body, { topics })}</span>
        <span className="text-primary text-2sm font-medium">{t("open")}</span>
      </span>
    </Link>
  );
}
