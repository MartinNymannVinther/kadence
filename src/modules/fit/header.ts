import { fitCrc } from "./crc";
import { FitError } from "./errors";

/**
 * The file header: twelve bytes, or fourteen with a checksum of its own.
 *
 *   0      header size, 12 or 14
 *   1      protocol version, the major in the high nibble (0x10 = 1.0,
 *          0x20 = 2.0, which added developer fields)
 *   2–3    profile version (2132 = 21.32)
 *   4–7    size of the data records in bytes — not counting the header or
 *          the two-byte checksum after the data
 *   8–11   ".FIT"
 *   12–13  checksum of bytes 0–11; zero when the writer did not compute it
 *
 * The header is little endian whatever the messages after it are. A header
 * of another size is refused as unsupported rather than skipped: the
 * protocol leaves room for longer ones, but no device Kadence knows of
 * writes them, and a stranger reading would be a guess.
 */
export interface FitHeader {
  headerSize: 12 | 14;
  protocolVersion: number;
  profileVersion: number;
  dataSize: number;
  /** False only when a fourteen-byte header carries a checksum that does not match. */
  headerCrcOk: boolean;
}

export interface HeaderOptions {
  headerSize?: 12 | 14;
  protocolVersion?: number;
  profileVersion?: number;
}

/** ".FIT" in ASCII. */
const SIGNATURE = [0x2e, 0x46, 0x49, 0x54] as const;

/** The newest protocol major version this decoder reads. */
const MAX_PROTOCOL_MAJOR = 2;

export function readHeader(bytes: Uint8Array): FitHeader {
  if (bytes.length < 12) throw new FitError("not_fit", "Too short to be a FIT file.");
  for (let i = 0; i < SIGNATURE.length; i++)
    if (bytes[8 + i] !== SIGNATURE[i]) throw new FitError("not_fit", "No .FIT signature.");

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerSize = view.getUint8(0);
  if (headerSize !== 12 && headerSize !== 14)
    throw new FitError("unsupported", `A FIT header of ${headerSize} bytes.`);
  if (bytes.length < headerSize) throw new FitError("truncated", "The header is cut short.");

  const protocolVersion = view.getUint8(1);
  if (protocolVersion >> 4 > MAX_PROTOCOL_MAJOR)
    throw new FitError(
      "unsupported",
      `FIT protocol ${protocolVersion >> 4}.${protocolVersion & 0xf}.`,
    );

  let headerCrcOk = true;
  if (headerSize === 14) {
    const stored = view.getUint16(12, true);
    headerCrcOk = stored === 0 || stored === fitCrc(bytes, 0, 12);
  }

  return {
    headerSize,
    protocolVersion,
    profileVersion: view.getUint16(2, true),
    dataSize: view.getUint32(4, true),
    headerCrcOk,
  };
}

/** A header for `dataSize` bytes of records; fourteen bytes with its checksum unless asked for twelve. */
export function writeHeader(dataSize: number, options: HeaderOptions = {}): Uint8Array {
  const size = options.headerSize ?? 14;
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  view.setUint8(0, size);
  view.setUint8(1, options.protocolVersion ?? 0x20);
  view.setUint16(2, options.profileVersion ?? 2132, true);
  view.setUint32(4, dataSize, true);
  out.set(SIGNATURE, 8);
  if (size === 14) view.setUint16(12, fitCrc(out, 0, 12), true);
  return out;
}
