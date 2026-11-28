import { protectedResourceMetadata } from "@/modules/mcp/discovery";

export const dynamic = "force-dynamic";

/** Where an assistant signs in to reach /api/mcp (RFC 9728, docs/adr/0118). */
export async function GET(request: Request, { params }: { params: Promise<{ rest?: string[] }> }) {
  return protectedResourceMetadata(request, (await params).rest);
}
