import { decodeFit, FitError, type FitFile } from "@/modules/fit";
import { readGpx } from "./gpx";
import { readTcx } from "./tcx";
import { gunzip, unzipActivity } from "./unpack";

/**
 * An uploaded activity in any of the formats riders' devices and services
 * give (ADR 0022): FIT, TCX, GPX, and any of them gzipped or in a zip.
 * The format is told from the bytes, not the name — a ".fit" that is XML
 * is read as the XML it is — and every format comes out as a `FitFile`,
 * so the summary, laps, climbs, zones and load read them all alike.
 *
 * Pure apart from Node's zlib: imports nothing from the database.
 */

export type ActivityFormat = "fit" | "tcx" | "gpx";
export type DecodedActivity = { fit: FitFile; format: ActivityFormat; title?: string };

/** An archive inside an archive is read once more, never deeper. */
const MAX_NESTING = 2;

type Sniffed = ActivityFormat | "gzip" | "zip";

export function sniffFormat(bytes: Uint8Array): Sniffed | null {
  if (bytes.byteLength >= 12) {
    const tag = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!);
    if (tag === ".FIT") return "fit";
  }
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) return "gzip";
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04)
    return "zip";
  // XML: the root element within the first few kilobytes, after the
  // declaration and any comments.
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 4096));
  if (/<(\w+:)?TrainingCenterDatabase[\s>]/.test(head)) return "tcx";
  if (/<(\w+:)?gpx[\s>]/.test(head)) return "gpx";
  return null;
}

export function decodeActivityFile(bytes: Uint8Array, depth = 0): DecodedActivity {
  const format = sniffFormat(bytes);
  if (format === "gzip" || format === "zip") {
    if (depth >= MAX_NESTING) throw new FitError("unsupported", "An archive nested too deep.");
    return decodeActivityFile(
      format === "gzip" ? gunzip(bytes) : unzipActivity(bytes).bytes,
      depth + 1,
    );
  }
  if (format === "fit") return { fit: decodeFit(bytes), format };
  if (format === "tcx" || format === "gpx") {
    const xml = new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/^﻿/, "");
    if (format === "tcx") return { fit: readTcx(xml), format };
    const { title, ...fit } = readGpx(xml);
    return { fit, format, title };
  }
  throw new FitError("unknown_format", "Not FIT, TCX, GPX, gzip or zip.");
}

/**
 * The format an original file is in, from its stored name, for the page:
 * "ride.gpx.gz" is a GPX file; a zip or a bare .gz says only that.
 */
export function formatOfName(fileName: string): ActivityFormat | "gz" | "zip" | null {
  const inner = /\.(fit|tcx|gpx)(\.gz)?$/i.exec(fileName);
  if (inner) return inner[1]!.toLowerCase() as ActivityFormat;
  const outer = /\.(gz|zip)$/i.exec(fileName);
  return outer ? (outer[1]!.toLowerCase() as "gz" | "zip") : null;
}

/** The name without the endings the upload knows, for a title. */
export function baseName(fileName: string): string {
  return fileName.replace(/(\.(fit|tcx|gpx))?(\.(gz|zip))?$/i, "");
}

/** File name endings the upload accepts. */
export const ACCEPTED_EXTENSIONS = [".fit", ".tcx", ".gpx", ".gz", ".zip"] as const;
