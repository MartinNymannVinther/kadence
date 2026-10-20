import { describe, expect, it } from "vitest";
import {
  amzDate,
  canonicalQuery,
  canonicalRequest,
  canonicalUri,
  EMPTY_HASH,
  hashHex,
  sign,
  signHeaders,
  uriEncode,
} from "@/core/files/sigv4";

/**
 * Our own SigV4 (docs/adr/0087) against the worked examples AWS
 * publishes with their signatures: the general "GET /?Param2=value2&
 * Param1=value1" from "Create a signed AWS API request", and the four
 * S3 examples from "Authenticating Requests: Using the Authorization
 * Header" (GET object, PUT object, GET bucket lifecycle, list objects).
 * The credentials are AWS's example ones. A signature that matches all
 * five is one a store will accept.
 */

const GENERAL = {
  accessKey: "AKIDEXAMPLE",
  secretKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  region: "us-east-1",
  service: "service",
};

const S3 = {
  accessKey: "AKIAIOSFODNN7EXAMPLE",
  secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  region: "us-east-1",
  service: "s3",
};
const S3_STAMP = "20130524T000000Z";
const BUCKET = "https://examplebucket.s3.amazonaws.com";

describe("the canonical request", () => {
  it("encodes a path segment once and keeps the slashes", () => {
    expect(canonicalUri(new URL("https://h/test$file.text"))).toBe("/test%24file.text");
    expect(canonicalUri(new URL("https://h/org_a/rider_b/ab12.fit"))).toBe(
      "/org_a/rider_b/ab12.fit",
    );
    expect(canonicalUri(new URL("https://h"))).toBe("/");
    expect(uriEncode("a b*c'(d)!~")).toBe("a%20b%2Ac%27%28d%29%21~");
  });

  it("sorts the query by name and keeps a bare key", () => {
    expect(canonicalQuery(new URL("https://h/?Param2=value2&Param1=value1"))).toBe(
      "Param1=value1&Param2=value2",
    );
    expect(canonicalQuery(new URL("https://h/?lifecycle"))).toBe("lifecycle=");
    expect(canonicalQuery(new URL("https://h/"))).toBe("");
  });

  it("writes the date the way the signature wants it", () => {
    expect(amzDate(new Date("2015-08-30T12:36:00.000Z"))).toEqual({
      stamp: "20150830T123600Z",
      day: "20150830",
    });
    expect(hashHex(new Uint8Array())).toBe(EMPTY_HASH);
  });
});

describe("AWS's general example", () => {
  it("GET /?Param2=value2&Param1=value1 signs as the documentation says", () => {
    const request = {
      method: "GET",
      url: new URL("https://example.amazonaws.com/?Param2=value2&Param1=value1"),
      headers: { "x-amz-date": "20150830T123600Z" },
      payloadHash: EMPTY_HASH,
    };
    expect(canonicalRequest(request).canonical).toBe(
      [
        "GET",
        "/",
        "Param1=value1&Param2=value2",
        "host:example.amazonaws.com",
        "x-amz-date:20150830T123600Z",
        "",
        "host;x-amz-date",
        EMPTY_HASH,
      ].join("\n"),
    );
    const signed = sign(request, GENERAL, "20150830T123600Z");
    expect(signed.signature).toBe(
      "b97d918cfa904a5beff61c982a1b6f458b799221646efd99d3219ec94cdf2500",
    );
    expect(signed.authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date, Signature=b97d918cfa904a5beff61c982a1b6f458b799221646efd99d3219ec94cdf2500",
    );
  });
});

describe("AWS's S3 examples", () => {
  it("GET object with a range", () => {
    const signed = sign(
      {
        method: "GET",
        url: new URL(`${BUCKET}/test.txt`),
        headers: {
          Range: "bytes=0-9",
          "x-amz-content-sha256": EMPTY_HASH,
          "x-amz-date": S3_STAMP,
        },
        payloadHash: EMPTY_HASH,
      },
      S3,
      S3_STAMP,
    );
    expect(signed.signedHeaders).toBe("host;range;x-amz-content-sha256;x-amz-date");
    expect(signed.signature).toBe(
      "f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
    );
  });

  it("PUT object with a body", () => {
    const payloadHash = hashHex("Welcome to Amazon S3.");
    expect(payloadHash).toBe("44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072");
    const signed = sign(
      {
        method: "PUT",
        url: new URL(`${BUCKET}/test$file.text`),
        headers: {
          Date: "Fri, 24 May 2013 00:00:00 GMT",
          "x-amz-storage-class": "REDUCED_REDUNDANCY",
          "x-amz-content-sha256": payloadHash,
          "x-amz-date": S3_STAMP,
        },
        payloadHash,
      },
      S3,
      S3_STAMP,
    );
    expect(signed.signature).toBe(
      "98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd",
    );
  });

  it("GET bucket lifecycle, a query with a bare key", () => {
    const signed = sign(
      {
        method: "GET",
        url: new URL(`${BUCKET}/?lifecycle`),
        headers: { "x-amz-content-sha256": EMPTY_HASH, "x-amz-date": S3_STAMP },
        payloadHash: EMPTY_HASH,
      },
      S3,
      S3_STAMP,
    );
    expect(signed.signature).toBe(
      "fea454ca298b7da1c68078a5d1bdbfbbe0d65c699e0f91ac7a200a0136783543",
    );
  });

  it("list objects, a query with two parameters", () => {
    const signed = sign(
      {
        method: "GET",
        url: new URL(`${BUCKET}/?max-keys=2&prefix=J`),
        headers: { "x-amz-content-sha256": EMPTY_HASH, "x-amz-date": S3_STAMP },
        payloadHash: EMPTY_HASH,
      },
      S3,
      S3_STAMP,
    );
    expect(signed.signature).toBe(
      "34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7",
    );
  });
});

describe("signHeaders", () => {
  it("adds the date, the payload hash and the authorization, and never UNSIGNED-PAYLOAD", () => {
    const payload = new TextEncoder().encode("Welcome to Amazon S3.");
    const headers = signHeaders(
      {
        method: "PUT",
        url: new URL(`${BUCKET}/test$file.text`),
        headers: {
          Date: "Fri, 24 May 2013 00:00:00 GMT",
          "x-amz-storage-class": "REDUCED_REDUNDANCY",
        },
        payload,
      },
      S3,
      new Date("2013-05-24T00:00:00Z"),
    );
    expect(headers["x-amz-date"]).toBe(S3_STAMP);
    expect(headers["x-amz-content-sha256"]).toBe(hashHex(payload));
    expect(headers.authorization).toContain(
      "Signature=98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd",
    );
    expect(JSON.stringify(headers)).not.toContain("UNSIGNED");
  });
});
