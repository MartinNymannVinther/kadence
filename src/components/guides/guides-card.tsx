import { Compass } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** The way from inside Kadence to the open guides and calculators (ADR 0047). */
export function GuidesCard({ body }: { body: "fromParents" | "fromHelp" }) {
  const t = useTranslations("guides.hub");
  return (
    <Link
      href="/guides"
      className="focus-ring border-border bg-card hover:border-primary flex items-start gap-3 rounded-xl border p-4 shadow-surface"
    >
      <Compass aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
      <span className="flex flex-col gap-1">
        <span className="text-reading font-semibold">{t("title")}</span>
        <span className="text-meta text-2sm leading-relaxed">{t(body)}</span>
        <span className="text-primary text-2sm font-medium">{t("open")}</span>
      </span>
    </Link>
  );
}
