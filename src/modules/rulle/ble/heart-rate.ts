import { Bytes } from "./bytes";

/**
 * The Heart Rate Service's measurement (0x2A37): a chest strap's or a
 * watch's pulse. The first flag bit says whether the value is one byte or
 * two; a strap that says it has lost contact with the skin is not read as
 * a pulse (Heart Rate Service 1.0, 3.1). Pure.
 */
export function parseHeartRate(view: DataView): number | null {
  const bytes = new Bytes(view);
  const flags = bytes.u8();
  if (flags === undefined) return null;
  const wide = (flags & 0x01) !== 0;
  const contactSupported = (flags & 0x04) !== 0;
  const contact = (flags & 0x02) !== 0;
  if (contactSupported && !contact) return null;
  const bpm = wide ? bytes.u16() : bytes.u8();
  return bpm !== undefined && bpm >= 25 && bpm <= 250 ? bpm : null;
}
