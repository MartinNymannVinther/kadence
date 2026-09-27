/**
 * FIT's base types: how many bytes a value takes, how it is read and
 * written, and which bit pattern means "no value".
 *
 * A definition names each field's base type in one byte: the low five bits
 * are the type's number, bit 7 says the type spans more than one byte and
 * so has a byte order. Kadence reads the number and ignores the flag, so a
 * writer that forgets to set it still reads.
 *
 * Every type reserves one pattern for "no value" — all ones for unsigned
 * types and enums, the largest positive value for signed ones, zero for the
 * `z` types, an empty string for strings. A device writes it when a sensor
 * has nothing to say; the decoder turns it into `undefined`, never into a
 * number.
 */

export type BaseTypeName =
  | "enum"
  | "sint8"
  | "uint8"
  | "sint16"
  | "uint16"
  | "sint32"
  | "uint32"
  | "string"
  | "float32"
  | "float64"
  | "uint8z"
  | "uint16z"
  | "uint32z"
  | "byte"
  | "sint64"
  | "uint64"
  | "uint64z";

export interface BaseType {
  /** The type's number, the low five bits of its byte in a definition. */
  readonly num: number;
  readonly name: BaseTypeName;
  /** Bytes per value. A field may be a multiple of it (an array). */
  readonly size: number;
}

/** A field's value once read: a number, or text for string fields. */
export type FieldValue = number | string;

const TYPES: readonly BaseType[] = [
  { num: 0, name: "enum", size: 1 },
  { num: 1, name: "sint8", size: 1 },
  { num: 2, name: "uint8", size: 1 },
  { num: 3, name: "sint16", size: 2 },
  { num: 4, name: "uint16", size: 2 },
  { num: 5, name: "sint32", size: 4 },
  { num: 6, name: "uint32", size: 4 },
  { num: 7, name: "string", size: 1 },
  { num: 8, name: "float32", size: 4 },
  { num: 9, name: "float64", size: 8 },
  { num: 10, name: "uint8z", size: 1 },
  { num: 11, name: "uint16z", size: 2 },
  { num: 12, name: "uint32z", size: 4 },
  { num: 13, name: "byte", size: 1 },
  { num: 14, name: "sint64", size: 8 },
  { num: 15, name: "uint64", size: 8 },
  { num: 16, name: "uint64z", size: 8 },
];

/** The "no value" pattern of each integer type up to four bytes wide. */
const INVALID: Partial<Record<BaseTypeName, number>> = {
  enum: 0xff,
  sint8: 0x7f,
  uint8: 0xff,
  sint16: 0x7fff,
  uint16: 0xffff,
  sint32: 0x7fffffff,
  uint32: 0xffffffff,
  uint8z: 0,
  uint16z: 0,
  uint32z: 0,
  byte: 0xff,
};

const INVALID_64: Partial<Record<BaseTypeName, bigint>> = {
  sint64: 0x7fffffffffffffffn,
  uint64: 0xffffffffffffffffn,
  uint64z: 0n,
};

/** The range a value of each integer type up to four bytes can hold. */
const RANGE: Partial<Record<BaseTypeName, readonly [number, number]>> = {
  enum: [0, 0xff],
  sint8: [-0x80, 0x7f],
  uint8: [0, 0xff],
  sint16: [-0x8000, 0x7fff],
  uint16: [0, 0xffff],
  sint32: [-0x80000000, 0x7fffffff],
  uint32: [0, 0xffffffff],
  uint8z: [0, 0xff],
  uint16z: [0, 0xffff],
  uint32z: [0, 0xffffffff],
  byte: [0, 0xff],
};

const SIGNED: ReadonlySet<BaseTypeName> = new Set(["sint8", "sint16", "sint32", "sint64"]);

const utf8Decoder = new TextDecoder("utf-8");
const utf8Encoder = new TextEncoder();

/** The base type a definition's byte names, or undefined for a number FIT does not define. */
export function baseTypeOf(byte: number): BaseType | undefined {
  return TYPES[byte & 0x1f];
}

export function baseTypeByName(name: BaseTypeName): BaseType {
  const type = TYPES.find((t) => t.name === name);
  if (!type) throw new RangeError(`No FIT base type ${name}.`);
  return type;
}

/** The byte a definition carries for a type: its number, with bit 7 set when it has a byte order. */
export function baseTypeByte(type: BaseType): number {
  return type.size > 1 ? 0x80 | type.num : type.num;
}

/**
 * Reads one field. Undefined for the type's "no value", for a type FIT does
 * not define, and for arrays — a numeric field wider than its type — which
 * no field Kadence reads is.
 */
