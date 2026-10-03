import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GuideView } from "@/components/guides/guide-view";
import { OpenPageHead } from "@/components/guides/open-page-head";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guides.classes");
  return { title: t("title"), description: t("intro") };
}

/**
 * "Klasserne og vejen videre": the young classes, what they cost, and how
 * riders move on, for parents new to the sport (ADR 0047). The research
 * is docs/research/klasser-og-gearing.md.
 */
export default async function ClassesGuidePage() {
  const t = await getTranslations("guides.classes");
  return (
    <>
      <OpenPageHead title={t("title")} intro={t("intro")} />
      <GuideView guide="classes" />
    </>
  );
}
