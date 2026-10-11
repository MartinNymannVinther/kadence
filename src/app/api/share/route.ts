import { requireOrgContext } from "@/core/auth/guard";
import { env } from "@/core/env";
import { rateLimit } from "@/core/rate-limit";
import { fromAnotherSite } from "@/core/same-site";
import { DeviceHttpError, loggable, readLimited } from "@/modules/devices/http";
import { MAX_UPLOAD_BYTES } from "@/modules/devices/import";
import {
  importShared,
  MAX_SHARED_FILES,
  sharedLanding,
  sharingRider,
  type SharedFile,
} from "@/modules/devices/share";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;
const MAX_BODY_BYTES = MAX_UPLOAD_BYTES * MAX_SHARED_FILES + 64 * 1024;

/** A page to go to next, on this installation's own address. */
function land(path: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL(path, env.BETTER_AUTH_URL).toString(),
      "Cache-Control": "no-store",
    },
  });
}

/**
 * The installed app's share target (src/app/manifest.ts): the phone's
 * share sheet posts ride files here as a form. Every answer is a redirect
 * to a page, because what asked is a person looking at a screen, not a
 * program: the ride when one came in, today's page with a sentence
 * otherwise, the login when nobody is signed in. Counted with the
 * upload's requests, capped like it, and imported for the rider who is
 * signed in (src/modules/devices/share.ts). A share comes from the
 * person, not from a page: a request that a page on another site sent
 * is refused before anything is read (src/core/same-site.ts).
 */
export async function POST(request: Request) {
  if (fromAnotherSite(request)) return new Response(null, { status: 403 });
  const ctx = await requireOrgContext();
  if (!ctx) return land("/login");
  if (!(await rateLimit(`upload:${ctx.userId}`, 30, HOUR)).allowed)
    return land("/today?shared=rate_limited");
  // Before the files are read: only a rider has rides to share.
  if (!(await sharingRider(ctx))) return land("/today?shared=not_a_rider");

  let files: SharedFile[];
  try {
    const body = await readLimited(
      request.body,
      MAX_BODY_BYTES,
      request.headers.get("content-length"),
    );
    const form = await new Response(new Blob([body as Uint8Array<ArrayBuffer>]), {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
    const parts = form
      .getAll("file")
      .filter((f): f is File => f instanceof File && f.size > 0)
      .slice(0, MAX_SHARED_FILES);
    if (parts.some((f) => f.size > MAX_UPLOAD_BYTES))
      return land("/today?shared=refused&reason=too_large");
    files = await Promise.all(
      parts.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })),
    );
  } catch (error) {
    const tooLarge = error instanceof DeviceHttpError && error.code === "too_large";
    return land(tooLarge ? "/today?shared=refused&reason=too_large" : "/today?shared=no_file");
  }

  try {
    return land(sharedLanding(await importShared(ctx, files)));
  } catch (error) {
    console.error("share: import failed", loggable(error));
    return land("/today?shared=refused&reason=generic");
  }
}

/** Opened by hand, or by a browser that shares with GET: there is nothing here to see. */
export async function GET() {
  return land("/today");
}
