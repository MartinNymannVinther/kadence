import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AiActionsList } from "@/components/mcp/ai-actions-list";
import { ConnectionsList } from "@/components/mcp/connections-list";
import { MCP_RESOURCE, mcpOn } from "@/core/auth/mcp";
import { getOrgContext } from "@/core/auth/session";
import { todayInCopenhagen } from "@/core/dates";
import { redirect } from "@/i18n/navigation";
import { listAiActions } from "@/modules/mcp/ai-actions";
import { listConnections } from "@/modules/mcp/connections";
import { connectingRider } from "@/modules/mcp/eligibility";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("aiConnections");
  return { title: t("title") };
}

/**
 * "Din AI" (docs/adr/0118): the assistants the person has connected to
 * this workspace, a way to remove each, and how to connect one. Only the
 * person sees their own. A person who may not connect is told why, and
 * that the rest of Kadence works as before.
 */
export default async function AiConnectionsPage() {
  if (!mcpOn() || !MCP_RESOURCE) notFound();
  const ctx = await getOrgContext();
  const locale = await getLocale();
  if (!ctx) {
    redirect({ href: "/login", locale });
    return null;
  }
  const t = await getTranslations("aiConnections");
  const rider = await connectingRider(ctx, Number(todayInCopenhagen().slice(0, 4)));
  const [connections, actions] =
    "refused" in rider ? [[], []] : await Promise.all([listConnections(ctx), listAiActions(ctx)]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-2sm leading-relaxed">{t("intro")}</p>
      </div>

      {"refused" in rider ? (
        <p role="status" className="text-2sm leading-relaxed">
          {t(`refused.${rider.refused}`)}
        </p>
      ) : (
        <>
          <ConnectionsList
            connections={connections.map((c) => ({
              id: c.id,
              clientName: c.clientName,
              clientHost: c.clientHost,
              createdAt: c.createdAt.toISOString(),
              lastUsedAt: c.lastUsedAt?.toISOString() ?? null,
              permissions: c.permissions,
            }))}
          />
          <AiActionsList
            actions={actions.map((a) => ({
              id: a.id,
              tool: a.tool,
              label: a.label,
              createdAt: a.createdAt.toISOString(),
              undone: a.undoneAt !== null,
            }))}
          />
          <section className="flex flex-col gap-2">
            <h3 className="font-semibold">{t("howTitle")}</h3>
            <p className="text-2sm leading-relaxed">{t("howBody")}</p>
            <p className="text-2sm">
              {t("address")}{" "}
              <code className="bg-muted text-foreground rounded px-1.5 py-0.5 break-all">
                {MCP_RESOURCE}
              </code>
            </p>
            <ul className="text-2sm list-disc pl-5 leading-relaxed">
              <li>{t("claude")}</li>
              <li>{t("leChat")}</li>
              <li>{t("chatgpt")}</li>
            </ul>
            <p className="text-meta text-2sm leading-relaxed">{t("where")}</p>
          </section>
        </>
      )}
    </div>
  );
}
