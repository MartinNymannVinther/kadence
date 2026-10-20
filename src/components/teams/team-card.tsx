import { ExternalLink, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TeamView } from "@/modules/teams/view";
import { initialsOf, Jersey } from "./jersey";
import { RiderLines } from "./rider-lines";
import { TeamPhotoFigure } from "./team-photo";

/**
 * One team on the teams page (ADR 0072): its drawn jersey, its name and
 * where it is at home, what DCU lists for it — the club behind it, the
 * team manager and the address DCU publishes — and the riders the
 * lists put on it this season, with their points. A foreign team says
 * its country and how many Danish riders it had last season.
 */
export function TeamCard({ team }: { team: TeamView }) {
  const t = useTranslations("guides.teams");
  return (
    <li
      id={team.id}
      className="border-border bg-card flex min-w-0 gap-4 rounded-xl border p-4 shadow-surface"
    >
      <div className="w-16 shrink-0 sm:w-20">
        <Jersey
          colours={team.colours}
          initials={initialsOf(team.name)}
          label={t("jerseyLabel", { name: team.name })}
        />
        {!team.colours && (
          <p className="text-meta mt-1 text-center text-2xs">{t("jerseyUnchecked")}</p>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-reading font-semibold break-words">{team.name}</h3>
          <p className="text-meta text-2sm">
            {[
              team.level === "foreign" && team.country
                ? t(`country.${team.country}` as "country.DK")
                : null,
              team.home,
              team.parentClub ? t("parentClub", { club: team.parentClub }) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {(team.manager || team.contact || team.website) && (
          <p className="text-2sm leading-relaxed">
            {team.manager && <span>{t("manager", { name: team.manager })}</span>}
            {team.manager && (team.contact || team.website) && " · "}
            {team.contact && (
              <a
                href={`mailto:${team.contact}`}
                className="focus-ring text-primary inline-flex items-center gap-1 break-all hover:underline"
              >
                <Mail aria-hidden className="size-3.5 shrink-0" />
                {team.contact}
              </a>
            )}
            {team.contact && team.website && " · "}
            {team.website && (
              <a
                href={team.website}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring text-primary inline-flex items-center gap-1 hover:underline"
              >
                {t("website")}
                <ExternalLink aria-hidden className="size-3 shrink-0" />
              </a>
            )}
          </p>
        )}
        {team.photo && <TeamPhotoFigure id={team.id} name={team.name} photo={team.photo} />}
        <RiderLines riders={team.riders} lastSeason={team.lastSeasonRiders} />
      </div>
    </li>
  );
}
