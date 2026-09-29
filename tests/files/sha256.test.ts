import { createHash, randomBytes } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hashHex, sha256Hex } from "@/modules/files/sha256";

/**
 * The browser's hash where it has no crypto.subtle (a Kadence reached
 * over http on the local network): it is the question the page asks the
 * server, so it must be the server's own, byte for byte.
 */

const node = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");

afterEach(() => vi.unstubAllGlobals());

describe("SHA-256 without the browser's own", () => {
  it("is the standard's, for the standard's own examples", () => {
    const text = (s: string) => new TextEncoder().encode(s);
    expect(sha256Hex(text(""))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256Hex(text("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(sha256Hex(text("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"))).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  it("is the server's at every length around a block's edges, and for a ride-sized file", () => {
    for (const length of [1, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129, 1000, 4096]) {
      const data = new Uint8Array(randomBytes(length));
      expect(sha256Hex(data), String(length)).toBe(node(data));
    }
    const ride = new Uint8Array(randomBytes(3 * 1024 * 1024 + 17));
    expect(sha256Hex(ride)).toBe(node(ride));
  });

  it("reads a view into a larger buffer as the view only", () => {
    const buffer = new Uint8Array(randomBytes(300));
    const view = buffer.subarray(40, 250);
    expect(sha256Hex(view)).toBe(node(new Uint8Array(view)));
  });

  it("is used where the page has no crypto.subtle, and answers the same", async () => {
    const data = new Uint8Array(randomBytes(5000));
    expect(await hashHex(data)).toBe(node(data));
    vi.stubGlobal("crypto", {});
    expect(await hashHex(data)).toBe(node(data));
  });
});
