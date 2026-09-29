import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  importArchive,
  planArchive,
  type ArchiveProgress,
} from "@/components/activities/import-archive";
import { openFolder, type ArchiveSource } from "@/components/activities/read-archive";

/**
 * A Strava archive into Kadence (docs/adr/0030), with the server stood in
 * for: what the archive holds is counted before anything is sent; the
 * rides Kadence has are asked about by hash and never sent; the rest go
 * newest first, three at a time, with their names; and a run that meets
 * the day's limit, a signed-out session or a press on Stop says how many
 * are left.
 */

const RIDER = "rider_1";
const sha = (text: string) => createHash("sha256").update(text).digest("hex");

const CSV = [
  "Activity ID,Activity Name,Activity Type,Filename",
  "1,Første tur,Ride,activities/1.fit.gz",
  "2,Løb,Run,activities/2.gpx",
  "3,Tredje tur,Ride,activities/3.fit.gz",
  "4,Fjerde tur,Virtual Ride,activities/4.fit.gz",
  "5,Femte tur,Ride,activities/5.fit.gz",
].join("\n");

function archive(files: Record<string, string>): ArchiveSource {
  return openFolder(
    Object.entries(files).map(([path, content]) => ({
      path,
      file: new File([content], path.split("/").at(-1)!),
    })),
  );
}

const full = () =>
  archive({
    "export_9/activities.csv": CSV,
    "export_9/activities/1.fit.gz": "ride 1",
    "export_9/activities/2.gpx": "run 2",
    "export_9/activities/3.fit.gz": "ride 3",
    "export_9/activities/4.fit.gz": "ride 4",
    "export_9/activities/5.fit.gz": "ride 5",
  });

type Sent = { only: string; files: string[]; titles: string[] };

/** A Kadence that has the files with these contents, and answers each sent file with `answer`. */
function server(
  has: string[],
  answer: (name: string) => { ok: boolean; error?: string } = () => ({ ok: true }),
  status = 200,
) {
  const sent: Sent[] = [];
  const asked: string[][] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (url === "/api/activities/known") {
        const { riderId, hashes } = JSON.parse(String(init.body));
        expect(riderId).toBe(RIDER);
        asked.push(hashes);
        return Response.json({ known: hashes.filter((h: string) => has.map(sha).includes(h)) });
      }
      expect(url).toBe("/api/activities/archive");
      const form = init.body as FormData;
      expect(form.get("riderId")).toBe(RIDER);
      const files = form.getAll("file") as File[];
      sent.push({
        only: String(form.get("only")),
        files: files.map((f) => f.name),
        titles: form.getAll("title").map(String),
      });
      if (status !== 200)
        return Response.json({ error: "x", retryAfterSeconds: 7_200 }, { status });
      const results = files.map((f) => ({ name: f.name, ...answer(f.name) }));
      const limited = results.some((r) => r.error === "rateLimited");
      return Response.json({ results, retryAfterSeconds: limited ? 7_200 : 0 });
    }),
  );
  return { sent, asked };
}

async function run(
  source: ArchiveSource,
  onlyBike: boolean,
  signal = new AbortController().signal,
) {
  const plan = (await planArchive(source))!;
  const seen: ArchiveProgress[] = [];
  const final = await importArchive(RIDER, source, plan, {
    onlyBike,
    signal,
    onProgress: (p) => seen.push(p),
  });
  return { plan, final, seen };
}

afterEach(() => vi.unstubAllGlobals());

describe("what the archive holds", () => {
  it("is counted before anything is sent: rides, and what is not a ride", async () => {
    const plan = (await planArchive(full()))!;
    expect(plan.rides.map((r) => r.fileName)).toEqual([
      "5.fit.gz",
      "4.fit.gz",
      "3.fit.gz",
      "2.gpx",
      "1.fit.gz",
    ]);
    expect(plan).toMatchObject({ bike: 4, other: 1, named: true });
  });

  it("is nothing when the folder is no Strava archive", async () => {
    expect(await planArchive(archive({ "GARMIN/Activities/1.fit": "ride" }))).toBeNull();
  });

  it("keeps its rides without their names when the list cannot be read", async () => {
    const source = full();
    const read = source.read;
    source.read = (path, cap) =>
      path.endsWith(".csv") ? Promise.reject(new Error("unreadable")) : read(path, cap);
    const plan = (await planArchive(source))!;
    expect(plan.rides).toHaveLength(5);
    expect(plan.named).toBe(false);
  });
});

