import { NextResponse } from "next/server";
import { remindersOn } from "@/core/features";
import { callerKey, rateLimit } from "@/core/rate-limit";
import { runRemindersOnce } from "@/modules/push/timer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One reminder run now (docs/adr/0060), for an installation that would
 * rather drive reminders from its own scheduler than from the app's
 * timer. Safe to call from anywhere: a run sends only what is due and
 * marks it, so calling it again sends nothing twice, and it says nothing
 * about who has reminders. Public, so it keeps the throttle every public
 * endpoint has; without the key pair it is not there at all.
 */
export async function POST(request: Request) {
  if (!remindersOn()) return new NextResponse("Not found", { status: 404 });
  const limit = await rateLimit(callerKey(request.headers, "push-tick"), 6, 60_000);
  if (!limit.allowed)
    return new NextResponse(null, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  await runRemindersOnce();
  return NextResponse.json({ done: true });
}
