import { describe, expect, it } from "vitest";
import { dataOffset, readZipIndex, ZipError } from "@/modules/files/zip-index";
import { bytesOf, zip } from "./fixtures";

/**
 * A zip's directory, read through byte ranges (docs/adr/0030): every entry
 * with how it is packed and where it starts, behind a comment and in zip64,
 * without reading the entries themselves — and refused, not guessed at,
 * when the file is no zip or the directory points outside it.
 */

function reader(bytes: Uint8Array) {
  const reads: Array<[number, number]> = [];
  return {
    reads,
    read: async (start: number, end: number) => {
      reads.push([start, end]);
      return bytes.slice(start, end);
    },
  };
}

const three = [
  { name: "activities.csv", bytes: bytesOf("Filename\nactivities/1.fit.gz\n"), deflate: true },
  { name: "activities/", bytes: new Uint8Array() },
  { name: "activities/1.fit.gz", bytes: bytesOf("a ride, gzipped"), deflate: false },
];

const index = (bytes: Uint8Array) => readZipIndex(reader(bytes).read, bytes.byteLength);

describe("a zip's directory", () => {
  it("names every entry with how it is packed, its sizes and where it starts", async () => {
    const entries = await index(zip(three));
    expect(entries.map((e) => [e.name, e.method, e.size, e.encrypted])).toEqual([
      ["activities.csv", 8, three[0]!.bytes.byteLength, false],
      ["activities/", 0, 0, false],
      ["activities/1.fit.gz", 0, three[2]!.bytes.byteLength, false],
    ]);
    expect(entries[0]!.localOffset).toBe(0);
    expect(entries[2]!.localOffset).toBeGreaterThan(entries[1]!.localOffset);
  });

  it("is read from the end and the directory, never the entries themselves", async () => {
    const big = new Uint8Array(512 * 1024).fill(7);
    const bytes = zip([{ name: "activities/big.fit", bytes: big }, ...three]);
    const { read, reads } = reader(bytes);
    await readZipIndex(read, bytes.byteLength);
    // The tail (end record, and a comment's room) and the directory: nothing of the big entry.
    const readBytes = reads.reduce((sum, [start, end]) => sum + (end - start), 0);
    expect(readBytes).toBeLessThan(big.byteLength / 4);
  });

  it("is found behind a comment", async () => {
    const entries = await index(zip(three, { comment: "Strava export" }));
    expect(entries).toHaveLength(3);
  });

  it("reads the sizes and offsets of zip64", async () => {
    const plain = await index(zip(three));
    const wide = await index(zip(three, { zip64: true }));
    expect(wide).toEqual(plain);
  });

  it("says where an entry's bytes start, after its local header", async () => {
    const bytes = zip(three);
    const [, , ride] = await index(bytes);
    const start = dataOffset(ride!, bytes.slice(ride!.localOffset, ride!.localOffset + 30));
    expect(new TextDecoder().decode(bytes.slice(start, start + ride!.compressedSize))).toBe(
      "a ride, gzipped",
    );
    expect(() => dataOffset(ride!, new Uint8Array(30))).toThrow(ZipError);
  });

  it("refuses what is no zip", async () => {
    for (const bytes of [
      new Uint8Array(0),
      bytesOf("PK but nothing more"),
      bytesOf("x".repeat(100)),
    ])
      await expect(index(bytes)).rejects.toMatchObject({ code: "not_zip" });
  });

  it("refuses a directory that points outside the file", async () => {
    const bytes = zip(three);
    const end = bytes.byteLength - 22;
    const view = new DataView(bytes.buffer);
    view.setUint32(end + 16, bytes.byteLength, true);
    await expect(index(bytes)).rejects.toMatchObject({ code: "corrupt" });
  });

  it("refuses an entry that says it lies past the end", async () => {
    const bytes = zip(three);
    const [first] = await index(bytes);
    const directoryAt = new DataView(bytes.buffer).getUint32(bytes.byteLength - 22 + 16, true);
    expect(first).toBeDefined();
    new DataView(bytes.buffer).setUint32(directoryAt + 20, bytes.byteLength, true);
    await expect(index(bytes)).rejects.toMatchObject({ code: "corrupt" });
  });

  it("refuses a directory cut short", async () => {
    const bytes = zip(three);
    const view = new DataView(bytes.buffer);
    view.setUint16(bytes.byteLength - 22 + 10, 40, true);
    await expect(index(bytes)).rejects.toMatchObject({ code: "corrupt" });
  });

  it("refuses more entries than it reads, before reading them", async () => {
    const bytes = zip(three, { zip64: true });
    // The zip64 record holds the count: 56 + 20 + 22 bytes from the end.
    const recordAt = bytes.byteLength - 22 - 20 - 56;
    new DataView(bytes.buffer).setBigUint64(recordAt + 32, 10_000_000n, true);
    await expect(index(bytes)).rejects.toMatchObject({ code: "too_large" });
  });
});
