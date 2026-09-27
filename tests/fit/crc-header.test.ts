import { describe, expect, it } from "vitest";
import { decodeFit, fitCrc, FitWriter, readHeader, writeHeader } from "@/modules/fit";
import { encodeRide, fitErrorCode as code, steadyHour, writeFileId } from "./fixtures";

describe("the FIT checksum", () => {
  it("is CRC-16/ARC: 0xBB3D for the ASCII bytes 123456789", () => {
    expect(fitCrc(new TextEncoder().encode("123456789"))).toBe(0xbb3d);
  });

  it("is zero over a whole file, its own checksum included", () => {
    const file = encodeRide(steadyHour().slice(0, 10));
    expect(fitCrc(file)).toBe(0);
  });
});

describe("the file header", () => {
  it("reads a fourteen-byte header with its own checksum", () => {
    const header = readHeader(writeHeader(1234, { profileVersion: 2132 }));
    expect(header).toEqual({
      headerSize: 14,
      protocolVersion: 0x20,
      profileVersion: 2132,
      dataSize: 1234,
      headerCrcOk: true,
    });
  });

  it("reads a twelve-byte header, and a file written with one", () => {
    expect(readHeader(writeHeader(0, { headerSize: 12 })).headerSize).toBe(12);
    const file = writeFileId(new FitWriter({ headerSize: 12, protocolVersion: 0x10 })).finish();
    const fit = decodeFit(file);
    expect(fit.crcOk).toBe(true);
    expect(fit.fileType).toBe(4);
    expect(fit.protocolVersion).toBe(0x10);
  });

  it("accepts a header checksum of zero as not computed", () => {
    const header = writeHeader(10);
    header[12] = 0;
    header[13] = 0;
    expect(readHeader(header).headerCrcOk).toBe(true);
  });

  it("flags a header checksum that does not match", () => {
    const file = encodeRide(steadyHour().slice(0, 5));
    file[12] = (file[12] ?? 0) ^ 0xff;
    expect(readHeader(file).headerCrcOk).toBe(false);
    expect(decodeFit(file).crcOk).toBe(false);
  });

  it("refuses bytes that are not FIT", () => {
    expect(
      code(() => readHeader(new TextEncoder().encode("<html><body>hello</body></html>"))),
    ).toBe("not_fit");
    expect(code(() => readHeader(new Uint8Array([14, 0x20, 0, 0])))).toBe("not_fit");
  });

  it("refuses a header size or protocol it does not know", () => {
    const odd = writeHeader(0);
    odd[0] = 13;
    expect(code(() => readHeader(odd))).toBe("unsupported");
    const future = writeHeader(0);
    future[1] = 0x30;
    expect(code(() => readHeader(future))).toBe("unsupported");
  });
});
