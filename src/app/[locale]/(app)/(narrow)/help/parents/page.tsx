import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ParentBasics } from "@/components/parents/parent-basics";
import { ParentGuide } from "@/components/parents/parent-guide";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parents.guide");
  return { title: t("title") };
}

/**
 * "Forældreguiden" under Viden og hjælp: Team Danmark's and Kolding
 * Talent's ten themes and nine pieces of advice in Kadence's own words,
 * with links to the originals, and three plain things every parent can
 * use — sleep, school beside sport, and what a parent can see here and
 * why (ADR 0011). It was the lower half of the parents' page; there it is
 * now a card, so the child's page stays the child's. Open to everyone
 * signed in: a coach points parents here, and a rider may read what their
 * parents are told.
 */
export default async function ParentGuidePage() {
  const t = await getTranslations("parents");
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
        <h1 className="text-2xl font-semibold">{t("guide.title")}</h1>
        <p className="text-reading leading-relaxed">{t("guide.body")}</p>
      </div>
      <ParentGuide />
      <section aria-labelledby="parent-basics" className="flex flex-col gap-4">
        <h2 id="parent-basics" className="text-lg font-semibold">
          {t("basicsTitle")}
        </h2>
        <ParentBasics />
      </section>
    </div>
  );
}
