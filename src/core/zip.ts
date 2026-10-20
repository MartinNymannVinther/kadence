import { crc32 } from "./crc32";

/**
 * A ZIP archive written one file at a time, for handing out files that
 * are already compressed (a FIT file is small and dense) without holding
 * them all at once. Store-only: no deflate, so every entry is its own
 * bytes behind a header, and an archive of a thousand rides costs the
 * server one ride's memory at a time.
 *
 * `add()` returns the bytes to send for one file; `finish()` returns the
 * central directory that closes the archive. Names are UTF-8 (flag bit
 * 11). ZIP64 records are written when the archive passes 4 GB or 65,535
 * entries, which a club's whole history of rides can. A single file must
 * stay below 4 GB; uploads are capped far below that.
 *
 * The spreadsheet writer (`xlsx.ts`) keeps its own deflating writer: its
 * parts are text, built whole, and small.
 */

const UTF8_NAMES = 0x0800;
const MAX32 = 0xffffffff;
const MAX16 = 0xffff;

export type ZipFile = {
  /** Path inside the archive, with forward slashes. */
  name: string;
  data: Uint8Array;
  /** Shown as the file's date by an unpacker; 1980-01-01 if left out. */
  modified?: Date;
};

type Central = {
  name: Buffer;
  crc: number;
  size: number;
  offset: number;
  time: number;
  date: number;
};

/** MS-DOS time and date, the only kind a plain ZIP header holds. */
function dosDateTime(at: Date | undefined): { time: number; date: number } {
  if (!at || at.getUTCFullYear() < 1980) return { time: 0, date: 0x21 };
  const time = (at.getUTCHours() << 11) | (at.getUTCMinutes() << 5) | (at.getUTCSeconds() >> 1);
  const date =
    ((at.getUTCFullYear() - 1980) << 9) | ((at.getUTCMonth() + 1) << 5) | at.getUTCDate();
  return { time, date };
}

export class ZipWriter {
  private readonly entries: Central[] = [];
  private offset: number;

  /**
   * `startOffset` is how many bytes stand before the archive in the same
   * stream; zero for an archive of its own. Offsets in the directory are
   * counted from the start of the stream.
   */
  constructor(startOffset = 0) {
    this.offset = startOffset;
  }

  /** The local header and the bytes of one file. */
  add(file: ZipFile): Buffer[] {
    const name = Buffer.from(file.name, "utf8");
    const size = file.data.length;
    if (size >= MAX32) throw new Error("zip: a single file must stay below 4 GB");
    const crc = crc32(file.data);
    const { time, date } = dosDateTime(file.modified);

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed: 2.0
    local.writeUInt16LE(UTF8_NAMES, 6);
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18); // compressed size: the same, stored
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // no extra field
    name.copy(local, 30);

    this.entries.push({ name, crc, size, offset: this.offset, time, date });
    this.offset += local.length + size;
    return [local, Buffer.from(file.data.buffer, file.data.byteOffset, size)];
  }

  /** The central directory and the end records. Nothing may be added after. */
  finish(): Buffer {
    const start = this.offset;
    const parts: Buffer[] = this.entries.map((entry) => this.centralRecord(entry));
    const directorySize = parts.reduce((sum, part) => sum + part.length, 0);
    const count = this.entries.length;
    const zip64 = count >= MAX16 || start >= MAX32 || directorySize >= MAX32;

    if (zip64) {
      const record = Buffer.alloc(56);
      record.writeUInt32LE(0x06064b50, 0);
      record.writeBigUInt64LE(44n, 4); // size of the rest of this record
      record.writeUInt16LE(45, 12); // made by: 4.5
      record.writeUInt16LE(45, 14); // needed: 4.5
      record.writeUInt32LE(0, 16); // this disk
      record.writeUInt32LE(0, 20); // disk with the directory
      record.writeBigUInt64LE(BigInt(count), 24);
      record.writeBigUInt64LE(BigInt(count), 32);
      record.writeBigUInt64LE(BigInt(directorySize), 40);
      record.writeBigUInt64LE(BigInt(start), 48);

      const locator = Buffer.alloc(20);
      locator.writeUInt32LE(0x07064b50, 0);
      locator.writeUInt32LE(0, 4);
      locator.writeBigUInt64LE(BigInt(start + directorySize), 8);
      locator.writeUInt32LE(1, 16); // disks in total
      parts.push(record, locator);
    }

    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(Math.min(count, MAX16), 8);
    end.writeUInt16LE(Math.min(count, MAX16), 10);
    end.writeUInt32LE(Math.min(directorySize, MAX32), 12);
    end.writeUInt32LE(Math.min(start, MAX32), 16);
    end.writeUInt16LE(0, 20); // no comment
    parts.push(end);

    const out = Buffer.concat(parts);
    this.offset += out.length;
    return out;
  }

  private centralRecord(entry: Central): Buffer {
    // Past 4 GB the offset moves into a ZIP64 extra field; the sizes never do.
    const far = entry.offset >= MAX32;
    const extra = far ? 12 : 0;
    const record = Buffer.alloc(46 + entry.name.length + extra);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(far ? 45 : 20, 4); // made by
    record.writeUInt16LE(far ? 45 : 20, 6); // needed
    record.writeUInt16LE(UTF8_NAMES, 8);
    record.writeUInt16LE(0, 10); // stored
    record.writeUInt16LE(entry.time, 12);
    record.writeUInt16LE(entry.date, 14);
    record.writeUInt32LE(entry.crc, 16);
    record.writeUInt32LE(entry.size, 20);
    record.writeUInt32LE(entry.size, 24);
    record.writeUInt16LE(entry.name.length, 28);
    record.writeUInt16LE(extra, 30);
    record.writeUInt16LE(0, 32); // comment length
    record.writeUInt16LE(0, 34); // disk
    record.writeUInt16LE(0, 36); // internal attributes
    record.writeUInt32LE(0, 38); // external attributes
    record.writeUInt32LE(far ? MAX32 : entry.offset, 42);
    entry.name.copy(record, 46);
    if (far) {
      const at = 46 + entry.name.length;
      record.writeUInt16LE(0x0001, at); // ZIP64 extended information
      record.writeUInt16LE(8, at + 2);
      record.writeBigUInt64LE(BigInt(entry.offset), at + 4);
    }
    return record;
  }
}
