import { createHash, createHmac } from "node:crypto";

/**
 * AWS Signature Version 4, the request signing every S3-compatible store
 * understands (docs/adr/0087). Written here rather than taken from an
 * SDK, as the FIT decoder and the spreadsheet were: it is a canonical
 * string, four HMACs and a header, and a reader can check every line
 * against AWS's own description ("Signature Version 4 signing process",
 * docs.aws.amazon.com). tests/files/sigv4.test.ts holds the worked
 * examples from those pages with their published signatures.
 *
 * The payload is always hashed and the hash signed (`x-amz-content-sha256`):
 * UNSIGNED-PAYLOAD is never used, so a body that was changed on the way
 * fails the signature. Pure: no network, no clock of its own.
 */

export type SigV4Credentials = {
  accessKey: string;
  secretKey: string;
  region: string;
  /** "s3" for an object store; the general examples use "service". */
  service: string;
};

export type SigV4Request = {
  method: string;
  url: URL;
  /** Every header to sign, as it will be sent. The host is added from the URL. */
  headers: Record<string, string>;
  /** Hex sha256 of the body; `hashHex(new Uint8Array())` for none. */
  payloadHash: string;
};

export const EMPTY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

export function hashHex(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Uint8Array | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

/** RFC 3986 percent-encoding: only A-Z a-z 0-9 - _ . ~ stay as they are. */
export function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** The path with each segment encoded once, the way S3 reads it; "/" for an empty path. */
export function canonicalUri(url: URL): string {
  const path = url.pathname || "/";
  return path
    .split("/")
    .map((segment) => uriEncode(decodeURIComponent(segment)))
    .join("/");
}

/** The query sorted by name, then value, each encoded; "" for none. */
export function canonicalQuery(url: URL): string {
  const pairs: Array<[string, string]> = [];
  for (const [name, value] of url.searchParams) pairs.push([uriEncode(name), uriEncode(value)]);
  pairs.sort(([a, av], [b, bv]) => (a < b ? -1 : a > b ? 1 : av < bv ? -1 : av > bv ? 1 : 0));
  return pairs.map(([name, value]) => `${name}=${value}`).join("&");
}

/** Lowercased names with trimmed, space-collapsed values, sorted by name. */
function canonicalHeaders(headers: Record<string, string>): Array<[string, string]> {
  return Object.entries(headers)
    .map(([name, value]): [string, string] => [
      name.toLowerCase().trim(),
      value.trim().replace(/\s+/g, " "),
    ])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/** yyyymmddThhmmssZ and yyyymmdd, as the signature wants them. */
export function amzDate(date: Date): { stamp: string; day: string } {
  const stamp = date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return { stamp, day: stamp.slice(0, 8) };
}

export function credentialScope(day: string, region: string, service: string): string {
  return `${day}/${region}/${service}/aws4_request`;
}

/** The canonical request and the signed-header list it names. */
export function canonicalRequest(request: SigV4Request): {
  canonical: string;
  signedHeaders: string;
} {
  const headers = canonicalHeaders({ ...request.headers, host: request.url.host });
  const signedHeaders = headers.map(([name]) => name).join(";");
  const canonical = [
    request.method.toUpperCase(),
    canonicalUri(request.url),
    canonicalQuery(request.url),
    headers.map(([name, value]) => `${name}:${value}\n`).join(""),
    signedHeaders,
    request.payloadHash,
  ].join("\n");
  return { canonical, signedHeaders };
}

export function stringToSign(stamp: string, scope: string, canonical: string): string {
  return ["AWS4-HMAC-SHA256", stamp, scope, hashHex(canonical)].join("\n");
}

/** HMAC(HMAC(HMAC(HMAC("AWS4" + secret, day), region), service), "aws4_request"). */
export function signingKey(secretKey: string, day: string, region: string, service: string) {
  const kDate = hmac(`AWS4${secretKey}`, day);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

export type Signed = {
  signature: string;
  signedHeaders: string;
  /** The `Authorization` header's value. */
  authorization: string;
};

/**
 * Signs a request whose headers already carry `x-amz-date` (and, for S3,
 * `x-amz-content-sha256`). `signHeaders` below adds both from a date and
 * the payload hash; this is the step the test vectors exercise.
 */
export function sign(request: SigV4Request, creds: SigV4Credentials, stamp: string): Signed {
  const { canonical, signedHeaders } = canonicalRequest(request);
  const day = stamp.slice(0, 8);
  const scope = credentialScope(day, creds.region, creds.service);
  const key = signingKey(creds.secretKey, day, creds.region, creds.service);
  const signature = hmac(key, stringToSign(stamp, scope, canonical)).toString("hex");
  return {
    signature,
    signedHeaders,
    authorization: `AWS4-HMAC-SHA256 Credential=${creds.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

/**
 * The headers to send: the request's own, `x-amz-date`, the payload hash
 * and `Authorization`. The host is signed from the URL and left to the
 * HTTP client to send, since it is the one header a client sets itself.
 */
export function signHeaders(
  request: Omit<SigV4Request, "payloadHash"> & { payload: Uint8Array },
  creds: SigV4Credentials,
  now: Date = new Date(),
): Record<string, string> {
  const { stamp } = amzDate(now);
  const payloadHash = hashHex(request.payload);
  const headers = {
    ...request.headers,
    "x-amz-date": stamp,
    "x-amz-content-sha256": payloadHash,
  };
  const signed = sign({ ...request, headers, payloadHash }, creds, stamp);
  return { ...headers, authorization: signed.authorization };
}
