import { useLocale, useTranslations } from "next-intl";
import { formatStamp } from "@/core/dates";
import type { TeamsView } from "@/modules/teams/view";

/**
 * Where the page's facts come from and when they were last read: the
 * UCI's DataRide and Cykling Danmark, each with its date, and a plain
 * word when a source could not be read or is switched off. The page
 * never pretends a number is newer than it is.
 */
export function SourcesNote({ sources }: { sources: TeamsView["sources"] }) {
  const t = useTranslations("guides.teams.sources");
  const locale = useLocale();
  const when = (iso: string | null) => (iso ? formatStamp(new Date(iso), locale) : t("never"));
  return (
    <section aria-labelledby="teams-sources" className="flex flex-col gap-2">
      <h2 id="teams-sources" className="text-base font-semibold">
        {t("title")}
      </h2>
      <ul className="text-meta flex flex-col gap-1 text-2sm leading-relaxed">
        <li>
          {t("uci", { when: when(sources.uci.fetchedAt) })}
          {sources.uci.computedOn && ` ${t("computedOn", { date: sources.uci.computedOn })}`}
          {sources.uci.error && ` ${t("failed")}`}
        </li>
        <li>
          {sources.dcu.on ? t("dcu", { when: when(sources.dcu.fetchedAt) }) : t("dcuOff")}
          {sources.dcu.on && sources.dcu.error && ` ${t("failed")}`}
        </li>
        <li>{t("registry")}</li>
      </ul>
    </section>
  );
}
