import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CoachGuide } from "@/components/coach/coach-guide";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("coachGuide");
  return { title: t("title") };
}

/**
 * "Trænerguiden": what Kadence tells a coach of young riders, in fourteen
 * short sections with their sources (ADR 0021). Open to everyone signed
 * in — a rider or a parent may read what their coach is advised.
 */
export default async function CoachGuidePage() {
  const t = await getTranslations("coachGuide");
  const help = await getTranslations("help");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-16">
      <Link
        href="/help"
        className="focus-ring text-meta hover:text-foreground flex min-h-11 w-fit items-center gap-1 text-2sm"
      >
        <ChevronLeft aria-hidden className="size-4" />
        {help("title")}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-reading leading-relaxed">{t("intro")}</p>
        <p className="text-meta text-2sm leading-relaxed">{t("note")}</p>
      </div>
      <CoachGuide />
      <p className="border-border bg-card text-meta rounded-xl border p-4 text-sm">
        {t("research")}
      </p>
    </div>
  );
}
