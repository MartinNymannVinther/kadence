import { execFile, type ExecFileException } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * scripts/send-rides.sh, run for real against a stand-in that answers
 * like /api/ingest (docs/upload-keys.md, section 3): what it sends and in
 * which order, what it remembers, and what it does with each answer. The
 * script is a rider's own helper and has nothing of this repository in
 * it, so it is tested from the outside: a shell, curl, a folder.
 */

const SCRIPT = join(process.cwd(), "scripts/send-rides.sh");
const KEY = `kad_${randomBytes(32).toString("base64url")}`;

type Seen = { name: string; key: string; url: string; type: string; body: string };

let server: Server;
let url: string;
let home: string;
let drive: string;
let keyFile: string;
let seen: Seen[];
/** What the stand-in answers for a name, one answer a request; 201 when nothing is said. */
let plan: Map<string, Array<{ status: number; retryAfter?: number }>>;

const activities = () => join(drive, "Garmin", "Activities");

async function put(path: string, content: string, day: number) {
  await writeFile(path, content);
  const written = new Date(Date.UTC(2026, 8, day, 8, 0, 0));
  await utimes(path, written, written);
}

function run(args: string[], env: Record<string, string> = {}) {
  // Nothing of the developer's own surroundings but the path to a shell and curl.
  const surroundings: NodeJS.ProcessEnv = {
    NODE_ENV: "test",
    PATH: process.env.PATH ?? "",
    HOME: home,
    KADENCE_URL: url,
    KADENCE_KEY_FILE: keyFile,
    ...env,
  };
  return new Promise<{ code: number; out: string; err: string }>((resolve) => {
    execFile(
      "sh",
      [SCRIPT, ...args],
      { env: surroundings, timeout: 25_000, encoding: "utf8" },
      (error: ExecFileException | null, out: string, err: string) => {
        const code = error ? (typeof error.code === "number" ? error.code : -1) : 0;
        resolve({ code, out, err });
      },
    );
  });
}

