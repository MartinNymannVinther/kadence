import { baseTypeOf, readValue, type BaseType, type FieldValue } from "./base-types";
import { FitError } from "./errors";
import { FIELD_TIMESTAMP } from "./profile";

/**
 * The record layer of a FIT file: the loop that walks the bytes between the
 * header and the checksum, one message at a time.
 *
 * Every message starts with one header byte:
 * - bit 7 clear — a normal header. Bit 6 set means a definition message,
 *   clear a data message; on a definition, bit 5 says developer fields
 *   follow; bits 0–3 are the local message type (0–15).
 * - bit 7 set — a compressed timestamp header, always data. Bits 5–6 are
 *   the local message type (0–3), bits 0–4 the low five bits of the
 *   message's time: it is the last full timestamp with those five bits
 *   replaced, plus 32 when they went round.
 *
 * A definition binds a local type to a global message number, a byte order
 * (0 little, 1 big endian) and a list of fields — number, size in bytes,
 * base type — and, with the developer flag, developer fields: number, size
 * and developer data index. A data message is its fields' bytes in the
 * order its local type's definition lists them, developer fields last.
 * Kadence skips developer fields by their size and never reads them.
 *
 * Nothing here trusts a count or a size: every message is checked against
 * the end of the data before it is read, every pass consumes at least one
 * byte, and the definitions and messages a file may hold are capped.
 */

interface FieldDef {
  num: number;
  size: number;
  /** Bytes from the start of the message's data to this field. */
  offset: number;
  type: BaseType | undefined;
}

interface Definition {
  global: number;
  littleEndian: boolean;
  fields: FieldDef[];
  /** Bytes of one data message, developer fields included. */
  size: number;
  timestampField?: FieldDef;
}

export interface DataMessage {
  global: number;
  /** The fields that hold a value: "no value" and fields Kadence cannot read are absent. */
  fields: Map<number, FieldValue>;
  /** FIT seconds: field 253 when the message has it, else the time a compressed header gives. */
  timestamp?: number;
}

export interface StreamLimits {
  maxDefinitions: number;
  maxMessages: number;
}

/** Field reads one file may cost: ten times a long ride's worth. */
export const MAX_FIELD_READS = 20_000_000;

/**
 * Walks the messages in `bytes[start..end)` and hands every data message
 * whose global number is `wanted` to `onMessage`. Every other data message
 * is still read for its timestamp, which a later compressed header counts
 * from, and otherwise skipped unread.
 */
export function readMessages(
  bytes: Uint8Array,
  start: number,
  end: number,
  wanted: ReadonlySet<number>,
  limits: StreamLimits,
  onMessage: (message: DataMessage) => void,
): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const locals: (Definition | undefined)[] = new Array<Definition | undefined>(16).fill(undefined);
  let lastTimestamp: number | undefined;
  let definitions = 0;
  let messages = 0;
  // Field reads, the real cost of a file: a message of 255 one-byte fields
  // costs 255 reads for one byte of file. Capped so no file can hold the
  // event loop for long (the first review found 2 MB taking seconds).
  let work = 0;
  let pos = start;

  while (pos < end) {
    const header = view.getUint8(pos);
    pos += 1;
    if (++messages > limits.maxMessages)
      throw new FitError("too_large", `More than ${limits.maxMessages} messages.`);

    if ((header & 0x80) === 0 && (header & 0x40) !== 0) {
      if (++definitions > limits.maxDefinitions)
        throw new FitError("too_large", `More than ${limits.maxDefinitions} definitions.`);
      const { definition, next } = readDefinition(view, pos, end, (header & 0x20) !== 0);
      locals[header & 0x0f] = definition;
      pos = next;
      continue;
    }

    let local = header & 0x0f;
    let timestamp: number | undefined;
    if ((header & 0x80) !== 0) {
      local = (header >> 5) & 0x03;
      if (lastTimestamp === undefined)
        throw new FitError("corrupt", "A compressed timestamp with no earlier time to count from.");
      const offset = header & 0x1f;
      const low = lastTimestamp % 32;
      timestamp = lastTimestamp - low + offset + (offset < low ? 32 : 0);
      lastTimestamp = timestamp;
    }

    const definition = locals[local];
    if (!definition)
      throw new FitError("corrupt", `Data for local message ${local} before its definition.`);
    if (pos + definition.size > end)
      throw new FitError("truncated", "A message runs past the end of the data.");
    work += definition.fields.length + 1;
    if (work > MAX_FIELD_READS)
      throw new FitError("too_large", `More than ${MAX_FIELD_READS} field reads.`);

    const stamp = definition.timestampField;
    if (stamp) {
      const value = readValue(
        view,
        pos + stamp.offset,
        stamp.size,
        stamp.type,
        definition.littleEndian,
      );
      // A FIT time is a uint32; a file that declares it otherwise (a float
      // of 1e300) is not believed.
      if (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 0 &&
        value <= 0xffffffff
      ) {
        timestamp = value;
        lastTimestamp = value;
      }
    }

    if (wanted.has(definition.global)) {
      const fields = new Map<number, FieldValue>();
      for (const field of definition.fields) {
        const value = readValue(
          view,
          pos + field.offset,
          field.size,
          field.type,
          definition.littleEndian,
        );
        if (value !== undefined) fields.set(field.num, value);
      }
      onMessage({ global: definition.global, fields, timestamp });
    }
    pos += definition.size;
  }
}

function readDefinition(
  view: DataView,
  start: number,
  end: number,
  hasDeveloperFields: boolean,
): { definition: Definition; next: number } {
  const truncated = () => new FitError("truncated", "A definition runs past the end of the data.");
  let pos = start;
  // reserved, architecture, global message number (2), number of fields
  if (pos + 5 > end) throw truncated();
  const architecture = view.getUint8(pos + 1);
  if (architecture > 1) throw new FitError("corrupt", `Unknown byte order ${architecture}.`);
  const littleEndian = architecture === 0;
  const global = view.getUint16(pos + 2, littleEndian);
  const count = view.getUint8(pos + 4);
  pos += 5;

  if (pos + count * 3 > end) throw truncated();
  const fields: FieldDef[] = [];
  let size = 0;
  let timestampField: FieldDef | undefined;
  for (let i = 0; i < count; i++, pos += 3) {
    const field: FieldDef = {
      num: view.getUint8(pos),
      size: view.getUint8(pos + 1),
      offset: size,
      type: baseTypeOf(view.getUint8(pos + 2)),
    };
    // The protocol has no field of no bytes; one is a file built to cost
    // reads without taking space.
    if (field.size === 0) throw new FitError("corrupt", "A field of size zero.");
    fields.push(field);
    size += field.size;
    if (field.num === FIELD_TIMESTAMP) timestampField = field;
  }

  if (hasDeveloperFields) {
    if (pos + 1 > end) throw truncated();
    const developerCount = view.getUint8(pos);
    pos += 1;
    if (pos + developerCount * 3 > end) throw truncated();
    for (let i = 0; i < developerCount; i++, pos += 3) {
      const fieldSize = view.getUint8(pos + 1);
      if (fieldSize === 0) throw new FitError("corrupt", "A developer field of size zero.");
      size += fieldSize;
    }
  }

  return { definition: { global, littleEndian, fields, size, timestampField }, next: pos };
}
