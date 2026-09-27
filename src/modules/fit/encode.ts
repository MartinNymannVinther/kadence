import {
  baseTypeByName,
  baseTypeByte,
  writeValue,
  type BaseType,
  type BaseTypeName,
  type FieldValue,
} from "./base-types";
import { fitCrc } from "./crc";
import { writeHeader, type HeaderOptions } from "./header";

/**
 * A small FIT writer: definition and data messages for whatever global
 * messages the caller names, then the header and checksum around them.
 * Kadence uses it for workout files, and the tests use it to build the
 * rides the decoder reads back.
 *
 *     const fit = new FitWriter()
 *       .define(0, MESG.fileId, [{ num: 0, type: "enum" }, { num: 1, type: "uint16" }])
 *       .write(0, { 0: FILE_TYPE.workout, 1: MANUFACTURER.development })
 *       .finish();
 *
 * Values are FIT's raw integers — the caller applies scales and offsets.
 * A field left out, `null` or `undefined` is written as the type's "no
 * value". Misuse (a local type out of range, data before its definition, a
 * number that does not fit its type) is a bug and throws.
 */

export interface FitFieldSpec {
  num: number;
  type: BaseTypeName;
  /** Bytes; the type's own size unless given. Strings must say how long they are. */
  size?: number;
}

export interface FitDeveloperFieldSpec {
  num: number;
  size: number;
  devIndex: number;
}

export interface FitDefineOptions {
  bigEndian?: boolean;
  developerFields?: readonly FitDeveloperFieldSpec[];
}

export interface FitWriteOptions {
  /**
   * Write a compressed timestamp header instead of a normal one: the low
   * five bits of the message's time in seconds. Only local types 0–3.
   */
  timeOffset?: number;
  /** The developer fields' bytes, exactly as many as the definition declared. */
  developerData?: Uint8Array;
}

export type FitValues = Readonly<Record<number, FieldValue | null | undefined>>;

interface LocalDefinition {
  littleEndian: boolean;
  fields: { num: number; type: BaseType; size: number }[];
  size: number;
  developerSize: number;
}

/** An append-only byte buffer that doubles as it fills. */
class ByteSink {
  private buffer = new Uint8Array(4096);
  length = 0;

  /** Room for `n` more bytes, zeroed: where they start and a view to write them. */
  take(n: number): { view: DataView; at: number } {
    if (this.length + n > this.buffer.length) {
      let capacity = this.buffer.length * 2;
      while (capacity < this.length + n) capacity *= 2;
      const grown = new Uint8Array(capacity);
      grown.set(this.buffer.subarray(0, this.length));
      this.buffer = grown;
    }
    const at = this.length;
    this.length += n;
    return { view: new DataView(this.buffer.buffer), at };
  }

  append(bytes: Uint8Array): void {
    const { at } = this.take(bytes.length);
    this.buffer.set(bytes, at);
  }

  bytes(): Uint8Array {
    return this.buffer.subarray(0, this.length);
  }
}

export class FitWriter {
  private readonly sink = new ByteSink();
  private readonly locals = new Map<number, LocalDefinition>();

  constructor(private readonly header: HeaderOptions = {}) {}

  /** Binds local type `local` (0–15) to global message `global` with these fields. */
  define(
    local: number,
    global: number,
    fields: readonly FitFieldSpec[],
    options: FitDefineOptions = {},
  ): this {
    checkInt(local, 0, 15, "local message type");
    checkInt(global, 0, 0xffff, "global message number");
    const developer = options.developerFields ?? [];
    if (fields.length > 255 || developer.length > 255) throw new RangeError("Too many fields.");

    const resolved = fields.map((field) => {
      checkInt(field.num, 0, 255, "field number");
      const type = baseTypeByName(field.type);
      if (type.name === "string" && field.size === undefined)
        throw new RangeError(`String field ${field.num} needs a size.`);
      const size = field.size ?? type.size;
      checkInt(size, 1, 255, "field size");
      return { num: field.num, type, size };
    });

    const littleEndian = !options.bigEndian;
    const length = 6 + resolved.length * 3 + (developer.length > 0 ? 1 + developer.length * 3 : 0);
    const { view, at } = this.sink.take(length);
    view.setUint8(at, 0x40 | (developer.length > 0 ? 0x20 : 0) | local);
    view.setUint8(at + 1, 0); // reserved
    view.setUint8(at + 2, littleEndian ? 0 : 1);
    view.setUint16(at + 3, global, littleEndian);
    view.setUint8(at + 5, resolved.length);
    let pos = at + 6;
    for (const field of resolved) {
      view.setUint8(pos, field.num);
      view.setUint8(pos + 1, field.size);
      view.setUint8(pos + 2, baseTypeByte(field.type));
      pos += 3;
    }
    let developerSize = 0;
    if (developer.length > 0) {
      view.setUint8(pos++, developer.length);
      for (const field of developer) {
        checkInt(field.size, 1, 255, "developer field size");
        view.setUint8(pos, field.num);
        view.setUint8(pos + 1, field.size);
        view.setUint8(pos + 2, field.devIndex);
        developerSize += field.size;
        pos += 3;
      }
    }

    const size = resolved.reduce((sum, field) => sum + field.size, 0);
    this.locals.set(local, { littleEndian, fields: resolved, size, developerSize });
    return this;
  }

  /** One data message for local type `local`, its fields taken from `values` by number. */
  write(local: number, values: FitValues, options: FitWriteOptions = {}): this {
    const definition = this.locals.get(local);
    if (!definition) throw new RangeError(`Local message ${local} has no definition.`);
    const developer = options.developerData ?? new Uint8Array(0);
    if (developer.length !== definition.developerSize)
      throw new RangeError(`Expected ${definition.developerSize} bytes of developer data.`);

    let header = local;
    if (options.timeOffset !== undefined) {
      checkInt(local, 0, 3, "local message type of a compressed timestamp");
      header = 0x80 | (local << 5) | (options.timeOffset & 0x1f);
    }

    const { view, at } = this.sink.take(1 + definition.size);
    view.setUint8(at, header);
    let pos = at + 1;
    for (const field of definition.fields) {
      writeValue(view, pos, field.size, field.type, values[field.num], definition.littleEndian);
      pos += field.size;
    }
    this.sink.append(developer);
    return this;
  }

  /** Bytes as they are, for tests that need a file to break a rule the writer keeps. */
  raw(bytes: Uint8Array): this {
    this.sink.append(bytes);
    return this;
  }

  /** The finished file: header, the messages written so far, and the checksum over both. */
  finish(): Uint8Array {
    const data = this.sink.bytes();
    const header = writeHeader(data.length, this.header);
    const out = new Uint8Array(header.length + data.length + 2);
    out.set(header, 0);
    out.set(data, header.length);
    const crc = fitCrc(out, 0, header.length + data.length);
    new DataView(out.buffer).setUint16(out.length - 2, crc, true);
    return out;
  }
}

function checkInt(value: number, min: number, max: number, what: string): void {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new RangeError(`A ${what} must be ${min}–${max}, not ${value}.`);
}