beforeAll(async () => {
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const asked = new URL(request.url ?? "/", "http://stand-in");
      const name = asked.searchParams.get("name") ?? "";
      seen.push({
        name,
        key: request.headers.authorization ?? "",
        url: request.url ?? "",
        type: request.headers["content-type"] ?? "",
        body: Buffer.concat(chunks).toString(),
      });
      const next = plan.get(name)?.shift() ?? { status: 201 };
      const words: Record<number, object> = {
        200: { status: "duplicate" },
        201: { status: "imported" },
        401: { status: "refused", reason: "unauthorized" },
        408: { status: "refused", reason: "too_slow" },
        422: { status: "refused", reason: "unknown_format" },
        429: { status: "refused", reason: "rate_limited" },
      };
      response.writeHead(next.status, {
        "Content-Type": "application/json",
        ...(next.retryAfter ? { "Retry-After": String(next.retryAfter) } : {}),
      });
      response.end(JSON.stringify(words[next.status] ?? {}));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

beforeEach(async () => {
  seen = [];
  plan = new Map();
  home = await mkdtemp(join(tmpdir(), "kadence-send-rides-"));
  keyFile = join(home, "key");
  await writeFile(keyFile, `${KEY}\n`, { mode: 0o600 });
  // Laid out like a Garmin Edge's drive, with what a Mac leaves on one.
  drive = join(home, "GARMIN");
  for (const folder of ["Garmin/Activities/.hidden", "Garmin/Courses", ".Trashes/501/Activities"])
    await mkdir(join(drive, folder), { recursive: true });
  await put(join(activities(), "2026-09-25-07-00-00.fit"), "friday", 25);
  await put(join(activities(), "2026-09-28-06-30-00.FIT"), "monday", 28);
  await put(join(activities(), "2026-09-27-17-02-11.fit"), "sunday", 27);
  await put(join(activities(), `Søndag's "lange" tur & mere.gpx`), "a track", 20);
  await put(join(activities(), "._2026-09-28-06-30-00.FIT"), "what a Mac leaves", 28);
  await put(join(activities(), ".hidden", "hidden.fit"), "hidden", 29);
  await put(join(activities(), "empty.fit"), "", 29);
  await put(join(activities(), "notes.txt"), "not a ride", 29);
  await put(join(drive, "Garmin/Courses/course.fit"), "a course", 29);
  await put(join(drive, ".Trashes/501/Activities/deleted.fit"), "deleted", 29);
});

afterEach(async () => {
  await rm(home, { recursive: true, force: true });
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const NEWEST_FIRST = [
  "2026-09-28-06-30-00.FIT",
  "2026-09-27-17-02-11.fit",
  "2026-09-25-07-00-00.fit",
  `Søndag's "lange" tur & mere.gpx`,
];

describe.skipIf(process.platform === "win32")("scripts/send-rides.sh", () => {
  it("sends the rides of the activities folder, newest first, and nothing else", async () => {
    const { code, out } = await run([drive]);
    expect(code).toBe(0);
    expect(seen.map((request) => request.name)).toEqual(NEWEST_FIRST);
    expect(seen.map((request) => request.body)).toEqual(["monday", "sunday", "friday", "a track"]);
    for (const request of seen) {
      expect(request.key).toBe(`Bearer ${KEY}`);
      expect(request.type).toBe("application/octet-stream");
      expect(request.url).not.toContain("kad_");
    }
    expect(out).toContain("sent      2026-09-28-06-30-00.FIT");
    expect(out.trim().split("\n").at(-1)).toBe(
      "4 sent, 0 already there, 0 refused, 0 sent before and left alone.",
    );
  });

  it("remembers what Kadence has answered for, and sends only what is new", async () => {
    plan.set("2026-09-27-17-02-11.fit", [{ status: 200 }]);
    plan.set("2026-09-25-07-00-00.fit", [{ status: 422 }]);
    const first = await run([drive]);
    expect(first.out).toContain("2 sent, 1 already there, 1 refused");
    expect(first.err).toContain("refused   2026-09-25-07-00-00.fit");

    seen = [];
    const second = await run([drive]);
    expect(second.code).toBe(0);
    expect(seen).toEqual([]);
    expect(second.out.trim()).toBe(
      "0 sent, 0 already there, 0 refused, 4 sent before and left alone.",
    );

    await put(join(activities(), "2026-09-29-07-00-00.fit"), "tuesday", 29);
    await run([drive]);
    expect(seen.map((request) => request.name)).toEqual(["2026-09-29-07-00-00.fit"]);

    // The memory is a list of names only its owner reads, and holds no key.
    const memory = await readFile(`${keyFile}.sent`, "utf8");
    expect(memory).not.toContain("kad_");
    expect(memory.trim().split("\n")).toHaveLength(5);
    expect((await stat(`${keyFile}.sent`)).mode & 0o077).toBe(0);
  });

  it("sends everything again when asked to, and remembers each ride once", async () => {
    await run([drive]);
    seen = [];
    const again = await run(["--all", drive]);
    expect(again.code).toBe(0);
    expect(seen.map((request) => request.name)).toEqual(NEWEST_FIRST);
    expect((await readFile(`${keyFile}.sent`, "utf8")).trim().split("\n")).toHaveLength(4);
  });

  it("stops at a key Kadence does not know, and remembers nothing", async () => {
    plan.set(NEWEST_FIRST[0]!, [{ status: 401 }]);
    const { code, err } = await run([drive]);
    expect(code).toBe(1);
    expect(seen).toHaveLength(1);
    expect(err).toContain("does not know the key");
    expect(err).not.toContain("kad_");
    await expect(stat(`${keyFile}.sent`)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("waits as long as it is asked to, and goes on", async () => {
    plan.set(NEWEST_FIRST[0]!, [{ status: 429, retryAfter: 1 }]);
    const started = Date.now();
    const { code, out } = await run([drive]);
    expect(code).toBe(0);
    expect(Date.now() - started).toBeGreaterThanOrEqual(1_000);
    expect(seen.map((request) => request.name)).toEqual([NEWEST_FIRST[0], ...NEWEST_FIRST]);
    expect(out).toContain("4 sent");
  });

  it("ends well when the pause is a long one, and goes on from there the next time", async () => {
    plan.set(NEWEST_FIRST[1]!, [{ status: 429, retryAfter: 3_000 }]);
    const { code, out, err } = await run([drive]);
    expect(code).toBe(0);
    expect(err).toContain("pause of 3000 seconds");
    expect(out).toContain("1 sent");
    seen = [];
    await run([drive]);
    expect(seen.map((request) => request.name)).toEqual(NEWEST_FIRST.slice(1));
  });

  it("tries a file again that did not arrive in time", async () => {
    plan.set(NEWEST_FIRST[0]!, [{ status: 408 }]);
    const { code, out } = await run([drive]);
    expect(code).toBe(0);
    expect(seen.map((request) => request.name)).toEqual([NEWEST_FIRST[0], ...NEWEST_FIRST]);
    expect(out).toContain("4 sent");
  });

  it("takes a folder of rides as it is when it has no activities folder", async () => {
    const rides = join(home, "rides", "2026");
    await mkdir(rides, { recursive: true });
    await put(join(rides, "a.tcx"), "a", 2);
    await put(join(home, "rides", "b.fit.gz"), "b", 3);
    expect((await run([join(home, "rides")])).code).toBe(0);
    expect(seen.map((request) => request.name)).toEqual(["b.fit.gz", "a.tcx"]);
  });

  it("sends a key nowhere without https, and takes nothing for a key that is none", async () => {
    const plain = await run([drive], { KADENCE_URL: "http://kadence.example" });
    expect(plain.code).toBe(2);
    expect(plain.err).toContain("must begin with https://");

    await writeFile(keyFile, "kad_tooshort\n");
    const short = await run([drive]);
    expect(short.code).toBe(2);
    expect(short.err).toContain("does not hold an upload key");
    expect(seen).toEqual([]);
  });

  it("says so when others on the computer can read the key", async () => {
    await chmod(keyFile, 0o644);
    const { code, err } = await run([drive]);
    expect(code).toBe(0);
    expect(err).toContain("Others on this computer can read");
    expect(err).not.toContain("kad_");
  });

  it("leaves nothing behind when it is done", async () => {
    const tmp = join(home, "tmp");
    await mkdir(tmp);
    // mktemp follows TMPDIR where it follows anything; where it does not, this proves nothing and fails nothing.
    await run([drive], { TMPDIR: tmp });
    expect(await readdir(tmp)).toEqual([]);
  });
});
