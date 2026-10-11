import { handleWebhook } from "@/modules/devices/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Wahoo's, Garmin's and Polar's notifications: rate limited, capped,
 * verified, put in the queue as a job per event and answered; the worker
 * fetches the file and imports it as the rider (src/modules/devices/webhooks.ts,
 * docs/adr/0085).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  return handleWebhook(provider, request);
}