export function readValue(
  view: DataView,
  offset: number,
  size: number,
  type: BaseType | undefined,
  littleEndian: boolean,
): FieldValue | undefined {
  if (type === undefined || size === 0) return undefined;
  if (type.name === "string") return readString(view, offset, size);
  if (size !== type.size) return undefined;
  switch (type.name) {
    case "float32":
      if (view.getUint32(offset, littleEndian) === 0xffffffff) return undefined;
      return finite(view.getFloat32(offset, littleEndian));
    case "float64":
      if (view.getBigUint64(offset, littleEndian) === 0xffffffffffffffffn) return undefined;
      return finite(view.getFloat64(offset, littleEndian));
    case "sint64":
    case "uint64":
    case "uint64z": {
      const raw =
        type.name === "sint64"
          ? view.getBigInt64(offset, littleEndian)
          : view.getBigUint64(offset, littleEndian);
      if (raw === INVALID_64[type.name]) return undefined;
      const safe = BigInt(Number.MAX_SAFE_INTEGER);
      return raw <= safe && raw >= -safe ? Number(raw) : undefined;
    }
  }
  const raw = readInteger(view, offset, type, littleEndian);
  return raw === INVALID[type.name] ? undefined : raw;
}

function readInteger(view: DataView, offset: number, type: BaseType, le: boolean): number {
  const signed = SIGNED.has(type.name);
  if (type.size === 1) return signed ? view.getInt8(offset) : view.getUint8(offset);
  if (type.size === 2) return signed ? view.getInt16(offset, le) : view.getUint16(offset, le);
  return signed ? view.getInt32(offset, le) : view.getUint32(offset, le);
}

/** UTF-8 up to the first NUL; an empty string is FIT's "no value". */
function readString(view: DataView, offset: number, size: number): string | undefined {
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, size);
  const nul = bytes.indexOf(0);
  const text = utf8Decoder.decode(nul === -1 ? bytes : bytes.subarray(0, nul));
  return text.length > 0 ? text : undefined;
}

function finite(value: number): number | undefined {
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Writes one field of `size` bytes. `null` or `undefined` writes the type's
 * "no value" (in every element of an array field); a string is cut at a
 * character boundary to leave room for its terminating NUL. A number that
 * does not fit the type is a bug in the caller and throws.
 */
export function writeValue(
  view: DataView,
  offset: number,
  size: number,
  type: BaseType,
  value: FieldValue | null | undefined,
  littleEndian: boolean,
): void {
  if (type.name === "string") {
    writeString(view, offset, size, typeof value === "string" ? value : "");
    return;
  }
  if (value === null || value === undefined) {
    for (let at = offset; at + type.size <= offset + size; at += type.size)
      writeInvalid(view, at, type, littleEndian);
    return;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || size !== type.size)
    throw new RangeError(`Cannot write ${String(value)} as a ${size}-byte ${type.name}.`);
  switch (type.name) {
    case "float32":
      view.setFloat32(offset, value, littleEndian);
      return;
    case "float64":
      view.setFloat64(offset, value, littleEndian);
      return;
    case "sint64":
      view.setBigInt64(offset, BigInt(Math.round(value)), littleEndian);
      return;
    case "uint64":
    case "uint64z":
      view.setBigUint64(offset, BigInt(Math.round(value)), littleEndian);
      return;
  }
  const rounded = Math.round(value);
  const [min, max] = RANGE[type.name] ?? [0, 0];
  if (rounded < min || rounded > max)
    throw new RangeError(`${value} does not fit a FIT ${type.name}.`);
  // Two's complement: a signed value written unsigned is the same bytes.
  const bits = rounded < 0 ? rounded + 2 ** (8 * type.size) : rounded;
  if (type.size === 1) view.setUint8(offset, bits);
  else if (type.size === 2) view.setUint16(offset, bits, littleEndian);
  else view.setUint32(offset, bits, littleEndian);
}

function writeInvalid(view: DataView, offset: number, type: BaseType, le: boolean): void {
  if (type.name === "float32") view.setUint32(offset, 0xffffffff, le);
  else if (type.name === "float64") view.setBigUint64(offset, 0xffffffffffffffffn, le);
  else if (type.name === "sint64") view.setBigInt64(offset, INVALID_64.sint64 ?? 0n, le);
  else if (type.size === 8) view.setBigUint64(offset, INVALID_64[type.name] ?? 0n, le);
  else {
    const pattern = INVALID[type.name] ?? 0;
    if (type.size === 1) view.setUint8(offset, pattern);
    else if (type.size === 2) view.setUint16(offset, pattern, le);
    else view.setUint32(offset, pattern, le);
  }
}

function writeString(view: DataView, offset: number, size: number, text: string): void {
  const bytes = truncateUtf8(utf8Encoder.encode(text), size - 1);
  for (let i = 0; i < size; i++) view.setUint8(offset + i, i < bytes.length ? (bytes[i] ?? 0) : 0);
}

/** At most `max` bytes of UTF-8, never ending inside a character. */
export function truncateUtf8(bytes: Uint8Array, max: number): Uint8Array {
  if (bytes.length <= max) return bytes;
  let cut = Math.max(0, max);
  // A continuation byte (10xxxxxx) at the cut means a character straddles it.
  while (cut > 0 && ((bytes[cut] ?? 0) & 0xc0) === 0x80) cut--;
  return bytes.subarray(0, cut);
}

/** Bytes a string field needs to hold `text` and its NUL, at most `max`. */
export function stringFieldSize(text: string, max: number): number {
  return truncateUtf8(utf8Encoder.encode(text), max - 1).length + 1;
}
