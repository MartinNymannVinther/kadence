import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { Refused } from "@/core/action";
import { uploadKeys } from "@/core/db/schema";
import { withOrgContext } from "@/core/db/tenant";
import { callerKey, peekRateLimit, rateLimit } from "@/core/rate-limit";
import { loggable } from "./http";
import { inFlight } from "./in-flight";
import { importFitIn, knownFileHashes } from "./import";
import { receive, storedName, type Received } from "./ingest-request";
import { noteKeyUse, uploadKeyOwner, type KeyOwner } from "./upload-keys";

/**
 * A ride file handed over with an upload key and nobody signed in
 * (docs/adr/0029): from a script on the family's computer, an app on the
 * phone, anything that can send a file to an address. One request, one
 * ride; the answer's status says what became of it, so a helper knows
 * whether to go on, wait or stop:
 *
 *   201 imported · 200 already there · 400 no file in the request
 *   401 no key Kadence knows · 408 the file did not arrive in time
 *   413 too large · 422 not a ride Kadence can read
 *   429 wait (Retry-After) · 500 try again later
 *
 * The key is looked at before the body is read, so a stranger cannot make
 * Kadence hold a file in memory. `upload_key_owner` finds whose key it
 * is; from there everything runs as the rider, through the ordinary
 * import and the ordinary policies, exactly like the rider's own upload
 * and a device's webhook (ADR 0018). The file is untrusted input like
 * any other: capped, decoded by Kadence's own readers, refused rather
 * than guessed at.
 *
 * An answer says what became of the file and nothing else: not which
 * ride it became, not which session it landed on. A key brings rides in;
 * nothing comes out with it.
 *
 * Every limit but the address's is counted for the person, not the key:
 * a key removed and made again starts nothing afresh. Neither the key
 * nor anything about the file is logged.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
/** Every request from one address, with a key or without. */
const PER_ADDRESS = { count: 600, windowMs: 10 * MINUTE };
/** Requests from one address that named no key Kadence knows. */
const STRANGERS_PER_ADDRESS = { count: 20, windowMs: 10 * MINUTE };
/** Requests for one person, rides Kadence already has included. */
const PER_PERSON = { count: 600, windowMs: HOUR };
/** Files read for one person in an hour, whatever they turned out to be: reading is the work. */
export const FILES_READ_PER_HOUR = 120;
/** Files kept for one person in an hour, whichever door they came in by (ADR 0019). */
export const STORED_FILES_PER_HOUR = 60;
/** Files being read for one person at the same moment. */
const IN_FLIGHT = 2;

export const storedFilesKey = (userId: string) => `upload-files:${userId}`;
export const readFilesKey = (userId: string) => `ingest-read:${userId}`;

type Answer =
  | { status: "ok" }
  | { status: "imported" }
  | { status: "duplicate" }
  | { status: "refused"; reason: string };

function answer(code: number, body: Answer, retryAfterSeconds?: number): Response {
  return Response.json(body, {
    status: code,
    headers: {
      "Cache-Control": "no-store",
      ...(code === 401 ? { "WWW-Authenticate": 'Bearer realm="kadence"' } : {}),
      ...(retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : {}),
    },
  });
}

const refuse = (code: number, reason: string, retryAfterSeconds?: number) =>
  answer(code, { status: "refused", reason }, retryAfterSeconds);

function bearerOf(headers: Headers): string {
  const match = /^Bearer\s+(\S+)$/i.exec(headers.get("authorization")?.trim() ?? "");
  return match?.[1] ?? "";
}

/**
 * Who is asking: the owner of the key in the request, or the refusal to
 * answer with. A key Kadence knows is served whatever else has come from
 * the same address — a club house shares one — and a key it does not
 * know costs the address one of a few tries. The keys are too long to
 * guess; the limit keeps a loop from filling the log.
 */
