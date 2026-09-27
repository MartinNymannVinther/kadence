import { after } from "next/server";
import { handleWebhook } from "@/modules/devices/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Wahoo's and Garmin's notifications: rate limited, capped, verified, and
 * answered before the work — fetching the file and importing it as the
 * rider — runs after the response (src/modules/devices/webhooks.ts).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  return handleWebhook(provider, request, (work) => after(work));
}
