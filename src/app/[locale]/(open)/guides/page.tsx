import type { Metadata } from "next";
import { BookOpen, Calculator, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guides.hub");
  return { title: t("title"), description: t("intro") };
}

const CALCULATORS = [
  { key: "energy", href: "/calculators/energy" },
  { key: "gearing", href: "/calculators/gearing" },
] as const;

const GUIDES = [
  { key: "classes", href: "/guides/classes" },
  { key: "equipment", href: "/guides/equipment" },
] as const;

/**
 * The open hub (ADR 0047): the calculators and the guides, for anyone,
 * signed in or not. Linked from the parents' page, from help and from
 * the app's navigation.
 */
export default async function GuidesHubPage() {
  const t = await getTranslations("guides.hub");

  const card = (item: { key: string; href: string }, Icon: typeof BookOpen) => (
    <li key={item.key}>
      <Link
        href={item.href}
        className="focus-ring border-border bg-card hover:border-primary flex items-start gap-3 rounded-xl border p-4 shadow-[var(--surface-shadow)]"
      >
        <Icon aria-hidden className="text-primary mt-0.5 size-5 shrink-0" />
        <span className="flex flex-1 flex-col gap-1">
          <span className="text-reading font-semibold">
            {t(`items.${item.key}.title` as "title")}
          </span>
          <span className="text-meta text-2sm leading-relaxed">
            {t(`items.${item.key}.body` as "title")}
          </span>
        </span>
        <ChevronRight aria-hidden className="text-meta mt-0.5 size-4 shrink-0" />
      </Link>
    </li>
  );

  return (
    <div className="flex flex-col gap-8 pt-4">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
        <p className="text-reading leading-relaxed">{t("intro")}</p>
      </div>
      <section aria-labelledby="hub-calculators" className="flex flex-col gap-3">
        <h2 id="hub-calculators" className="text-lg font-semibold">
          {t("calculators")}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">{CALCULATORS.map((c) => card(c, Calculator))}</ul>
      </section>
      <section aria-labelledby="hub-guides" className="flex flex-col gap-3">
        <h2 id="hub-guides" className="text-lg font-semibold">
          {t("guides")}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">{GUIDES.map((g) => card(g, BookOpen))}</ul>
      </section>
    </div>
  );
}
