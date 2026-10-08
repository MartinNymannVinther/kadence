import type { Metadata } from "next";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { OpenPageHead } from "@/components/guides/open-page-head";
import { SourcesNote } from "@/components/teams/sources-note";
import { TeamsSections } from "@/components/teams/teams-sections";
import { env } from "@/core/env";
import { notFoundWithout } from "@/core/feature-gate";
import { teamsSnapshot } from "@/modules/teams/refresh";
import { buildTeamsView } from "@/modules/teams/view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  notFoundWithout("teamsGuide");
  const t = await getTranslations("guides.teams");
  return { title: t("title"), description: t("intro") };
}

/**
 * "Hold for U19 og U23" (ADR 0072): the Danish teams by level and the
 * foreign teams Danish riders ride for, from the UCI's rankings and
 * Cykling Danmark's lists, read once a day into a snapshot. A stale
 * snapshot is shown as it is and refreshed after the answer; only an
 * empty one is waited for. The research is docs/research/teams.md.
 */
export default async function TeamsGuidePage() {
  notFoundWithout("teamsGuide");
  const t = await getTranslations("guides.teams");
  const dcuOn = env.TEAMS_DCU === "on";
  const { snapshot, refresh, wait } = await teamsSnapshot();
  let shown = snapshot;
  if (refresh) {
    if (wait) shown = await refresh;
    else after(() => refresh.catch(() => undefined));
  }
  const view = buildTeamsView(shown, dcuOn);
  return (
    <>
      <OpenPageHead title={t("title")} intro={t("intro")} />
      <TeamsSections view={view} />
      <div className="mt-10">
        <SourcesNote sources={view.sources} />
      </div>
    </>
  );
}
