/**
 * Little-endian reading of a Bluetooth characteristic's value, as the
 * GATT specifications lay them out. A value shorter than its flags promise
 * — a trainer's firmware bug, a notification cut short — ends the reading
 * rather than throwing: every read after the end is `undefined`, and the
 * parsers keep what they had.
 */
export class Bytes {
  private at = 0;
  constructor(private readonly view: DataView) {}

  private take(size: number): number | undefined {
    if (this.at + size > this.view.byteLength) {
      this.at = this.view.byteLength;
      return undefined;
    }
    const start = this.at;
    this.at += size;
    return start;
  }

  u8(): number | undefined {
    const i = this.take(1);
    return i === undefined ? undefined : this.view.getUint8(i);
  }

  u16(): number | undefined {
    const i = this.take(2);
    return i === undefined ? undefined : this.view.getUint16(i, true);
  }

  s16(): number | undefined {
    const i = this.take(2);
    return i === undefined ? undefined : this.view.getInt16(i, true);
  }

  u24(): number | undefined {
    const i = this.take(3);
    return i === undefined
      ? undefined
      : this.view.getUint16(i, true) + (this.view.getUint8(i + 2) << 16);
  }

  u32(): number | undefined {
    const i = this.take(4);
    return i === undefined ? undefined : this.view.getUint32(i, true);
  }

  skip(size: number): void {
    this.take(size);
  }
}

/** A DataView over these bytes, for writing to a characteristic and for the tests. */
export function viewOf(bytes: readonly number[]): DataView {
  return new DataView(Uint8Array.from(bytes).buffer);
}
