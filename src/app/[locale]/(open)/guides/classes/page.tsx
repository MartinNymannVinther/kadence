import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { GuideView } from "@/components/guides/guide-view";
import { OpenPageHead } from "@/components/guides/open-page-head";
import { features } from "@/core/features";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guides.classes");
  return { title: t("title"), description: t("intro") };
}

/**
 * "Klasserne og vejen videre": the young classes, what they cost, and how
 * riders move on, for parents new to the sport (ADR 0047). The research
 * is docs/research/klasser-og-gearing.md. The section on teams leads on
 * to the teams page (ADR 0072) where the installation has it.
 */
export default async function ClassesGuidePage() {
  const t = await getTranslations("guides.classes");
  return (
    <>
      <OpenPageHead title={t("title")} intro={t("intro")} />
      <GuideView
        guide="classes"
        extra={{
          teams: features().teamsGuide ? (
            <Link
              href="/guides/teams"
              className="focus-ring text-primary inline-flex items-center gap-1 text-2sm font-medium hover:underline"
            >
              {t("toTeams")}
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          ) : undefined,
        }}
      />
    </>
  );
}
