import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  ArchiveUnreadable,
  canOpenZip,
  openFolder,
  openZip,
  recogniseZip,
} from "@/components/activities/read-archive";
import { bytesOf, zip } from "./fixtures";

/**
 * An archive read the way the browser reads it (docs/adr/0030): through
 * slices of the picked file and the engine's own DecompressionStream,
 * which Node has too. A Strava archive is told from any other zip by its
 * directory alone; an entry that unpacks past the cap is refused while it
 * unpacks; an entry the browser cannot unpack says so.
 */

const ride = bytesOf("a ride that is not really a FIT file, but bytes all the same");
const strava = () =>
  zip([
    { name: "activities.csv", bytes: bytesOf("Filename\nactivities/1.fit.gz\n"), deflate: true },
    { name: "activities/1.fit.gz", bytes: ride, deflate: true },
    { name: "activities/2.gpx", bytes: ride },
  ]);
const fileOf = (bytes: Uint8Array, name = "export_123.zip") =>
  new File([bytes as Uint8Array<ArrayBuffer>], name, { type: "application/zip" });

/** Sets a field of the one directory entry named, as a tool that wrote it oddly would have. */
function patchEntry(bytes: Uint8Array, name: string, offset: number, value: number) {
  const view = new DataView(bytes.buffer);
  const directoryAt = view.getUint32(bytes.byteLength - 22 + 16, true);
  for (let at = directoryAt; at < bytes.byteLength - 22;) {
    const nameLength = view.getUint16(at + 28, true);
    const entryName = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));
    if (entryName === name) {
      view.setUint16(at + offset, value, true);
      return bytes;
    }
    at += 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  throw new Error(`no entry ${name}`);
}

describe("a zip read in the browser", () => {
  it("lists its files and unpacks the one asked for", async () => {
    expect(canOpenZip()).toBe(true);
    const source = await openZip(fileOf(strava()));
    expect(source.paths).toEqual(["activities.csv", "activities/1.fit.gz", "activities/2.gpx"]);
    expect(await source.read("activities/1.fit.gz")).toEqual(ride);
    expect(await source.read("activities/2.gpx")).toEqual(ride);
    await expect(source.read("activities/3.fit")).rejects.toBeInstanceOf(ArchiveUnreadable);
  });

  it("refuses an entry that unpacks past the cap, while it unpacks", async () => {
    const zeros = new Uint8Array(4 * 1024 * 1024);
    const bytes = zip([{ name: "activities/bomb.fit", bytes: zeros, deflate: true }]);
    expect(deflateRawSync(zeros).byteLength).toBeLessThan(10_000);
    const source = await openZip(fileOf(bytes));
    await expect(source.read("activities/bomb.fit", 64 * 1024)).rejects.toBeInstanceOf(
      ArchiveUnreadable,
    );
  });

  it("says so for an entry it cannot unpack: encrypted, or packed another way", async () => {
    const encrypted = patchEntry(strava(), "activities/1.fit.gz", 8, 1);
    await expect((await openZip(fileOf(encrypted))).read("activities/1.fit.gz")).rejects.toThrow(
      ArchiveUnreadable,
    );
    const bzip2 = patchEntry(strava(), "activities/1.fit.gz", 10, 12);
    await expect((await openZip(fileOf(bzip2))).read("activities/1.fit.gz")).rejects.toThrow(
      ArchiveUnreadable,
    );
  });

  it("says so for an entry whose bytes do not unpack", async () => {
    const bytes = zip([{ name: "activities/1.fit", bytes: bytesOf("x".repeat(200)) }]);
    // The stored entry is said to be deflated: its bytes are no deflate stream.
    patchEntry(bytes, "activities/1.fit", 10, 8);
    await expect((await openZip(fileOf(bytes))).read("activities/1.fit")).rejects.toThrow(
      ArchiveUnreadable,
    );
  });
});

describe("a Strava archive among the files picked", () => {
  it("is told by its directory alone", async () => {
    const kind = await recogniseZip(fileOf(strava()));
    expect(kind && "strava" in kind && kind.strava.paths).toContain("activities.csv");
  });

  it("is not every zip: a device's export and what is no zip go on to the upload", async () => {
    const garmin = zip([{ name: "2026-09-01.fit", bytes: ride }]);
    expect(await recogniseZip(fileOf(garmin, "garmin.zip"))).toBeNull();
    expect(await recogniseZip(fileOf(bytesOf("not a zip at all"), "fake.zip"))).toBeNull();
    expect(await recogniseZip(new File([ride as Uint8Array<ArrayBuffer>], "ride.fit"))).toBeNull();
  });
});

describe("a folder handed over by the browser", () => {
  it("reads its files by their path, and no further than the cap", async () => {
    const file = new File([ride as Uint8Array<ArrayBuffer>], "1.fit.gz");
    const source = openFolder([{ path: "export_1/activities/1.fit.gz", file }]);
    expect(source.paths).toEqual(["export_1/activities/1.fit.gz"]);
    expect(await source.read("export_1/activities/1.fit.gz")).toEqual(ride);
    await expect(source.read("export_1/activities/1.fit.gz", 10)).rejects.toThrow(
      ArchiveUnreadable,
    );
  });
});
