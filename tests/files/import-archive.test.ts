import { afterEach, describe, expect, it, vi } from "vitest";
import { importArchive, planArchive } from "@/components/activities/import-archive";
import { archive, full, RIDER, run, server, sha, storage } from "./archive-fixtures";

/**
 * A Strava archive into Kadence (docs/adr/0030), with the server stood in
 * for: what the archive holds is counted before anything is sent; the
 * rides Kadence has are asked about by hash and never sent; the rest go
 * newest first, three at a time, with their names and the list's word for
 * what each was; and a run that meets the day's limit, a signed-out
 * session, a press on Stop or a page that goes says how many are left.
 * What a run leaves for the next: tests/files/import-archive-resume.test.ts.
 */

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
        kinds: ["bike", "bike", "bike"],
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
    expect(final).toMatchObject({ outcome: "cancelled", left: 4 });
    expect(sent).toEqual([]);
  });

  it("while the rides are still being looked at counts every ride as left: none was sent", async () => {
    const { sent, asked } = server([]);
    const stop = new AbortController();
    const source = full();
    const read = source.read;
    // Stop is pressed as the third ride is hashed.
    source.read = (path, cap) => {
      if (path.endsWith("/3.fit.gz")) stop.abort();
      return read(path, cap);
    };
    const { final } = await run(source, true, stop.signal);
    expect(final).toMatchObject({ outcome: "cancelled", left: 4, imported: 0 });
    expect(asked).toEqual([]);
    expect(sent).toEqual([]);
  });

  it("while a request is on its way lets it be answered, and counts what came in", async () => {
    const stop = new AbortController();
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    let posts = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        if (url === "/api/activities/known") return Response.json({ known: [] });
        posts += 1;
        await answered;
        const files = (init.body as FormData).getAll("file") as File[];
        return Response.json({ results: files.map(() => ({ ok: true })) });
      }),
    );
    const running = run(full(), true, stop.signal);
    await vi.waitFor(() => expect(posts).toBe(1));
    stop.abort();
    answer();
    const { final } = await running;
    expect(final).toMatchObject({ outcome: "cancelled", imported: 3, left: 1 });
    expect(posts).toBe(1);
  });

  it("when the page goes ends the request on its way, and sends it nowhere again", async () => {
    const stop = new AbortController();
    const cutoff = new AbortController();
    let posts = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        if (url === "/api/activities/known") return Response.json({ known: [] });
        posts += 1;
        // The answer never comes; only the page going ends the wait.
        return new Promise<Response>((_, reject) =>
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          ),
        );
      }),
    );
    const source = full();
    const plan = (await planArchive(source))!;
    const running = importArchive(RIDER, source, plan, {
      onlyBike: true,
      signal: stop.signal,
      cutoff: cutoff.signal,
      onProgress: () => undefined,
      memory: storage(),
      paceMs: 0,
    });
    await vi.waitFor(() => expect(posts).toBe(1));
    cutoff.abort();
    stop.abort();
    const final = await running;
    expect(final).toMatchObject({ outcome: "cancelled", left: 4, imported: 0 });
    expect(posts).toBe(1);
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
