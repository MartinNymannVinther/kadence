import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { S3ObjectStore, s3Storage, StorageError } from "@/core/files/s3";
import { keyOwner, objectKey } from "@/core/files/types";
import { startFakeS3, type FakeS3 } from "../helpers/fake-s3";

/**
 * The S3 adapter against a fake store on the loopback address
 * (docs/adr/0087): every request signed with our SigV4 and checked by the
 * fake's own, the four operations, the encryption header, a wrong secret
 * refused, and a store that is down answered as a StorageError and never
 * as a half-written row. No database here.
 */

let fake: FakeS3;
let store: S3ObjectStore;

beforeAll(async () => {
  fake = await startFakeS3();
  store = new S3ObjectStore({
    endpoint: fake.endpoint,
    region: fake.region,
    bucket: fake.bucket,
    accessKey: fake.accessKey,
    secretKey: fake.secretKey,
  });
});

afterAll(async () => {
  await fake.close();
});

const KEY = objectKey("org_a", "rider_b", "ab".repeat(32));

describe("the object store", () => {
  it("puts, heads, gets and deletes an object under a signed, path-style request", async () => {
    const bytes = new Uint8Array([0x0e, 0x10, 0x2a, 0xff, 0, 1, 2, 3]);
    await store.putObject(KEY, bytes, "application/octet-stream");
    expect(fake.objects.get(KEY)?.contentType).toBe("application/octet-stream");
    expect(fake.objects.get(KEY)?.sse).toBe("AES256");
    expect(await store.headObject(KEY)).toEqual({ size: 8 });
    expect(await store.getObject(KEY)).toEqual(bytes);
    await store.deleteObject(KEY);
    expect(await store.headObject(KEY)).toBeNull();
    expect(await store.getObject(KEY)).toBeNull();
    // Deleting what is not there is not an error.
    await store.deleteObject(KEY);
    expect(fake.refused).toBe(0);
    expect(fake.requests.map((r) => r.method)).toEqual([
      "PUT",
      "HEAD",
      "GET",
      "DELETE",
      "HEAD",
      "GET",
      "DELETE",
    ]);
  });

  it("is refused with a wrong secret, and with a wrong key id", async () => {
    const wrong = new S3ObjectStore({
      endpoint: fake.endpoint,
      region: fake.region,
      bucket: fake.bucket,
      accessKey: fake.accessKey,
      secretKey: "not-the-secret",
    });
    const before = fake.refused;
    await expect(wrong.putObject(KEY, new Uint8Array([1]), "x")).rejects.toMatchObject({
      name: "StorageError",
      code: "status",
      status: 403,
    });
    const stranger = new S3ObjectStore({
      endpoint: fake.endpoint,
      region: fake.region,
      bucket: fake.bucket,
      accessKey: "AKIASOMEBODYELSE",
      secretKey: fake.secretKey,
    });
    await expect(stranger.getObject(KEY)).rejects.toBeInstanceOf(StorageError);
    expect(fake.refused).toBe(before + 2);
    expect(fake.objects.has(KEY)).toBe(false);
  });

  it("signs a key with characters that need encoding", async () => {
    const odd = "org a/rider+b/" + "cd".repeat(32) + ".fit";
    await store.putObject(odd, new Uint8Array([7]), "application/octet-stream");
    expect(fake.objects.has(odd)).toBe(true);
    expect(await store.getObject(odd)).toEqual(new Uint8Array([7]));
    await store.deleteObject(odd);
  });

  it("answers a store that is down as a StorageError", async () => {
    fake.failNext("PUT");
    await expect(store.putObject(KEY, new Uint8Array([1]), "x")).rejects.toMatchObject({
      code: "status",
      status: 500,
    });
    fake.failNext("GET", 503);
    await expect(store.getObject(KEY)).rejects.toMatchObject({ code: "status", status: 503 });
    const nowhere = new S3ObjectStore({
      endpoint: "http://127.0.0.1:1",
      region: fake.region,
      bucket: fake.bucket,
      accessKey: fake.accessKey,
      secretKey: fake.secretKey,
    });
    await expect(nowhere.headObject(KEY)).rejects.toMatchObject({ code: "network" });
  });
});

describe("files as objects", () => {
  it("stores a file as a key and no bytes, loads it back, and keeps a row's own bytes when it still has them", async () => {
    const storage = s3Storage(store);
    const bytes = new Uint8Array([1, 2, 3]);
    const location = await storage.store(KEY, bytes);
    expect(location).toEqual({ bytes: null, storageKey: KEY });
    expect(await storage.load(location)).toEqual(bytes);
    expect(await storage.load({ bytes: new Uint8Array([9]), storageKey: null })).toEqual(
      new Uint8Array([9]),
    );
    expect(await storage.load({ bytes: null, storageKey: null })).toBeNull();
    await storage.discard(KEY);
    expect(await storage.load(location)).toBeNull();
  });

  it("names objects by workspace, rider and hash, and reads the two ids back", () => {
    expect(KEY).toBe(`org_a/rider_b/${"ab".repeat(32)}.fit`);
    expect(keyOwner(KEY)).toEqual({ orgId: "org_a", riderId: "rider_b" });
    expect(keyOwner("something-else")).toBeNull();
  });
});
