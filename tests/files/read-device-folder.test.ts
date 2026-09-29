import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  filesOfInput,
  findFresh,
  type FolderFile,
} from "@/components/activities/read-device-folder";

/**
 * A bike computer's folder, read in the browser (docs/adr/0029): which of
 * its rides Kadence does not have. The server is asked with hashes and
 * never with files; a file the drive let go of is passed over; and where
 * the server could not be asked, that is said, not guessed around.
 */

const RIDER = "rider_1";
const sha = (content: string) => createHash("sha256").update(content).digest("hex");

function ride(path: string, content: string, modified: number): FolderFile {
  const file = new File([content], path.split("/").at(-1)!, { lastModified: modified });
  return { path, size: file.size, modified, file };
}

/** A Kadence that has the rides with these contents, and says so when asked. */
function kadenceWith(...contents: string[]) {
  const has = contents.map(sha);
  const asked: Array<{ riderId: string; hashes: string[] }> = [];
  const fetched = vi.fn(async (url: string, init: RequestInit) => {
    expect(url).toBe("/api/activities/known");
    expect(init.method).toBe("POST");
    const question = JSON.parse(String(init.body)) as { riderId: string; hashes: string[] };
    asked.push(question);
    return Response.json({ known: question.hashes.filter((hash) => has.includes(hash)) });
  });
  vi.stubGlobal("fetch", fetched);
  return { asked, fetched };
}

const names = (files: File[]) => files.map((file) => file.name);

afterEach(() => vi.unstubAllGlobals());

describe("the rides Kadence does not have", () => {
  const folder = [
    ride("GARMIN/Garmin/Activities/monday.fit", "monday", 1_000),
    ride("GARMIN/Garmin/Activities/wednesday.fit", "wednesday", 3_000),
    ride("GARMIN/Garmin/Activities/tuesday.fit", "tuesday", 2_000),
    ride("GARMIN/Garmin/Courses/course.fit", "a course", 9_000),
  ];

  it("are found by asking with hashes, and come newest first", async () => {
    const { asked } = kadenceWith("tuesday");
    const found = await findFresh(RIDER, folder);
    expect(names(found.fresh)).toEqual(["wednesday.fit", "monday.fit"]);
    expect(found).toMatchObject({ known: 1, checked: true, unreadable: 0 });
    // Only the rides were asked about, and only by their hashes.
    expect(asked).toEqual([
      { riderId: RIDER, hashes: [sha("wednesday"), sha("tuesday"), sha("monday")] },
    ]);
  });

  it("are none when Kadence has them all", async () => {
    kadenceWith("monday", "tuesday", "wednesday");
    expect(await findFresh(RIDER, folder)).toEqual({
      fresh: [],
      known: 3,
      checked: true,
      unreadable: 0,
    });
  });

  it("are sent once when the folder holds the same ride under two names", async () => {
    kadenceWith();
    const found = await findFresh(RIDER, [
      ride("Rides/a.fit", "the same ride", 2_000),
      ride("Rides/a copy.fit", "the same ride", 1_000),
    ]);
    expect(names(found.fresh)).toEqual(["a.fit"]);
  });

  it("are asked about five hundred at a time", async () => {
    const { asked } = kadenceWith("ride 7", "ride 500");
    const many = Array.from({ length: 501 }, (_, i) => ride(`Rides/${i}.fit`, `ride ${i}`, i));
    const found = await findFresh(RIDER, many);
    expect(asked.map((question) => question.hashes.length)).toEqual([500, 1]);
    expect(found.fresh).toHaveLength(499);
    expect(found.known).toBe(2);
  });

  it("ask nothing of a folder without rides", async () => {
    const { fetched } = kadenceWith();
    expect(await findFresh(RIDER, [ride("Notes/readme.txt", "hello", 1)])).toEqual({
      fresh: [],
      known: 0,
      checked: true,
      unreadable: 0,
    });
    expect(fetched).not.toHaveBeenCalled();
  });
});

describe("a file the drive let go of", () => {
  it("is passed over, and the rest are still rides", async () => {
    kadenceWith("monday");
    const gone = ride("Rides/gone.fit", "gone", 5_000);
    gone.file.arrayBuffer = () => Promise.reject(new Error("the cable came loose"));
    const found = await findFresh(RIDER, [
      gone,
      ride("Rides/monday.fit", "monday", 1_000),
      ride("Rides/tuesday.fit", "tuesday", 2_000),
    ]);
    expect(names(found.fresh)).toEqual(["tuesday.fit"]);
    expect(found).toMatchObject({ known: 1, checked: true, unreadable: 1 });
  });
});

describe("when Kadence could not be asked", () => {
  const folder = [
    ride("Rides/monday.fit", "monday", 1_000),
    ride("Rides/tuesday.fit", "tuesday", 2_000),
  ];

  it("says so, and hands over every ride, newest first", async () => {
    for (const answer of [
      () => Promise.resolve(new Response(null, { status: 429 })),
      () => Promise.resolve(new Response("<html>", { status: 200 })),
      () => Promise.reject(new Error("offline")),
    ]) {
      vi.stubGlobal("fetch", vi.fn(answer));
      const found = await findFresh(RIDER, folder);
      expect(names(found.fresh)).toEqual(["tuesday.fit", "monday.fit"]);
      expect(found).toMatchObject({ known: 0, checked: false, unreadable: 0 });
    }
  });

  it("says so where the browser cannot hash, and asks nothing", async () => {
    const { fetched } = kadenceWith("monday");
    // A page that is not served over https has no crypto.subtle.
    vi.stubGlobal("crypto", {});
    const found = await findFresh(RIDER, folder);
    expect(names(found.fresh)).toEqual(["tuesday.fit", "monday.fit"]);
    expect(found).toMatchObject({ known: 0, checked: false });
    expect(fetched).not.toHaveBeenCalled();
  });
});

describe("a folder handed over by a file input", () => {
  it("is every file with a ride's name, under its path in the folder", () => {
    const at = (path: string, content = "x") => {
      const file = new File([content], path.split("/").at(-1)!, { lastModified: 7 });
      Object.defineProperty(file, "webkitRelativePath", { value: path });
      return file;
    };
    const list = [
      at("GARMIN/Garmin/Activities/a.fit"),
      at("GARMIN/Garmin/Activities/._a.fit"),
      at("GARMIN/Garmin/Settings/settings.txt"),
      at("GARMIN/b.GPX", "xyz"),
    ] as unknown as FileList;
    expect(filesOfInput(list).map(({ file: _file, ...entry }) => entry)).toEqual([
      { path: "GARMIN/Garmin/Activities/a.fit", size: 1, modified: 7 },
      { path: "GARMIN/b.GPX", size: 3, modified: 7 },
    ]);
  });
});
