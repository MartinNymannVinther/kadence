import type { Metadata } from "next";
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
 * Cykling Danmark's lists, read once a day into a snapshot by a job
 * (docs/adr/0085). A stale snapshot is shown as it is, with a refresh put
 * in the queue; only an empty one is waited for. The research is
 * docs/research/teams.md.
 */
export default async function TeamsGuidePage() {
  notFoundWithout("teamsGuide");
  const t = await getTranslations("guides.teams");
  const dcuOn = env.TEAMS_DCU === "on";
  const { snapshot, wait } = await teamsSnapshot();
  // Anything unforeseen in a read is the log's, not the reader's: the
  // page shows what there is and says what was not read.
  const shown = wait ? ((await wait.catch(() => null)) ?? snapshot) : snapshot;
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
