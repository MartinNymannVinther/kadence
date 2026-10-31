import { describe, expect, it } from "vitest";
import { lastErrorKey } from "@/components/devices/device-words";
import { deviceModelName } from "@/modules/devices/device-name";
import { fromGarmin, inRange } from "@/modules/devices/garmin-ip";
import { garminPushEvents } from "@/modules/devices/garmin-push";
import { garminSport } from "@/modules/devices/garmin-sport";
import { sharesActivities, allowsWorkouts } from "@/modules/devices/permission-words";

/**
 * What a push from Garmin says, read without a database (docs/adr/0113):
 * where it may come from, which of the three kinds Kadence reads, which
 * sport an activity is, the device it was recorded on, and what the
 * rider's permissions mean. Every entry is read on its own, and none is
 * left out for being one too many.
 */

const CALLBACK = "https://apis.garmin.com/wellness-api/rest/activityFile?id=1&token=t";

function file(overrides: Record<string, unknown> = {}) {
  return {
    userId: "g-user",
    summaryId: "100-file",
    activityId: 100,
    fileType: "FIT",
    callbackURL: CALLBACK,
    activityType: "ROAD_BIKING",
    deviceName: "Edge 1040",
    activityName: "Morgentur",
    startTimeInSeconds: 1_790_000_000,
    manual: false,
    ...overrides,
  };
}

describe("Garmin's addresses", () => {
  it("are the ranges Garmin pushes from, and nothing next to them", () => {
    expect(fromGarmin("204.77.162.0")).toBe(true);
    expect(fromGarmin("204.77.163.244")).toBe(true);
    expect(fromGarmin("98.199.125.255")).toBe(true);
    expect(fromGarmin("185.132.79.7")).toBe(true);
    expect(fromGarmin("208.65.207.1")).toBe(true);
    expect(fromGarmin("185.207.95.200")).toBe(true);
    expect(fromGarmin("198.233.176.1")).toBe(true);
    for (const outside of [
      "204.77.161.255",
      "204.77.164.0",
      "98.199.126.0",
      "185.132.80.1",
      "198.233.177.1",
      "10.0.0.1",
      "unknown",
      "",
      "2001:db8::1",
    ])
      expect(fromGarmin(outside), outside).toBe(false);
  });

  it("are read inside an IPv4-mapped IPv6 address too", () => {
    expect(fromGarmin("::ffff:204.77.162.9")).toBe(true);
    expect(fromGarmin("::ffff:203.0.113.9")).toBe(false);
  });

  it("refuse a range that is not one", () => {
    expect(inRange("1.2.3.4", "1.2.3.0/33")).toBe(false);
    expect(inRange("1.2.3.4", "not-a-range")).toBe(false);
    expect(inRange("1.2.3.4", "0.0.0.0/0")).toBe(true);
  });
});

describe("an activity's sport", () => {
  it("is bike for every kind of bike, strength for strength training, other for the rest", () => {
    for (const type of [
      "CYCLING",
      "ROAD_BIKING",
      "INDOOR_CYCLING",
      "VIRTUAL_RIDE",
      "GRAVEL_CYCLING",
      "MOUNTAIN_BIKING",
      "CYCLOCROSS",
      "TRACK_CYCLING",
      "E_BIKE_FITNESS",
      "road_biking",
    ])
      expect(garminSport(type), type).toBe("bike");
    expect(garminSport("STRENGTH_TRAINING")).toBe("strength");
    for (const type of ["RUNNING", "LAP_SWIMMING", "WALKING", "YOGA", "SOMETHING_NEW"])
      expect(garminSport(type), type).toBe("other");
  });

  it("is left to the file when Garmin names no type", () => {
    expect(garminSport(undefined)).toBeUndefined();
    expect(garminSport("  ")).toBeUndefined();
  });
});

describe("a device's name", () => {
  it("is kept plain, one line, at most 80 characters", () => {
    expect(deviceModelName("Edge 1040")).toBe("Edge 1040");
    expect(deviceModelName("  Edge®\n1030 Plus ")).toBe("Edge 1030 Plus");
    expect(deviceModelName("x".repeat(200))).toHaveLength(80);
    expect(deviceModelName("<script>Edge</script>")).toBe("script Edge /script");
  });

  it("is nothing for an activity entered by hand or a device Garmin calls unknown", () => {
    expect(deviceModelName("Edge 1040", true)).toBeUndefined();
    expect(deviceModelName("unknown")).toBeUndefined();
    expect(deviceModelName("")).toBeUndefined();
    expect(deviceModelName(null)).toBeUndefined();
  });
});

