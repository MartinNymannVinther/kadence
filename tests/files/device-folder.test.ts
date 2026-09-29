import { describe, expect, it } from "vitest";
import {
  hasRideName,
  isWalkable,
  MAX_FOLDER_FILES,
  pickRideFiles,
  type FolderEntry,
} from "@/modules/files/device-folder";

/**
 * A folder picked from a bike computer: the rides in it, and none of the
 * other .fit files a device keeps beside them.
 */

const file = (path: string, modified = 1, size = 1000): FolderEntry => ({ path, size, modified });
const paths = (entries: FolderEntry[]) => entries.map((e) => e.path);

describe("the rides in a picked folder", () => {
  it("are the ones in the device's activities folder, when it has one", () => {
    const edge = [
      file("Garmin/Activities/2026-09-01-07-00-00.fit", 3),
      file("Garmin/Activities/2026-09-02-07-00-00.fit", 4),
      file("Garmin/Courses/Rundt om Furesøen.fit", 9),
      file("Garmin/Workouts/4x8.fit", 9),
      file("Garmin/Settings/Settings.fit", 9),
      file("Garmin/Totals/Totals.fit", 9),
      file("Garmin/Records/Records.fit", 9),
      file("Garmin/GarminDevice.xml", 9),
    ];
    expect(paths(pickRideFiles(edge))).toEqual([
      "Garmin/Activities/2026-09-02-07-00-00.fit",
      "Garmin/Activities/2026-09-01-07-00-00.fit",
    ]);
  });

  it("are found whatever the folder is called in capitals, as on a watch", () => {
    const watch = [file("GARMIN/ACTIVITY/A1B2C3D4.FIT"), file("GARMIN/MONITOR/M1.FIT")];
    expect(paths(pickRideFiles(watch))).toEqual(["GARMIN/ACTIVITY/A1B2C3D4.FIT"]);
  });

  it("are everything readable when the folder picked is the activities folder itself", () => {
    const picked = [file("a.fit", 1), file("b.gpx", 2), file("c.tcx", 3), file("d.fit.gz", 4)];
    expect(paths(pickRideFiles(picked))).toEqual(["d.fit.gz", "c.tcx", "b.gpx", "a.fit"]);
  });

  it("leave out hidden files, what macOS leaves behind, and what is no ride file", () => {
    const messy = [
      file("Activities/ride.fit"),
      file("Activities/._ride.fit"),
      file("Activities/.DS_Store"),
      file("Activities/notes.txt"),
      file("Activities/photo.jpg"),
      file("Activities/fit"),
    ];
    expect(paths(pickRideFiles(messy))).toEqual(["Activities/ride.fit"]);
  });

  it("leave out the empty file and the one over the upload's cap", () => {
    const sizes = [
      file("Activities/empty.fit", 1, 0),
      file("Activities/huge.fit", 1, 25 * 1024 * 1024 + 1),
      file("Activities/just.fit", 1, 25 * 1024 * 1024),
    ];
    expect(paths(pickRideFiles(sizes))).toEqual(["Activities/just.fit"]);
  });

  it("come newest first, and the same every time when two are as new", () => {
    const same = [
      file("Activities/b.fit", 5),
      file("Activities/a.fit", 5),
      file("Activities/c.fit", 7),
    ];
    expect(paths(pickRideFiles(same))).toEqual([
      "Activities/c.fit",
      "Activities/a.fit",
      "Activities/b.fit",
    ]);
  });

  it("stop at the newest thousand", () => {
    const many = Array.from({ length: MAX_FOLDER_FILES + 50 }, (_, i) =>
      file(`Activities/${i}.fit`, i),
    );
    const picked = pickRideFiles(many);
    expect(picked).toHaveLength(MAX_FOLDER_FILES);
    expect(picked[0]!.path).toBe(`Activities/${MAX_FOLDER_FILES + 49}.fit`);
  });

  it("are the same whichever way the browser handed the folder over", () => {
    // A file input hands over every file at once, the wastebasket's too.
    const everything = [
      file("GARMIN/Garmin/Activities/ride.fit"),
      file("GARMIN/.Trashes/501/Activities/deleted.fit"),
      file("GARMIN/Garmin/.hidden/Activities/odd.fit"),
      file("GARMIN/a/b/c/d/e/Activities/too-deep.fit"),
    ];
    expect(paths(pickRideFiles(everything))).toEqual(["GARMIN/Garmin/Activities/ride.fit"]);
  });

  it("are none in a folder without any", () => {
    expect(pickRideFiles([file("Documents/cv.pdf")])).toEqual([]);
    expect(pickRideFiles([])).toEqual([]);
  });
});

describe("walking into a folder", () => {
  it("goes as deep as a device's layout and no deeper, and never into a hidden one", () => {
    expect(isWalkable("Garmin", 0)).toBe(true);
    expect(isWalkable("Activities", 3)).toBe(true);
    expect(isWalkable("deeper", 4)).toBe(false);
    expect(isWalkable(".Trashes", 0)).toBe(false);
    expect(isWalkable(".Spotlight-V100", 1)).toBe(false);
  });
});

describe("a name that may be a ride's", () => {
  it("has one of the upload's endings, in any case, and no dot first", () => {
    for (const name of ["a.fit", "A.FIT", "b.tcx", "c.gpx", "d.fit.gz", "e.zip"])
      expect(hasRideName(name), name).toBe(true);
    for (const name of ["", "fit", "a.txt", "._a.fit", ".fit", "a.fit.bak"])
      expect(hasRideName(name), name).toBe(false);
  });
});
