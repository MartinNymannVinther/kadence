import type { OrgContext } from "@/core/db/tenant";
import type { OrgExport } from "@/modules/export/service";
import { exportJsonStream } from "@/modules/export/stream";

/** Everything a stream sends, as one buffer. */
export async function drain(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** The JSON export as the route streams it, parsed. */
export async function jsonExport(ctx: OrgContext, data: OrgExport) {
  const text = (await drain(exportJsonStream(ctx, data))).toString("utf8");
  return JSON.parse(text) as {
    kadence: { format: number; exportedAt: string };
    organization: { id: string; name: string };
    tables: Record<string, Array<Record<string, unknown>>>;
  };
}