describe("a push", () => {
  it("names a FIT file with its id, name, device and sport", () => {
    const [event] = garminPushEvents({ activityFiles: [file()] });
    expect(event).toEqual({
      kind: "activity",
      externalUserId: "g-user",
      notification: {
        externalUserId: "g-user",
        externalId: "100",
        url: CALLBACK,
        fileName: "Morgentur.fit",
        deviceName: "Edge 1040",
        sport: "bike",
      },
    });
  });

  it("takes every type of activity, and leaves out what is not a FIT file", () => {
    const events = garminPushEvents({
      activityFiles: [
        file({ activityId: 1, activityType: "RUNNING" }),
        file({ activityId: 2, activityType: "STRENGTH_TRAINING" }),
        file({ activityId: 3, fileType: "TCX" }),
        file({ activityId: 4, activityType: undefined, deviceName: "unknown", manual: true }),
      ],
    });
    expect(events.map((e) => (e.kind === "activity" ? e.notification : null))).toEqual([
      expect.objectContaining({ externalId: "1", sport: "other" }),
      expect.objectContaining({ externalId: "2", sport: "strength" }),
      { externalUserId: "g-user", externalId: "4", url: CALLBACK, fileName: "Morgentur.fit" },
    ]);
  });

  it("names deregistrations and permission changes, and ignores every other kind", () => {
    const events = garminPushEvents({
      deregistrations: [{ userId: "g-gone" }],
      userPermissionsChange: [
        {
          userId: "31be9cac-5bf9-406b-9fa8-89879bcaceac",
          summaryId: "x1-2",
          permissions: ["ACTIVITY_EXPORT"],
          changeTimeInSeconds: 1_613_065_860,
        },
      ],
      dailies: [{ userId: "g-user" }],
      activities: [{ userId: "g-user", summaryId: "s" }],
    });
    expect(events).toEqual([
      { kind: "deregistration", externalUserId: "g-gone" },
      { kind: "permissions", externalUserId: "31be9cac-5bf9-406b-9fa8-89879bcaceac" },
    ]);
  });

  it("keeps the good entries when one does not fit", () => {
    const events = garminPushEvents({
      activityFiles: [file({ activityId: 7 }), { userId: "bad user!", callbackURL: CALLBACK }, 42],
      deregistrations: [{ nobody: true }, { userId: "g-gone" }],
    });
    expect(events.map((e) => e.kind)).toEqual(["activity", "deregistration"]);
  });

  it("has no limit of its own on how many entries it reads", () => {
    const many = Array.from({ length: 500 }, (_, i) => file({ activityId: 1000 + i }));
    expect(garminPushEvents({ activityFiles: many })).toHaveLength(500);
  });

  it("is nothing when it is not an object of lists", () => {
    expect(garminPushEvents(null)).toEqual([]);
    expect(garminPushEvents({ activityFiles: "x" })).toEqual([]);
  });
});

describe("a rider's permissions", () => {
  it("say whether rides come in and sessions may be sent; an unread list says neither", () => {
    expect(sharesActivities(["ACTIVITY_EXPORT", "WORKOUT_IMPORT"])).toBe(true);
    expect(sharesActivities(["WORKOUT_IMPORT"])).toBe(false);
    expect(sharesActivities(null)).toBeNull();
    expect(allowsWorkouts(["WORKOUT_IMPORT"])).toBe(true);
    expect(allowsWorkouts(["ACTIVITY_EXPORT"])).toBe(false);
    expect(allowsWorkouts(null)).toBe(false);
  });
});

describe("what the Garmin card says went wrong", () => {
  it("has words for a file Garmin will not hand over again and an import given up on", () => {
    expect(lastErrorKey("download_gone")).toBe("download_gone");
    expect(lastErrorKey("import_failed")).toBe("import_failed");
    expect(lastErrorKey("download_status")).toBe("download");
    expect(lastErrorKey("something_new")).toBe("unknown");
    expect(lastErrorKey("")).toBeNull();
  });
});
