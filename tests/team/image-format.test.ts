import { describe, expect, it } from "vitest";
import { acceptImage, inspectImage, IMAGE_LIMITS } from "@/modules/team/image-format";

/** Smallest headers that say what each format is and how big, built by hand. */
function png(width: number, height: number): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
  b.set([...Buffer.from("IHDR")], 12);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  return b;
}

function jpeg(width: number, height: number): Uint8Array {
  // SOI, an APP0 segment of 16 bytes, then SOF0 with the size.
  const app0 = [0xff, 0xe0, 0x00, 0x10, ...new Array(14).fill(0)];
  const sof = [
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    3,
  ];
  return new Uint8Array([0xff, 0xd8, ...app0, ...sof, ...new Array(10).fill(0)]);
}

function webpX(width: number, height: number): Uint8Array {
  const b = new Uint8Array(30);
  b.set([...Buffer.from("RIFF")], 0);
  b.set([...Buffer.from("WEBP")], 8);
  b.set([...Buffer.from("VP8X")], 12);
  const w = width - 1;
  const h = height - 1;
  b.set(
    [w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff, h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff],
    24,
  );
  return b;
}

function webpLossy(width: number, height: number): Uint8Array {
  const b = new Uint8Array(30);
  b.set([...Buffer.from("RIFF")], 0);
  b.set([...Buffer.from("WEBP")], 8);
  b.set([...Buffer.from("VP8 ")], 12);
  b.set([0x9d, 0x01, 0x2a, width & 0xff, width >> 8, height & 0xff, height >> 8], 23);
  return b;
}

describe("what an uploaded image is", () => {
  it("reads PNG, JPEG and WebP from their own bytes", () => {
    expect(inspectImage(png(512, 256))).toEqual({ mime: "image/png", width: 512, height: 256 });
    expect(inspectImage(jpeg(1600, 900))).toEqual({ mime: "image/jpeg", width: 1600, height: 900 });
    expect(inspectImage(webpX(1200, 400))).toEqual({
      mime: "image/webp",
      width: 1200,
      height: 400,
    });
    expect(inspectImage(webpLossy(640, 480))).toEqual({
      mime: "image/webp",
      width: 640,
      height: 480,
    });
  });

  it("refuses an SVG, a GIF and anything else, whatever it is called", () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
    expect(inspectImage(svg)).toBeNull();
    expect(inspectImage(new TextEncoder().encode("GIF89a........"))).toBeNull();
    expect(inspectImage(new Uint8Array(0))).toBeNull();
    expect(acceptImage("logo", svg)).toEqual({ ok: false, reason: "format" });
  });

  it("keeps the size and the dimensions within the limits", () => {
    const big = new Uint8Array(IMAGE_LIMITS.logo.bytes + 1);
    big.set(png(10, 10));
    expect(acceptImage("logo", big)).toEqual({ ok: false, reason: "tooLarge" });
    expect(acceptImage("cover", big).ok).toBe(true);
    expect(acceptImage("cover", png(5000, 100))).toEqual({ ok: false, reason: "dimensions" });
    expect(acceptImage("logo", png(0, 10))).toEqual({ ok: false, reason: "dimensions" });
  });
});