async function admit(request: Request): Promise<KeyOwner | Response> {
  const address = rateLimit(
    callerKey(request.headers, "ingest"),
    PER_ADDRESS.count,
    PER_ADDRESS.windowMs,
  );
  if (!address.allowed) return refuse(429, "rate_limited", address.retryAfterSeconds);

  const owner = await uploadKeyOwner(bearerOf(request.headers));
  if (!owner) {
    const tried = rateLimit(
      callerKey(request.headers, "ingest-strangers"),
      STRANGERS_PER_ADDRESS.count,
      STRANGERS_PER_ADDRESS.windowMs,
    );
    return tried.allowed
      ? refuse(401, "unauthorized")
      : refuse(429, "rate_limited", tried.retryAfterSeconds);
  }
  const person = rateLimit(
    `ingest-person:${owner.riderUserId}`,
    PER_PERSON.count,
    PER_PERSON.windowMs,
  );
  if (!person.allowed) return refuse(429, "rate_limited", person.retryAfterSeconds);
  return owner;
}

/** A helper asking whether its key works, without sending a ride. */
export async function handleIngestCheck(request: Request): Promise<Response> {
  try {
    const owner = await admit(request);
    if (owner instanceof Response) return owner;
    await noteKeyUse(owner);
    return answer(200, { status: "ok" });
  } catch (error) {
    console.error("ingest: check failed", loggable(error));
    return refuse(500, "generic");
  }
}

const reading = inFlight(IN_FLIGHT);

/** Only for tests: how many files are being read for a person right now. */
export function readingNow(userId: string): number {
  return reading.count(userId);
}

export async function handleIngest(request: Request): Promise<Response> {
  let owner: KeyOwner | Response;
  try {
    owner = await admit(request);
  } catch (error) {
    console.error("ingest: failed", loggable(error));
    return refuse(500, "generic");
  }
  if (owner instanceof Response) return owner;
  if (!reading.enter(owner.riderUserId)) return refuse(429, "busy", 5);
  try {
    const received = await receive(request);
    if ("status" in received) return refuse(received.status, received.reason);
    return await keep(owner, received);
  } catch (error) {
    // The rider left, or the key was removed, while the file was on its way.
    if (error instanceof Refused) return refuse(401, "unauthorized");
    console.error("ingest: failed", loggable(error));
    return refuse(500, "generic");
  } finally {
    reading.leave(owner.riderUserId);
  }
}

/** Imports the file as the rider, and notes on the key how it went. */
async function keep(owner: KeyOwner, received: Received): Promise<Response> {
  const riderCtx = { orgId: owner.orgId, userId: owner.riderUserId };
  const sha256 = createHash("sha256").update(received.bytes).digest("hex");
  // A ride Kadence has is answered before anything is counted: sending
  // everything again is never what uses the hour up.
  if ((await knownFileHashes(riderCtx, owner.riderId, [sha256])).length > 0) {
    await noteKeyUse(owner, "");
    return answer(200, { status: "duplicate" });
  }
  const stored = storedFilesKey(owner.riderUserId);
  const room = peekRateLimit(stored, STORED_FILES_PER_HOUR);
  if (!room.allowed) return refuse(429, "rate_limited", room.retryAfterSeconds);
  // Counted before the file is read, not after: a file that turns out to
  // be the ride of another file, or no ride at all, was read all the same.
  const read = rateLimit(readFilesKey(owner.riderUserId), FILES_READ_PER_HOUR, HOUR);
  if (!read.allowed) return refuse(429, "rate_limited", read.retryAfterSeconds);

  const { name, own } = storedName(received.name, received.bytes);
  try {
    await withOrgContext(riderCtx, async (tx) => {
      // The key was checked when the request came in. A file can take its
      // time, and a key removed in the meantime brings nothing in.
      const [key] = await tx
        .select({ id: uploadKeys.id })
        .from(uploadKeys)
        .where(eq(uploadKeys.id, owner.keyId));
      if (!key) throw new Refused("unauthorized");
      return importFitIn(tx, riderCtx, owner.riderId, name, received.bytes, {
        source: "fit",
        unnamed: !own,
        uploadKeyId: owner.keyId,
      });
    });
    rateLimit(stored, STORED_FILES_PER_HOUR, HOUR);
    await noteKeyUse(owner, "");
    return answer(201, { status: "imported" });
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    if (error.detail === "duplicate") {
      await noteKeyUse(owner, "");
      return answer(200, { status: "duplicate" });
    }
    if (error.code === "invalid") {
      await noteKeyUse(owner, "invalid_file");
      return error.detail === "too_large"
        ? refuse(413, "too_large")
        : refuse(422, error.detail ?? "invalid");
    }
    throw error;
  }
}
