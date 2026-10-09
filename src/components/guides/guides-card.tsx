import { Compass } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { features } from "@/core/features";
import { shownTopics } from "@/modules/guides/hub";
import { GuideDoor } from "./guide-door";

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
    <GuideDoor
      href="/guides"
      icon={Compass}
      title={t("title")}
      body={t(body, { topics })}
      open={t("open")}
    />
  );
}
