/**
 * The FIT checksum: a CRC-16 with the reflected polynomial 0xA001 and a
 * zero start, computed four bits at a time from Garmin's sixteen-entry
 * table (the FIT SDK's `FitCRC_Get16`). It is the checksum known as
 * CRC-16/ARC, whose check value for the ASCII bytes "123456789" is 0xBB3D.
 *
 * A file carries two: an optional one in a fourteen-byte header over the
 * twelve bytes before it, and one after the data over everything from the
 * first header byte to the last data byte. Run over a whole file, its
 * trailing checksum included, the result is zero.
 */

const TABLE = [
  0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001, 0x6c00, 0x7800, 0xb401,
  0x5000, 0x9c01, 0x8801, 0x4400,
] as const;

/** The checksum `crc` carried on by one more byte: the low nibble, then the high one. */
export function fitCrcByte(crc: number, byte: number): number {
  let tmp = TABLE[crc & 0xf] ?? 0;
  crc = (crc >> 4) & 0x0fff;
  crc = crc ^ tmp ^ (TABLE[byte & 0xf] ?? 0);

  tmp = TABLE[crc & 0xf] ?? 0;
  crc = (crc >> 4) & 0x0fff;
  return crc ^ tmp ^ (TABLE[(byte >> 4) & 0xf] ?? 0);
}

/** The checksum of `bytes[start..end)`, carried on from `initial`. */
export function fitCrc(bytes: Uint8Array, start = 0, end = bytes.length, initial = 0): number {
  let crc = initial;
  for (let i = start; i < end; i++) crc = fitCrcByte(crc, bytes[i] ?? 0);
  return crc;
}