describe("the rides sent", () => {
  it("are the ones Kadence has not got, newest first, three at a time, with their names", async () => {
    const { sent, asked } = server(["ride 3"]);
    const { final } = await run(full(), true);
    expect(asked).toEqual([[sha("ride 5"), sha("ride 4"), sha("ride 3"), sha("ride 1")]]);
    expect(sent).toEqual([
      {
        only: "bike",
        files: ["5.fit.gz", "4.fit.gz", "1.fit.gz"],
        titles: ["Femte tur", "Fjerde tur", "Første tur"],
      },
    ]);
    expect(final).toMatchObject({
      phase: "finished",
      outcome: "done",
      imported: 3,
      known: 1,
      skipped: 1,
      unreadable: 0,
      left: 0,
    });
  });

  it("include what is not a ride when every activity is asked for", async () => {
    const { sent } = server([]);
    const { final } = await run(full(), false);
    expect(sent.flatMap((s) => s.files)).toEqual([
      "5.fit.gz",
      "4.fit.gz",
      "3.fit.gz",
      "2.gpx",
      "1.fit.gz",
    ]);
    expect(sent.every((s) => s.only === "all")).toBe(true);
    expect(final.imported).toBe(5);
  });

  it("are counted as the server answers: kept, already here, not a ride, unreadable", async () => {
    const answers: Record<string, { ok: boolean; error?: string }> = {
      "5.fit.gz": { ok: true },
      "4.fit.gz": { ok: false, error: "duplicate" },
      "3.fit.gz": { ok: false, error: "not_bike" },
      "1.fit.gz": { ok: false, error: "bad_crc" },
    };
    server([], (name) => answers[name]!);
    const { final } = await run(full(), true);
    expect(final).toMatchObject({
      imported: 1,
      known: 1,
      skipped: 2,
      unreadable: 1,
      outcome: "done",
    });
  });

  it("are the same file once, when the archive holds it twice", async () => {
    const { sent } = server([]);
    await run(
      archive({
        "activities.csv": "Filename\n",
        "activities/7.fit.gz": "same ride",
        "activities/8.fit.gz": "same ride",
      }),
      true,
    );
    expect(sent.flatMap((s) => s.files)).toEqual(["8.fit.gz"]);
  });
});

describe("a run that stops", () => {
  it("at the day's limit says how many are left, and when they can come", async () => {
    // The budget runs out at the third ride of the first request, and stays out.
    server([], (name) =>
      name === "3.fit.gz" || name === "1.fit.gz"
        ? { ok: false, error: "rateLimited" }
        : { ok: true },
    );
    const { final } = await run(full(), true);
    expect(final).toMatchObject({
      outcome: "limit",
      imported: 2,
      left: 2,
      retryAfterSeconds: 7_200,
    });
  });

  it("when the session is gone says so", async () => {
    server([], () => ({ ok: true }), 401);
    const { final } = await run(full(), true);
    expect(final).toMatchObject({ outcome: "signedOut", left: 4, imported: 0 });
  });

  it("when the rider presses Stop sends nothing more", async () => {
    const { sent } = server([]);
    const stop = new AbortController();
    stop.abort();
    const { final } = await run(full(), true, stop.signal);
    expect(final.outcome).toBe("cancelled");
    expect(sent).toEqual([]);
  });

  it("goes on without the question when Kadence cannot be asked; the server passes over what it has", async () => {
    const sentFiles: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        if (url === "/api/activities/known") return new Response(null, { status: 500 });
        const files = (init.body as FormData).getAll("file") as File[];
        sentFiles.push(...files.map((f) => f.name));
        return Response.json({
          results: files.map((f) =>
            f.name === "5.fit.gz" ? { ok: false, error: "duplicate" } : { ok: true },
          ),
        });
      }),
    );
    const { final } = await run(full(), true);
    expect(sentFiles).toEqual(["5.fit.gz", "4.fit.gz", "3.fit.gz", "1.fit.gz"]);
    expect(final).toMatchObject({ imported: 3, known: 1, outcome: "done" });
  });
});
