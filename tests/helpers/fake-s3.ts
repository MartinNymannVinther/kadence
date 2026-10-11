import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * An S3 in memory for the tests (docs/adr/0087): one bucket, path-style,
 * PUT, GET, HEAD and DELETE, and a SigV4 check of every request written
 * here on its own — not with src/core/files/sigv4.ts — so the client and
 * the server agree because both follow AWS's description, not because
 * they share code. A request whose signature, credential or payload hash
 * is wrong is answered 403 and recorded. UNSIGNED-PAYLOAD is refused.
 *
 * `failNext` makes the next request of a method answer 500, for the paths
 * where the store is down. Nothing here touches the network beyond the
 * loopback address.
 */

export type FakeS3 = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  objects: Map<string, { bytes: Buffer; contentType: string; sse: string | null }>;
  /** Every request as it came, after the signature check. */
  requests: Array<{ method: string; key: string; status: number }>;
  refused: number;
  failNext: (method: string, status?: number) => void;
  close: () => Promise<void>;
};

const CREDS = { accessKey: "AKIAFAKEKADENCE", secretKey: "fake-secret-for-the-tests-only" };

const sha256 = (data: Uint8Array | string) => createHash("sha256").update(data).digest("hex");
const hmac = (key: Uint8Array | string, data: string) =>
  createHmac("sha256", key).update(data, "utf8").digest();
const encode = (s: string) =>
  encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** Verifies the request's SigV4 against the fake's credentials; a reason when it fails. */
function verify(req: IncomingMessage, body: Buffer, region: string): string | null {
  const auth = req.headers.authorization ?? "";
  const match =
    /^AWS4-HMAC-SHA256 Credential=([^/]+)\/(\d{8})\/([^/]+)\/s3\/aws4_request, SignedHeaders=([^,]+), Signature=([0-9a-f]{64})$/.exec(
      auth,
    );
  if (!match) return "no_signature";
  const [, accessKey, day, scopeRegion, signedHeaders, signature] = match as unknown as string[];
  if (accessKey !== CREDS.accessKey) return "unknown_key";
  if (scopeRegion !== region) return "wrong_region";
  const payloadHash = String(req.headers["x-amz-content-sha256"] ?? "");
  if (payloadHash === "UNSIGNED-PAYLOAD") return "unsigned_payload";
  if (payloadHash !== sha256(body)) return "payload_hash";
  const stamp = String(req.headers["x-amz-date"] ?? "");
  if (!stamp.startsWith(day!)) return "date";

  const url = new URL(req.url ?? "/", "http://fake");
  const names = signedHeaders!.split(";");
  const canonicalHeaders = names
    .map((name) => {
      const value = req.headers[name];
      const text = Array.isArray(value) ? value.join(",") : (value ?? "");
      return `${name}:${text.trim().replace(/\s+/g, " ")}\n`;
    })
    .join("");
  const query = [...url.searchParams]
    .map(([k, v]) => [encode(k), encode(v)] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const path = url.pathname
    .split("/")
    .map((s) => encode(decodeURIComponent(s)))
    .join("/");
  const canonical = [
    req.method,
    path || "/",
    query,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${day}/${region}/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", stamp, scope, sha256(canonical)].join("\n");
  const kDate = hmac(`AWS4${CREDS.secretKey}`, day!);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const expected = hmac(kSigning, toSign).toString("hex");
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature!)) ? null : "signature";
}

export async function startFakeS3(
  options: { region?: string; bucket?: string } = {},
): Promise<FakeS3> {
  const region = options.region ?? "fsn1";
  const bucket = options.bucket ?? "kadence-test";
  const objects: FakeS3["objects"] = new Map();
  const requests: FakeS3["requests"] = [];
  const failures = new Map<string, number>();
  const fake = { refused: 0 };

  const server: Server = createServer(async (req, res) => {
    const body = await readBody(req);
    const url = new URL(req.url ?? "/", "http://fake");
    const [, bucketInPath, ...rest] = url.pathname.split("/");
    const key = rest.map(decodeURIComponent).join("/");
    const method = req.method ?? "GET";
    const answer = (status: number, payload?: Buffer, headers: Record<string, string> = {}) => {
      requests.push({ method, key, status });
      res.writeHead(status, {
        ...headers,
        ...(payload ? { "content-length": String(payload.length) } : {}),
      });
      res.end(method === "HEAD" ? undefined : payload);
    };
    const reason = verify(req, body, region);
    if (reason) {
      fake.refused += 1;
      return answer(
        403,
        Buffer.from(
          `<Error><Code>SignatureDoesNotMatch</Code><Message>${reason}</Message></Error>`,
        ),
      );
    }
    if (bucketInPath !== bucket)
      return answer(404, Buffer.from("<Error><Code>NoSuchBucket</Code></Error>"));
    const failing = failures.get(method);
    if (failing) {
      failures.delete(method);
      return answer(failing, Buffer.from("<Error><Code>InternalError</Code></Error>"));
    }
    const found = objects.get(key);
    switch (method) {
      case "PUT":
        objects.set(key, {
          bytes: body,
          contentType: String(req.headers["content-type"] ?? ""),
          sse: (req.headers["x-amz-server-side-encryption"] as string | undefined) ?? null,
        });
        return answer(200, Buffer.alloc(0), {
          etag: `"${createHash("md5").update(body).digest("hex")}"`,
        });
      case "GET":
        return found
          ? answer(200, found.bytes, { "content-type": found.contentType })
          : answer(404, Buffer.from("<Error><Code>NoSuchKey</Code></Error>"));
      case "HEAD":
        return found ? answer(200, found.bytes) : answer(404);
      case "DELETE":
        objects.delete(key);
        return answer(204);
      default:
        return answer(405);
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    endpoint: `http://127.0.0.1:${port}`,
    region,
    bucket,
    ...CREDS,
    objects,
    requests,
    get refused() {
      return fake.refused;
    },
    failNext: (method, status = 500) => failures.set(method, status),
    close: () => new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))),
  };
}
