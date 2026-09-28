import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { decodeActivityFile } from "@/modules/files";
import { MAX_UNPACKED_BYTES } from "@/modules/files/unpack";
import { MAX_DEPTH, scanXml } from "@/modules/files/xml";
import { bytesOf, gpx, zip } from "./fixtures";

/**
 * Uploads are hostile (CLAUDE.md, security rules): every way a file in
 * the new formats can be wrong is refused with a reason, and none of them
 * can make Kadence expand, inflate or recurse its way out of memory.
 */

const refuses = (bytes: Uint8Array, code: string) =>
  expect(() => decodeActivityFile(bytes)).toThrow(expect.objectContaining({ code }));

describe("hostile activity files", () => {
  it("refuses what is no known format", () => {
    refuses(bytesOf("just some text"), "unknown_format");
    refuses(new Uint8Array([1, 2, 3]), "unknown_format");
  });

  it("refuses any DTD, so no entity can expand (billion laughs, XXE)", () => {
    const laughs = `<?xml version="1.0"?><!DOCTYPE gpx [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;&a;">]><gpx><trk><name>&b;</name></trk></gpx>`;
    refuses(bytesOf(laughs), "unsupported");
    const xxe = `<?xml version="1.0"?><!DOCTYPE gpx [<!ENTITY x SYSTEM "file:///etc/passwd">]><gpx>&x;</gpx>`;
    refuses(bytesOf(xxe), "unsupported");
  });

  it("leaves an undeclared entity as text, never resolved", () => {
    const seen: string[] = [];
    scanXml("<a>&unknown; &amp; &#65;</a>", { open() {}, close() {}, text: (t) => seen.push(t) });
    expect(seen).toEqual(["&unknown; & A"]);
  });

  it("refuses XML nested past the limit, and XML cut short", () => {
    const deep = "<gpx>" + "<a>".repeat(MAX_DEPTH + 5) + "</gpx>";
    refuses(bytesOf(deep), "corrupt");
    refuses(bytesOf(`<gpx><trk><trkseg><trkpt lat="55" lon="12`), "truncated");
    refuses(bytesOf(`<gpx><trk><!-- never closed`), "truncated");
  });

  it("refuses a GPX with no timed point", () => {
    refuses(bytesOf(`<gpx><trk><trkseg><trkpt lat="55" lon="12"/></trkseg></trk></gpx>`), "empty");
  });

  it("refuses a gzip bomb while it inflates", () => {
    refuses(gzipSync(new Uint8Array(MAX_UNPACKED_BYTES + 1024)), "too_large");
  });

  it("refuses a zip bomb, a zip with no activity, and archives nested too deep", () => {
    refuses(
      zip([{ name: "big.fit", bytes: new Uint8Array(MAX_UNPACKED_BYTES + 1024), deflate: true }]),
      "too_large",
    );
    refuses(zip([{ name: "notes.txt", bytes: bytesOf("x") }]), "no_activity");
    const nested = gzipSync(gzipSync(gzipSync(bytesOf(gpx(5)))));
    refuses(nested, "unsupported");
  });

  it("refuses a zip whose directory points past its end", () => {
    const good = zip([{ name: "a.gpx", bytes: bytesOf(gpx(5)) }]);
    const broken = good.slice();
    new DataView(broken.buffer).setUint32(broken.byteLength - 6, 10_000_000, true);
    refuses(broken, "corrupt");
  });
});
