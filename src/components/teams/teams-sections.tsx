import { useTranslations } from "next-intl";
import { TEAM_LEVELS, type TeamLevel } from "@/modules/teams/types";
import type { TeamsView } from "@/modules/teams/view";
import { TeamCard } from "./team-card";

const DANISH = TEAM_LEVELS.filter((l): l is Exclude<TeamLevel, "foreign"> => l !== "foreign");

/**
 * The page's body: a contents line, Denmark's place in the juniors'
 * Nations' Cup, the Danish teams level by level — where a U19 or U23
 * rider goes next — and the foreign teams Danish riders ride for, from
 * the lists. Every level says in a line what it is.
 */
export function TeamsSections({ view }: { view: TeamsView }) {
  const t = useTranslations("guides.teams");
  const levels = DANISH.filter((level) => view.byLevel[level].length > 0);
  return (
    <div className="flex flex-col gap-10">
      <nav aria-label={t("contents")} className="flex flex-wrap gap-x-4 gap-y-1 text-2sm">
        {[...levels, ...(view.foreign.length ? (["foreign"] as const) : [])].map((level) => (
          <a
            key={level}
            href={`#level-${level}`}
            className="focus-ring text-primary hover:underline"
          >
            {t(`level.${level}.title`)}
          </a>
        ))}
      </nav>
      {view.nationsCup && (view.nationsCup.men || view.nationsCup.women) && (
        <p className="bg-secondary text-reading rounded-lg px-4 py-3 text-2sm leading-relaxed">
          {view.nationsCup.men &&
            t("nationsCupMen", { season: view.nationsCup.season, ...view.nationsCup.men })}
          {view.nationsCup.men && view.nationsCup.women && " "}
          {view.nationsCup.women &&
            t("nationsCupWomen", { season: view.nationsCup.season, ...view.nationsCup.women })}
        </p>
      )}
      {levels.map((level) => (
        <section key={level} aria-labelledby={`level-${level}`} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id={`level-${level}`} className="text-lg font-semibold">
              {t(`level.${level}.title`)}
            </h2>
            <p className="text-meta text-2sm leading-relaxed">{t(`level.${level}.intro`)}</p>
          </div>
          <ul className="flex flex-col gap-3">
            {view.byLevel[level].map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </ul>
        </section>
      ))}
      {view.foreign.length > 0 && (
        <section aria-labelledby="level-foreign" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="level-foreign" className="text-lg font-semibold">
              {t("level.foreign.title")}
            </h2>
            <p className="text-meta text-2sm leading-relaxed">{t("level.foreign.intro")}</p>
          </div>
          <ul className="flex flex-col gap-3">
            {view.foreign.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
