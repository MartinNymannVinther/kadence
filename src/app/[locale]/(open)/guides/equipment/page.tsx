import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GuideView } from "@/components/guides/guide-view";
import { OpenPageHead } from "@/components/guides/open-page-head";
import { ValueTable } from "@/components/guides/value-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guides.equipment");
  return { title: t("title"), description: t("intro") };
}

/**
 * "Udstyr: hvor er der mest at hente": speed per krone for parents and
 * riders, without a raised finger (ADR 0047). The research is
 * docs/research/udstyr.md.
 */
export default async function EquipmentGuidePage() {
  const t = await getTranslations("guides.equipment");
  return (
    <>
      <OpenPageHead title={t("title")} intro={t("intro")} />
      <p className="text-meta -mt-3 pb-6 text-2sm leading-relaxed">{t("adults")}</p>
      <div className="flex flex-col gap-8">
        <ValueTable />
        <GuideView guide="equipment" />
      </div>
    </>
  );
}
