import { gunzipSync, inflateRawSync } from "node:zlib";
import { FitError } from "@/modules/fit";

/**
 * Archives an activity arrives in: gzip (Strava's bulk export gzips every
 * ride) and zip (Garmin Connect's "export original" is a zip with the FIT
 * file inside). Unpacked with Node's own zlib, never past
 * `MAX_UNPACKED_BYTES` — a small file that inflates to gigabytes (a
 * "bomb") is refused while it inflates, not after.
 *
 * From a zip, the first entry whose name ends in .fit, .tcx or .gpx (or
 * one of those gzipped) is taken; directories, other files and entries
 * past `MAX_ZIP_ENTRIES` are not looked at. Only "stored" and "deflate"
 * entries are read, and an encrypted one is refused.
 */

export const MAX_UNPACKED_BYTES = 64 * 1024 * 1024;
export const MAX_ZIP_ENTRIES = 1_000;
const ACTIVITY_NAME = /\.(fit|tcx|gpx)(\.gz)?$/i;

const tooLarge = () => new FitError("too_large", "Unpacks to more than Kadence reads.");

export function gunzip(bytes: Uint8Array): Uint8Array {
  try {
    return gunzipSync(bytes, { maxOutputLength: MAX_UNPACKED_BYTES });
  } catch (error) {
    if ((error as { code?: string }).code === "ERR_BUFFER_TOO_LARGE") throw tooLarge();
    throw new FitError("corrupt", "The gzip data cannot be unpacked.");
  }
}

export type ZipEntry = { name: string; bytes: Uint8Array };

/** The first activity file in a zip, unpacked. */
export function unzipActivity(bytes: Uint8Array): ZipEntry {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (at: number) => view.getUint16(at, true);
  const u32 = (at: number) => view.getUint32(at, true);

  // The end-of-central-directory record: its signature, searched from the
  // end over at most the 64 KB a trailing comment may take.
  let eocd = -1;
  for (let at = bytes.byteLength - 22; at >= Math.max(0, bytes.byteLength - 22 - 0xffff); at--) {
    if (u32(at) === 0x06054b50) {
      eocd = at;
      break;
    }
  }
  if (eocd < 0) throw new FitError("corrupt", "No zip directory.");
  const count = u16(eocd + 10);
  let at = u32(eocd + 16);
  if (count > MAX_ZIP_ENTRIES) throw new FitError("too_large", "Too many files in the zip.");

  for (let i = 0; i < count; i++) {
    if (at + 46 > bytes.byteLength || u32(at) !== 0x02014b50)
      throw new FitError("corrupt", "A broken zip directory.");
    const flags = u16(at + 8);
    const method = u16(at + 10);
    const packed = u32(at + 20);
    const size = u32(at + 24);
    const nameLength = u16(at + 28);
    const extra = u16(at + 30);
    const comment = u16(at + 32);
    const local = u32(at + 42);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extra + comment;
    if (!ACTIVITY_NAME.test(name) || name.endsWith("/")) continue;
    if (flags & 1) throw new FitError("unsupported", "An encrypted zip entry.");
    if (size > MAX_UNPACKED_BYTES) throw tooLarge();

    if (local + 30 > bytes.byteLength || u32(local) !== 0x04034b50)
      throw new FitError("corrupt", "A broken zip entry.");
    const start = local + 30 + u16(local + 26) + u16(local + 28);
    if (start + packed > bytes.byteLength)
      throw new FitError("truncated", "A zip entry runs past the end.");
    const data = bytes.subarray(start, start + packed);
    if (method === 0) return { name, bytes: data };
    if (method !== 8) throw new FitError("unsupported", `Zip compression method ${method}.`);
    try {
      return { name, bytes: inflateRawSync(data, { maxOutputLength: MAX_UNPACKED_BYTES }) };
    } catch (error) {
      if ((error as { code?: string }).code === "ERR_BUFFER_TOO_LARGE") throw tooLarge();
      throw new FitError("corrupt", "A zip entry cannot be unpacked.");
    }
  }
  throw new FitError("no_activity", "No .fit, .tcx or .gpx file in the zip.");
}
