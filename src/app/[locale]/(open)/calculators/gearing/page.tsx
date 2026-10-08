import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GearingCalculator } from "@/components/calc/gearing-calculator";
import { GearingNotes } from "@/components/calc/gearing-notes";
import { OpenPageHead } from "@/components/guides/open-page-head";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calculators.gearing");
  return { title: t("title"), description: t("intro") };
}

/**
 * The gearing calculator for the young classes, open to anyone (ADR
 * 0047). The limits are DCU's (src/modules/dcu/gearing.ts), the physics
 * src/modules/calc/gearing.ts; nothing typed here leaves the browser.
 */
export default async function GearingPage() {
  const t = await getTranslations("calculators.gearing");
  return (
    <>
      <OpenPageHead title={t("title")} intro={t("intro")} />
      <div className="flex flex-col gap-6">
        <GearingCalculator />
        <GearingNotes />
      </div>
    </>
  );
}
