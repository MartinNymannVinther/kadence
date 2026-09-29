"use client";

import { stravaPrefix } from "@/modules/files/strava-archive";
import { dataOffset, readZipIndex, type ZipIndexEntry } from "@/modules/files/zip-index";

/**
 * An archive a rider picked, read in the browser (ADR 0030): a zip file,
 * or the folder it was unpacked into. Either way it is a list of paths and
 * a way to read one, so the Strava import does not care which. A zip is
 * read through slices of the file — its directory, then each entry asked
 * for — and unpacked with the browser's own DecompressionStream, so an
 * archive of gigabytes is never held in memory whole. Nothing is written
 * anywhere; nothing leaves the browser here.
 */

export type ArchiveSource = {
  /** Every file in the archive, with forward slashes. */
  paths: string[];
  /** One file's bytes; refused past `cap`. */
  read(path: string, cap?: number): Promise<Uint8Array>;
};

/** The upload's own cap on a file (src/modules/devices/import.ts). */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export class ArchiveUnreadable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArchiveUnreadable";
  }
}

/** Whether this browser can unpack a zip's entries: deflate-raw came to every engine in 2023. */
export function canOpenZip(): boolean {
  try {
    new DecompressionStream("deflate-raw");
    return true;
  } catch {
    return false;
  }
}

async function collect(stream: ReadableStream<Uint8Array>, cap: number): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    // Refused while it unpacks, not after: a small entry can unpack to gigabytes.
    if (total > cap) {
      await reader.cancel().catch(() => undefined);
      throw new ArchiveUnreadable("An entry unpacks past the cap.");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}

export async function openZip(file: Blob): Promise<ArchiveSource> {
  const read = async (start: number, end: number) =>
    new Uint8Array(await file.slice(start, end).arrayBuffer());
  const entries = new Map<string, ZipIndexEntry>();
  for (const entry of await readZipIndex(read, file.size))
    if (!entry.name.endsWith("/")) entries.set(entry.name, entry);

  return {
    paths: [...entries.keys()],
    async read(path, cap = MAX_FILE_BYTES) {
      const entry = entries.get(path);
      if (!entry) throw new ArchiveUnreadable("No such entry.");
      if (entry.encrypted || (entry.method !== 0 && entry.method !== 8))
        throw new ArchiveUnreadable("An entry this browser cannot unpack.");
      if (entry.size > cap || entry.compressedSize > cap)
        throw new ArchiveUnreadable("An entry past the cap.");
      const start = dataOffset(entry, await read(entry.localOffset, entry.localOffset + 30));
      const packed = file.slice(start, start + entry.compressedSize);
      if (packed.size < entry.compressedSize) throw new ArchiveUnreadable("A cut-off entry.");
      if (entry.method === 0) return new Uint8Array(await packed.arrayBuffer());
      try {
        return await collect(
          packed.stream().pipeThrough(new DecompressionStream("deflate-raw")),
          cap,
        );
      } catch (error) {
        if (error instanceof ArchiveUnreadable) throw error;
        throw new ArchiveUnreadable("An entry that does not unpack.");
      }
    },
  };
}

/** A folder the browser handed over, file by file, each under its path in the folder. */
export function openFolder(files: ReadonlyArray<{ path: string; file: File }>): ArchiveSource {
  const byPath = new Map(files.map((f) => [f.path, f.file]));
  return {
    paths: [...byPath.keys()],
    async read(path, cap = MAX_FILE_BYTES) {
      const file = byPath.get(path);
      if (!file) throw new ArchiveUnreadable("No such file.");
      if (file.size > cap) throw new ArchiveUnreadable("A file past the cap.");
      return new Uint8Array(await file.arrayBuffer());
    },
  };
}

export type ZipKind = { strava: ArchiveSource } | { cannotOpen: true } | null;

/**
 * Whether a picked file is a Strava archive: a zip whose directory has
 * `activities.csv` at the top. Only the directory is read, so a zip that
 * is something else goes on to the ordinary upload at once. A browser that
 * cannot unpack says so for a zip too large for the upload to take.
 */
export async function recogniseZip(file: File): Promise<ZipKind> {
  if (!/\.zip$/i.test(file.name) && !/zip/i.test(file.type)) return null;
  try {
    const source = await openZip(file);
    if (stravaPrefix(source.paths) === null) return null;
    return canOpenZip() ? { strava: source } : { cannotOpen: true };
  } catch {
    return null;
  }
}
