import { FILE_CONTENT_TYPE, type FileLocation, type FileStorage, type ObjectStore } from "./types";
import { signHeaders, uriEncode } from "./sigv4";

/**
 * An S3-compatible object store (docs/adr/0087): Hetzner Object Storage
 * on kadence.haij.dk, or any other S3 API in the EU a self-hoster names.
 * Path-style addresses (`<endpoint>/<bucket>/<key>`), every request
 * signed with our own SigV4 (sigv4.ts) and the payload's hash signed with
 * it. Objects are written with `x-amz-server-side-encryption: AES256`,
 * which a store that encrypts at rest honours and another ignores; the
 * ADR says the provider's answer is checked at deploy time. No ACL is
 * ever set and no URL is ever handed out: the bucket is private and the
 * application is its only reader.
 */

export type S3Config = {
  /** `https://fsn1.your-objectstorage.com`, or the fake's `http://127.0.0.1:port` in tests. */
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
};

export type StorageErrorCode = "status" | "network" | "timeout";

/** The store did not do as asked. The status is kept; the body is not, since it is the store's to log. */
export class StorageError extends Error {
  constructor(
    readonly code: StorageErrorCode,
    readonly status?: number,
  ) {
    super(`object store: ${code}${status ? ` ${status}` : ""}`);
    this.name = "StorageError";
  }
}

/** A file is at most 25 MB (ADR 0018); a minute is generous for one on a slow night. */
const TRANSFER_TIMEOUT_MS = 60_000;
/** HEAD and DELETE: under the roles' 15 s idle-in-transaction timeout (drizzle/0043), since the tombstone job holds one. */
const SMALL_TIMEOUT_MS = 10_000;

export class S3ObjectStore implements ObjectStore {
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly config: S3Config,
    fetchImpl: typeof fetch = (input, init) => fetch(input, init),
  ) {
    this.fetchImpl = fetchImpl;
  }

  private url(key: string): URL {
    const base = this.config.endpoint.replace(/\/+$/, "");
    const path = key.split("/").map(uriEncode).join("/");
    return new URL(`${base}/${uriEncode(this.config.bucket)}/${path}`);
  }

  private async send(
    method: "PUT" | "GET" | "DELETE" | "HEAD",
    key: string,
    options: { body?: Uint8Array; headers?: Record<string, string>; timeoutMs?: number } = {},
  ): Promise<Response> {
    const url = this.url(key);
    const payload = options.body ?? new Uint8Array();
    const headers = signHeaders(
      { method, url, headers: options.headers ?? {}, payload },
      {
        accessKey: this.config.accessKey,
        secretKey: this.config.secretKey,
        region: this.config.region,
        service: "s3",
      },
    );
    const timeoutMs = options.timeoutMs ?? SMALL_TIMEOUT_MS;
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers,
        body: options.body ? (new Uint8Array(options.body) as BodyInit) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "error",
      });
    } catch (error) {
      const name = (error as { name?: string } | null)?.name;
      throw new StorageError(
        name === "TimeoutError" || name === "AbortError" ? "timeout" : "network",
      );
    }
    return response;
  }

  async putObject(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
    const response = await this.send("PUT", key, {
      body: bytes,
      headers: {
        "content-type": contentType,
        "x-amz-server-side-encryption": "AES256",
      },
      timeoutMs: TRANSFER_TIMEOUT_MS,
    });
    await response.arrayBuffer().catch(() => undefined);
    if (!response.ok) throw new StorageError("status", response.status);
  }

  async getObject(key: string): Promise<Uint8Array | null> {
    const response = await this.send("GET", key, { timeoutMs: TRANSFER_TIMEOUT_MS });
    if (response.status === 404) {
      await response.arrayBuffer().catch(() => undefined);
      return null;
    }
    if (!response.ok) {
      await response.arrayBuffer().catch(() => undefined);
      throw new StorageError("status", response.status);
    }
    try {
      return new Uint8Array(await response.arrayBuffer());
    } catch {
      throw new StorageError("network");
    }
  }

  async deleteObject(key: string): Promise<void> {
    const response = await this.send("DELETE", key);
    await response.arrayBuffer().catch(() => undefined);
    // Gone, or never there: either way it is not there now.
    if (!response.ok && response.status !== 404) throw new StorageError("status", response.status);
  }

  async headObject(key: string): Promise<{ size: number } | null> {
    const response = await this.send("HEAD", key);
    await response.arrayBuffer().catch(() => undefined);
    if (response.status === 404) return null;
    if (!response.ok) throw new StorageError("status", response.status);
    return { size: Number(response.headers.get("content-length") ?? 0) };
  }
}

/** Files as objects: the row keeps the key and no bytes. */
export function s3Storage(objects: ObjectStore): FileStorage {
  return {
    mode: "s3",
    objects,
    async store(key: string, bytes: Uint8Array): Promise<FileLocation> {
      await objects.putObject(key, bytes, FILE_CONTENT_TYPE);
      return { bytes: null, storageKey: key };
    },
    async load(location: FileLocation): Promise<Uint8Array | null> {
      // A row not yet moved out of the database (scripts/migrate-files.ts) still holds its bytes.
      if (location.bytes) return location.bytes;
      return location.storageKey ? objects.getObject(location.storageKey) : null;
    },
    async discard(key: string): Promise<void> {
      await objects.deleteObject(key);
    },
  };
}
