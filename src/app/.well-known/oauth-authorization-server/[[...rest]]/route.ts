import { authorizationServerMetadata } from "@/modules/mcp/discovery";

export const dynamic = "force-dynamic";

/** What Kadence's authorization server offers an assistant (RFC 8414, docs/adr/0118). */
export async function GET(request: Request, { params }: { params: Promise<{ rest?: string[] }> }) {
  return authorizationServerMetadata(request, (await params).rest);
}
