import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { RulleApp } from "@/components/rulle/rulle-app";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { redirect } from "@/i18n/navigation";
import { bundledRoute, DEFAULT_ROUTE } from "@/modules/rulle";
import { rulleStart } from "@/modules/rulle/service";
import { whoAmI } from "@/modules/team/access";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rulle");
  return { title: t("title") };
}

/**
 * Rulle, the indoor part of Kadence (ADR 0032): today's session on the
 * trainer. The server picks the session — the one asked for with
 * `?session=`, or the rider's first open bike session today — and the
 * thresholds its watts come from; the ride itself happens in the browser.
 */
export default async function RullePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const me = await whoAmI(ctx.orgId, ctx.userId);
  const search = await searchParams;
  const asked = typeof search.session === "string" ? search.session : null;
  const today = todayInCopenhagen();
  const start = await rulleStart(ctx, me, asked, today);
  return <RulleApp start={start} route={bundledRoute(DEFAULT_ROUTE)} today={today} />;
}
