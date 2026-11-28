import { notFound, redirect } from "next/navigation";
import { mcpOn } from "@/core/auth/mcp";
import { getSession } from "@/core/auth/session";
import { authorizeQuery, searchParamsOf } from "@/modules/mcp/authorize-query";

/**
 * Where Better Auth sends an assistant's sign-in (docs/adr/0118). Without a
 * session, to Kadence's own login, which comes back here; with one, on to
 * the authorize endpoint again, which goes to the consent page. Nothing is
 * shown here.
 */
export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!mcpOn()) notFound();
  const params = searchParamsOf(await searchParams);
  if (!params.get("client_id")) notFound();
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/connect?${params.toString()}`)}`);
  redirect(`/api/auth/oauth2/authorize?${authorizeQuery(params)}`);
}
