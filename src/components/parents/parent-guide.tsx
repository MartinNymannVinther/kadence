import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { ADVICE, ADVICE_URL, GUIDE_URL, THEMES } from "./guide-links";

function External({ href, children }: { href: string; children: React.ReactNode }) {
  const t = useTranslations("parents.guide");
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring text-primary inline-flex min-h-9 w-fit items-center gap-1.5 text-2sm font-medium hover:underline"
    >
      {children}
      <ExternalLink aria-hidden className="size-3.5 shrink-0" />
      <span className="sr-only">{t("opensElsewhere")}</span>
    </a>
  );
}

/**
 * "Forældreguiden": the ten themes and nine pieces of advice in Kadence's
 * own short words, each theme linked to Team Danmark's original — never
 * their text (they forbid commercial reproduction) — with the credit.
 * Its page under Viden og hjælp (/help/parents) carries the guide's name
 * and what it is; the themes and the advice are that page's sections.
 */
export function ParentGuide() {
  const t = useTranslations("parents.guide");
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <p className="text-2sm font-medium">{t("credit")}</p>
        <External href={GUIDE_URL}>{t("guideLink")}</External>
      </div>

      <section aria-labelledby="guide-themes" className="flex flex-col gap-3">
        <h2 id="guide-themes" className="text-lg font-semibold">
          {t("themesTitle")}
        </h2>
        <ol className="grid gap-3 @2xl:grid-cols-2">
          {THEMES.map((theme) => (
            <li
              key={theme.n}
              className="border-border bg-card flex flex-col gap-1.5 rounded-xl border p-4 shadow-surface"
            >
              <p className="text-meta text-xs font-medium">{t("themeNumber", { n: theme.n })}</p>
              <h3 className="text-sm font-semibold">
                {t(`themes.${theme.n}.title` as "themes.1.title")}
              </h3>
              <p className="text-2sm leading-relaxed">
                {t(`themes.${theme.n}.body` as "themes.1.body")}
              </p>
              <External href={theme.url}>{t("themeLink", { n: theme.n })}</External>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="guide-advice" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="guide-advice" className="text-lg font-semibold">
            {t("adviceTitle")}
          </h2>
          <External href={ADVICE_URL}>{t("adviceLink")}</External>
        </div>
        <ol className="border-border bg-card divide-hairline flex flex-col divide-y rounded-xl border shadow-surface">
          {ADVICE.map((n) => (
            <li key={n} className="flex gap-3 px-4 py-3">
              <span className="bg-accent text-accent-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {n}
              </span>
              <p className="text-2sm leading-relaxed">
                <span className="font-semibold">{t(`advice.${n}.title` as "advice.1.title")}</span>{" "}
                {t(`advice.${n}.body` as "advice.1.body")}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
