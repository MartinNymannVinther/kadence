import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mcpOn } from "@/core/auth/mcp";
import { getSession } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { searchParamsOf } from "@/modules/mcp/authorize-query";
import { describeClient } from "@/modules/mcp/connections";
import { consentWorkspaces } from "@/modules/mcp/consent-view";
import { ConsentForm } from "./consent-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("connect");
  return { title: t("metaTitle") };
}

/**
 * The yes to a person's own assistant (docs/adr/0118): who asks, where it
 * returns to, which workspace, what it may and may not do, and that what
 * it reads goes to a service the person chose. The rule on who may say yes
 * is shown here and checked again by the consent endpoint.
 */
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!mcpOn()) notFound();
  const params = searchParamsOf(await searchParams);
  const clientId = params.get("client_id");
  if (!clientId) notFound();
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/connect?${params.toString()}`)}`);
  const t = await getTranslations("connect");

  const client = await describeClient(clientId, params.get("redirect_uri"));
  if (!client)
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("unknownTitle")}</CardTitle>
          <CardDescription>{t("unknownBody")}</CardDescription>
        </CardHeader>
      </Card>
    );

  const workspaces = await consentWorkspaces(
    session.user.id,
    Number(todayInCopenhagen().slice(0, 4)),
  );
  const active = (session.session as { activeOrganizationId?: string | null }).activeOrganizationId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="break-words">{t("title", { client: client.name })}</CardTitle>
        <CardDescription className="break-words">
          {t("returnsTo", { host: client.host })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ConsentForm workspaces={workspaces} active={active ?? null} />
      </CardContent>
    </Card>
  );
}
