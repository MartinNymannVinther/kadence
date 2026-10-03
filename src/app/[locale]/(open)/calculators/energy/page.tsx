import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EnergyAbout } from "@/components/calc/energy-about";
import { EnergyCalculator } from "@/components/calc/energy-calculator";
import { OpenPageHead } from "@/components/guides/open-page-head";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calculators.energy");
  return { title: t("title"), description: t("intro") };
}

/**
 * The energy calculator for a race, open to anyone (ADR 0047). It plans
 * fuel for a race and never what a young rider should weigh or eat in a
 * day: that line is ADR 0021's, and it holds here too.
 */
export default async function EnergyPage() {
  const t = await getTranslations("calculators.energy");
  return (
    <>
      <OpenPageHead title={t("title")} intro={t("intro")} />
      <div className="flex flex-col gap-6">
        <EnergyCalculator />
        <EnergyAbout />
      </div>
    </>
  );
}
