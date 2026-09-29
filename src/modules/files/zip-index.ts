/**
 * The directory of a zip file, read through a function that hands back a
 * byte range (ADR 0030). In the browser that range is a slice of the file
 * the rider picked, so an archive of gigabytes is never held in memory:
 * only its tail, its directory and the entries asked for are read. The
 * directory is where a zip says what it holds; the entries themselves are
 * unpacked elsewhere (src/components/activities/read-archive.ts).
 *
 * ZIP64 is read, because an archive with years of photos passes 4 GB.
 * Nothing in the directory is trusted further than it is checked: every
 * offset must fall inside the file, and the number of entries and the
 * size of the directory are capped before either is read.
 *
 * Pure: no DOM, no Node, no database.
 */

export type ZipRead = (start: number, end: number) => Promise<Uint8Array>;

export type ZipIndexEntry = {
  name: string;
  /** 0 stored, 8 deflate; any other method is not read. */
  method: number;
  encrypted: boolean;
  compressedSize: number;
  size: number;
  /** Where the entry's local header starts. */
  localOffset: number;
};

export type ZipErrorCode = "not_zip" | "corrupt" | "too_large";

export class ZipError extends Error {
  constructor(
    readonly code: ZipErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ZipError";
  }
}

/** More entries than a rider's archive of many years with photos has. */
export const MAX_ZIP_INDEX_ENTRIES = 200_000;
export const MAX_DIRECTORY_BYTES = 64 * 1024 * 1024;

const END = 0x06054b50;
const END64 = 0x06064b50;
const LOCATOR64 = 0x07064b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;
const MAX16 = 0xffff;
const MAX32 = 0xffffffff;
const END_SIZE = 22;
const MAX_COMMENT = 0xffff;

const corrupt = (message: string) => new ZipError("corrupt", message);
const view = (bytes: Uint8Array) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

function u64(data: DataView, at: number): number {
  const value = data.getBigUint64(at, true);
  if (value > BigInt(Number.MAX_SAFE_INTEGER))
    throw corrupt("A zip64 value past what can be read.");
  return Number(value);
}

/** Where the directory is and how many entries it holds, from the end of the file. */
async function findDirectory(read: ZipRead, size: number) {
  if (size < END_SIZE) throw new ZipError("not_zip", "Too short to be a zip.");
  // The end record is the last thing in the file but for a comment of at
  // most 64 KB; the zip64 locator sits just before it.
  const tailStart = Math.max(0, size - END_SIZE - MAX_COMMENT - 20);
  const tail = await read(tailStart, size);
  const data = view(tail);
  let end = -1;
  for (let at = tail.byteLength - END_SIZE; at >= 0; at--) {
    if (data.getUint32(at, true) === END) {
      end = at;
      break;
    }
  }
  if (end < 0) throw new ZipError("not_zip", "No end of central directory.");

  let count = data.getUint16(end + 10, true);
  let length = data.getUint32(end + 12, true);
  let offset = data.getUint32(end + 16, true);
  if (count === MAX16 || length === MAX32 || offset === MAX32) {
    const locator = end - 20;
    if (locator < 0 || data.getUint32(locator, true) !== LOCATOR64)
      throw corrupt("A zip64 archive without its locator.");
    const recordAt = u64(data, locator + 8);
    if (recordAt + 56 > size) throw corrupt("The zip64 record runs past the end.");
    const record = view(await read(recordAt, recordAt + 56));
    if (record.byteLength < 56 || record.getUint32(0, true) !== END64)
      throw corrupt("A broken zip64 record.");
    count = u64(record, 32);
    length = u64(record, 40);
    offset = u64(record, 48);
  }
  if (count > MAX_ZIP_INDEX_ENTRIES) throw new ZipError("too_large", "Too many entries.");
  if (length > MAX_DIRECTORY_BYTES) throw new ZipError("too_large", "The directory is too large.");
  if (offset + length > size) throw corrupt("The directory runs past the end.");
  return { count, length, offset };
}

/** The sizes and offset a zip64 entry keeps in its extra field, in the order the format gives. */
function zip64Values(
  extra: DataView,
  wanted: { size: boolean; compressed: boolean; offset: boolean },
) {
  for (let at = 0; at + 4 <= extra.byteLength;) {
    const id = extra.getUint16(at, true);
    const length = extra.getUint16(at + 2, true);
    if (at + 4 + length > extra.byteLength) break;
    if (id === 0x0001) {
      let field = at + 4;
      const next = () => {
        if (field + 8 > at + 4 + length) throw corrupt("A short zip64 extra field.");
        const value = u64(extra, field);
        field += 8;
        return value;
      };
      return {
        size: wanted.size ? next() : undefined,
        compressed: wanted.compressed ? next() : undefined,
        offset: wanted.offset ? next() : undefined,
      };
    }
    at += 4 + length;
  }
  throw corrupt("A zip64 entry without its extra field.");
}

export async function readZipIndex(read: ZipRead, size: number): Promise<ZipIndexEntry[]> {
  const { count, length, offset } = await findDirectory(read, size);
  const directory = await read(offset, offset + length);
  const data = view(directory);
  const utf8 = new TextDecoder("utf-8", { fatal: false });
  const entries: ZipIndexEntry[] = [];

  let at = 0;
  for (let i = 0; i < count; i++) {
    if (at + 46 > directory.byteLength || data.getUint32(at, true) !== CENTRAL)
      throw corrupt("A broken zip directory.");
    const flags = data.getUint16(at + 8, true);
    const method = data.getUint16(at + 10, true);
    let compressedSize = data.getUint32(at + 20, true);
    let entrySize = data.getUint32(at + 24, true);
    const nameLength = data.getUint16(at + 28, true);
    const extraLength = data.getUint16(at + 30, true);
    const commentLength = data.getUint16(at + 32, true);
    let localOffset = data.getUint32(at + 42, true);
    const nameStart = at + 46;
    const extraStart = nameStart + nameLength;
    const next = extraStart + extraLength + commentLength;
    if (next > directory.byteLength) throw corrupt("A zip entry runs past its directory.");

    const wanted = {
      size: entrySize === MAX32,
      compressed: compressedSize === MAX32,
      offset: localOffset === MAX32,
    };
    if (wanted.size || wanted.compressed || wanted.offset) {
      const values = zip64Values(
        new DataView(directory.buffer, directory.byteOffset + extraStart, extraLength),
        wanted,
      );
      entrySize = values.size ?? entrySize;
      compressedSize = values.compressed ?? compressedSize;
      localOffset = values.offset ?? localOffset;
    }
    if (localOffset + 30 + compressedSize > size) throw corrupt("A zip entry runs past the end.");

    entries.push({
      name: utf8.decode(directory.subarray(nameStart, extraStart)),
      method,
      encrypted: (flags & 1) === 1,
      compressedSize,
      size: entrySize,
      localOffset,
    });
    at = next;
  }
  return entries;
}

/** Where an entry's bytes start, from the first 30 bytes of its local header. */
export function dataOffset(entry: ZipIndexEntry, localHeader: Uint8Array): number {
  const data = view(localHeader);
  if (localHeader.byteLength < 30 || data.getUint32(0, true) !== LOCAL)
    throw corrupt("A broken zip entry.");
  return entry.localOffset + 30 + data.getUint16(26, true) + data.getUint16(28, true);
}
