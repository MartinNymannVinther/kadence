import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { TeamSettingsForm } from "@/components/team/team-settings-form";
import { getOrgContext } from "@/core/auth/session";
import { featureOn } from "@/core/features";
import { redirect } from "@/i18n/navigation";
import { whoAmI } from "@/modules/team/access";
import { getTeamSettings } from "@/modules/team/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.team");
  return { title: t("title") };
}

/**
 * The team's settings: its kind, its training basis as one choice
 * (ADR 0049, 0053), the club championship where the installation has it
 * (ADR 0057), and the two youth defaults, both off (ADR 0013).
 */
export default async function TeamSettingsPage() {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const [me, settings] = await Promise.all([whoAmI(ctx.orgId, ctx.userId), getTeamSettings(ctx)]);
  return (
    <TeamSettingsForm
      settings={settings}
      canManage={Boolean(me?.isCoach)}
      clubChampionship={featureOn("clubChampionship")}
    />
  );
}
