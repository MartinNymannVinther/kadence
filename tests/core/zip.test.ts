import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { crc32 } from "@/core/crc32";
import { ZipWriter, type ZipFile } from "@/core/zip";

/**
 * The files archive (ADR 0088) is written by hand, so it is read back by
 * a reader that did not write it: Python's zipfile checks the central
 * directory, every local header and every CRC, and hands each file back
 * byte for byte.
 */

function archive(files: ZipFile[]): Buffer {
  const zip = new ZipWriter();
  const parts = files.flatMap((file) => zip.add(file));
  return Buffer.concat([...parts, zip.finish()]);
}

/** Names, sizes, CRCs and a hash of each file's bytes, as Python reads them. */
function readBack(buffer: Buffer): Array<{ name: string; size: number; crc: number; sha: string }> {
  const dir = mkdtempSync(join(tmpdir(), "zip-"));
  const file = join(dir, "files.zip");
  writeFileSync(file, buffer);
  const out = execFileSync(
    "python3",
    [
      "-c",
      [
        "import zipfile,sys,json,hashlib",
        "z=zipfile.ZipFile(sys.argv[1])",
        "assert z.testzip() is None",
        "print(json.dumps([{'name':i.filename,'size':i.file_size,'crc':i.CRC,'sha':hashlib.sha256(z.read(i)).hexdigest(),'stored':i.compress_type==0} for i in z.infolist()]))",
      ].join("\n"),
      file,
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  const rows = JSON.parse(out.toString()) as Array<{
    name: string;
    size: number;
    crc: number;
    sha: string;
    stored: boolean;
  }>;
  expect(rows.every((row) => row.stored)).toBe(true);
  return rows;
}

const sha = (data: Uint8Array) =>
  execFileSync(
    "python3",
    ["-c", "import sys,hashlib;print(hashlib.sha256(sys.stdin.buffer.read()).hexdigest())"],
    {
      input: data,
    },
  )
    .toString()
    .trim();

describe("crc32", () => {
  it("gives the check value every implementation agrees on", () => {
    expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe("the files archive", () => {
  it("holds every file, stored, with its CRC, under a folder per rider", () => {
    const fit = Buffer.from([0x0e, 0x10, 0x43, 0x08, 0x2e, 0x46, 0x49, 0x54, 0, 0xff]);
    const big = Buffer.alloc(300_000, 7);
    const files: ZipFile[] = [
      {
        name: "Åse Ørsted/2026-11-02-act1.fit",
        data: fit,
        modified: new Date("2026-11-02T12:00:00Z"),
      },
      { name: "Åse Ørsted/2026-11-03-act2.fit", data: big },
      { name: "Bo/2026-11-04-act3.fit", data: new Uint8Array() },
    ];
    const read = readBack(archive(files));
    expect(read.map((r) => r.name)).toEqual(files.map((f) => f.name));
    for (const [i, file] of files.entries()) {
      expect(read[i]!.size).toBe(file.data.length);
      expect(read[i]!.crc).toBe(crc32(file.data));
      expect(read[i]!.sha).toBe(sha(file.data));
    }
  });

  it("is an empty archive, and still a valid one, when there are no files", () => {
    expect(readBack(archive([]))).toEqual([]);
  });

  it("writes ZIP64 end records past 65,535 entries", () => {
    const files = Array.from({ length: 65_540 }, (_, i) => ({
      name: `r/${i}.fit`,
      data: Buffer.from([i % 256]),
    }));
    const buffer = archive(files);
    expect(buffer.indexOf(Buffer.from([0x50, 0x4b, 0x06, 0x06]))).toBeGreaterThan(0);
    const read = readBack(buffer);
    expect(read).toHaveLength(65_540);
    expect(read.at(-1)!.name).toBe("r/65539.fit");
  });

  it("moves an offset past 4 GB into a ZIP64 extra field", () => {
    // Four gigabytes cannot be written in a test; an archive that starts
    // that far into its stream has the same directory.
    const zip = new ZipWriter(0x1_0000_0000);
    zip.add({ name: "far.fit", data: Buffer.from("fit") });
    const end = zip.finish();
    const central = end.subarray(0, 46 + "far.fit".length + 12);
    expect(central.readUInt32LE(0)).toBe(0x02014b50);
    expect(central.readUInt32LE(42)).toBe(0xffffffff);
    expect(central.readUInt16LE(46 + 7)).toBe(0x0001);
    expect(central.readBigUInt64LE(46 + 7 + 4)).toBe(0x1_0000_0000n);
    const record = end.subarray(central.length);
    expect(record.readUInt32LE(0)).toBe(0x06064b50);
    expect(record.readBigUInt64LE(48)).toBe(0x1_0000_0000n + 30n + 7n + 3n);
  });
});
