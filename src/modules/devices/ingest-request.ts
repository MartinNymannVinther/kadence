import { sniffFormat } from "@/modules/files";
import { DeviceHttpError } from "./http";
import { MAX_UPLOAD_BYTES } from "./import";

/**
 * What a helper sent to the upload key's door (src/modules/devices/ingest.ts):
 * the one file in the request and the name it came with. Everything here
 * is untrusted input: the body is read up to the upload's cap and no
 * further, within a deadline, whatever Content-Length claims; a form
 * holds one file; and a name is only ever a name.
 */

/** What a form adds around the file. */
const FORM_OVERHEAD = 64 * 1024;
/** A body that has not arrived by now is not coming: a stalled request holds a place in the queue. */
export const BODY_DEADLINE_MS = 60_000;

export type Received = { bytes: Uint8Array; name: string | null };
export type Unreceived = { status: 400 | 408 | 413; reason: string };

/**
 * Reads a body up to `cap` bytes, and gives up at the deadline. The
 * reader is cancelled from the timer, which is what ends a read that is
 * waiting for bytes that never come.
 */
export async function readWithin(
  body: ReadableStream<Uint8Array> | null,
  cap: number,
  declared: string | null,
  deadlineMs: number = BODY_DEADLINE_MS,
): Promise<Uint8Array> {
  const length = Number(declared ?? Number.NaN);
  if (Number.isFinite(length) && length > cap) {
    await body?.cancel().catch(() => undefined);
    throw new DeviceHttpError("too_large");
  }
  if (!body) return new Uint8Array(0);
  const reader = body.getReader();
  let late = false;
  const timer = setTimeout(() => {
    late = true;
    void reader.cancel().catch(() => undefined);
  }, deadlineMs);
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch {
        throw new DeviceHttpError(late ? "timeout" : "network");
      }
      if (late) throw new DeviceHttpError("timeout");
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > cap) {
        await reader.cancel().catch(() => undefined);
        throw new DeviceHttpError("too_large");
      }
      chunks.push(chunk.value);
    }
  } finally {
    clearTimeout(timer);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}

/** The one file in the request: the body itself, or the `file` field of a form. */
export async function receive(request: Request): Promise<Received | Unreceived> {
  const type = (request.headers.get("content-type") ?? "").toLowerCase();
  const form = type.startsWith("multipart/form-data");
  let body: Uint8Array;
  try {
    body = await readWithin(
      request.body,
      MAX_UPLOAD_BYTES + (form ? FORM_OVERHEAD : 0),
      request.headers.get("content-length"),
    );
  } catch (error) {
    const code = error instanceof DeviceHttpError ? error.code : "network";
    if (code === "too_large") return { status: 413, reason: "too_large" };
    if (code === "timeout") return { status: 408, reason: "too_slow" };
    return { status: 400, reason: "invalid" };
  }

  if (!form) {
    if (body.byteLength === 0) return { status: 400, reason: "no_file" };
    return { bytes: body, name: nameOf(request) };
  }
  let files: File[];
  try {
    const data = await new Response(new Blob([body as Uint8Array<ArrayBuffer>]), {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
    files = data.getAll("file").filter((f): f is File => f instanceof File);
  } catch {
    return { status: 400, reason: "invalid" };
  }
  if (files.length === 0 || files[0]!.size === 0) return { status: 400, reason: "no_file" };
  if (files.length > 1) return { status: 400, reason: "too_many_files" };
  const file = files[0]!;
  if (file.size > MAX_UPLOAD_BYTES) return { status: 413, reason: "too_large" };
  return { bytes: new Uint8Array(await file.arrayBuffer()), name: file.name };
}

/** The name a bare body came with: `?name=`, or the Content-Disposition's. */
function nameOf(request: Request): string | null {
  const named = new URL(request.url).searchParams.get("name");
  if (named) return named;
  const disposition = request.headers.get("content-disposition") ?? "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]!);
  } catch {
    return match[1]!;
  }
}

/**
 * The name the file is stored under. What a helper sent is untrusted
 * text: the last part of a path, printable, one line, at most 200
 * characters. Without one, the file is named for what it is.
 */
export function storedName(raw: string | null, bytes: Uint8Array): { name: string; own: boolean } {
  const clean = (raw ?? "")
    .split(/[\\/]/)
    .pop()!
    .replace(/[\p{Cc}\p{Cf}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  if (clean) return { name: clean, own: true };
  const format = sniffFormat(bytes);
  const ending = format === "gzip" ? "gz" : format;
  return { name: ending ? `activity.${ending}` : "activity", own: false };
}
