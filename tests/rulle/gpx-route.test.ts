import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readRouteGpx, RouteError, ROUTE_LIMITS, type RouteErrorCode } from "@/modules/rulle";

const vejle = readFileSync("public/rulle/routes/vejle-munkebjerg.gpx", "utf8");

const gpx = (body: string) =>
  `<?xml version="1.0"?><gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">${body}</gpx>`;

const pt = (lat: number, lon: number, ele?: number, tag = "trkpt") =>
  `<${tag} lat="${lat}" lon="${lon}">${ele === undefined ? "" : `<ele>${ele}</ele>`}</${tag}>`;

function refusal(xml: string): RouteErrorCode | "none" {
  try {
    readRouteGpx(xml);
    return "none";
  } catch (error) {
    if (error instanceof RouteError) return error.code;
    throw error;
  }
}

describe("the route that comes with Kadence", () => {
  const route = readRouteGpx(vejle);

  it("reads as a named track with a height on every point", () => {
    expect(route.name).toBe("Vejle: Fjorden, Munkebjerg og Kiddesvej");
    expect(route.points).toHaveLength(610);
    expect(route.points.every((p) => Number.isFinite(p.ele))).toBe(true);
  });

  it("starts at Vejle station and climbs to Munkebjerg's height", () => {
    expect(route.points[0]).toMatchObject({ lat: 55.706672, lon: 9.536589 });
    const top = Math.max(...route.points.map((p) => p.ele));
    expect(top).toBeGreaterThan(85);
    expect(top).toBeLessThan(110);
  });
});

describe("a planner's file", () => {
  it("reads a route of route points when there is no track", () => {
    const route = readRouteGpx(
      gpx(
        `<rte><name>Ud og hjem</name>${pt(55.7, 9.5, 10, "rtept")}${pt(55.71, 9.5, 20, "rtept")}</rte>`,
      ),
    );
    expect(route.name).toBe("Ud og hjem");
    expect(route.points.map((p) => p.ele)).toEqual([10, 20]);
  });

  it("prefers the track when a file has both", () => {
    const route = readRouteGpx(
      gpx(
        `<rte>${pt(1, 1, 1, "rtept")}${pt(1, 2, 1, "rtept")}</rte>` +
          `<trk><trkseg>${pt(55, 9, 5)}${pt(55.1, 9, 6)}${pt(55.2, 9, 7)}</trkseg></trk>`,
      ),
    );
    expect(route.points).toHaveLength(3);
  });

  it("takes the name from the metadata first, and decodes its entities", () => {
    const route = readRouteGpx(
      gpx(
        `<metadata><name>Gl. Kongevej &amp; Munkebjerg</name></metadata>` +
          `<trk><name>track</name><trkseg>${pt(55, 9, 5)}${pt(55.1, 9, 6)}</trkseg></trk>`,
      ),
    );
    expect(route.name).toBe("Gl. Kongevej & Munkebjerg");
  });

  it("draws a missing height along the line between its neighbours", () => {
    const points = Array.from({ length: 20 }, (_, i) =>
      pt(55 + i / 1000, 9, i === 5 ? undefined : i * 2),
    );
    const route = readRouteGpx(gpx(`<trk><trkseg>${points.join("")}</trkseg></trk>`));
    expect(route.points[5]!.ele).toBe(10);
    expect(route.points[4]!.ele).toBe(8);
  });

  it("leaves out points whose position is not a position", () => {
    const route = readRouteGpx(
      gpx(`<trk><trkseg>${pt(55, 9, 1)}${pt(95, 9, 1)}${pt(55.1, 9, 2)}</trkseg></trk>`),
    );
    expect(route.points).toHaveLength(2);
  });
});

describe("what is refused", () => {
  it("a file that is not GPX", () => {
    expect(refusal(`<kml><Placemark/></kml>`)).toBe("not_gpx");
  });

  it("a GPX without points", () => {
    expect(refusal(gpx("<trk><trkseg></trkseg></trk>"))).toBe("no_points");
  });

  it("a route without heights: a flat line is not a profile", () => {
    const points = Array.from({ length: 10 }, (_, i) => pt(55 + i / 100, 9, i < 8 ? undefined : 5));
    expect(refusal(gpx(`<trk><trkseg>${points.join("")}</trkseg></trk>`))).toBe("no_elevation");
  });

  it("a document type declaration, the way into entity expansion", () => {
    const hostile = `<?xml version="1.0"?><!DOCTYPE gpx [<!ENTITY a "aaaa">]><gpx>${pt(55, 9, 1)}${pt(56, 9, 1)}</gpx>`;
    expect(refusal(hostile)).toBe("corrupt");
  });

  it("a file that ends inside a tag", () => {
    expect(refusal(`<gpx><trk><trkseg>${pt(55, 9, 1)}<trkpt lat="55.1"`)).toBe("corrupt");
  });

  it("a file larger than any planner writes", () => {
    expect(refusal(" ".repeat(ROUTE_LIMITS.maxChars + 1))).toBe("too_large");
  });
});
