import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GuideView } from "@/components/guides/guide-view";
import { OpenPageHead } from "@/components/guides/open-page-head";
import { RecipeCards } from "@/components/guides/recipe-cards";
import { notFoundWithout } from "@/core/feature-gate";

export async function generateMetadata(): Promise<Metadata> {
  notFoundWithout("foodGuide");
  const t = await getTranslations("guides.food");
  return { title: t("title"), description: t("intro") };
}

/**
 * "Mad og drikke til unge ryttere": everyday food, race day, homemade
 * energy with recipes, keeping it safe, teeth, supplements and low energy
 * availability, for parents and riders (ADR 0047). The research is
 * docs/research/ernaering.md. Parked until a sports dietitian has read its
 * section on low energy availability: not there while the installation
 * has it off (ADR 0057).
 */
export default async function FoodGuidePage() {
  notFoundWithout("foodGuide");
  const t = await getTranslations("guides.food");
  return (
    <>
      <OpenPageHead title={t("title")} intro={t("intro")} />
      <GuideView guide="food" extra={{ homemade: <RecipeCards /> }} />
    </>
  );
}
