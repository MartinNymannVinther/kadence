import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EnergyAbout } from "@/components/calc/energy-about";
import { EnergyCalculator } from "@/components/calc/energy-calculator";
import { OpenPageHead } from "@/components/guides/open-page-head";
import { notFoundWithout } from "@/core/feature-gate";

export async function generateMetadata(): Promise<Metadata> {
  notFoundWithout("energyCalculator");
  const t = await getTranslations("calculators.energy");
  return { title: t("title"), description: t("intro") };
}

/**
 * The energy calculator for a race, open to anyone (ADR 0047). It plans
 * fuel for a race and never what a young rider should weigh or eat in a
 * day: that line is ADR 0021's, and it holds here too. Not there while the
 * installation has it parked (ADR 0056).
 */
export default async function EnergyPage() {
  notFoundWithout("energyCalculator");
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
