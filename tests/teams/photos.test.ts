import { describe, expect, it } from "vitest";
import { plainArtist, readImageInfo } from "@/modules/teams/photos";
import { REGISTRY } from "@/modules/teams/registry";

/**
 * Photographs from Wikimedia Commons (ADR 0072): what Commons' API says
 * about a file is read into a credit line, and only a licence that
 * allows a copy with credit gets through.
 */

const answer = (
  licence: string,
  artist = '<a href="https://commons.wikimedia.org/wiki/User:Hejsa">Hejsa</a>',
) => ({
  query: {
    pages: {
      "123": {
        imageinfo: [
          {
            thumburl: "https://upload.wikimedia.org/x/640px-Team.jpg",
            thumbwidth: 640,
            thumbheight: 480,
            descriptionurl: "https://commons.wikimedia.org/wiki/File:Team.jpg",
            extmetadata: { LicenseShortName: { value: licence }, Artist: { value: artist } },
          },
        ],
      },
    },
  },
});

describe("a photograph from Commons", () => {
  it("is read with its rendering, photographer and licence", () => {
    expect(readImageInfo(answer("CC BY-SA 4.0"))).toEqual({
      thumb: "https://upload.wikimedia.org/x/640px-Team.jpg",
      artist: "Hejsa",
      licence: "CC BY-SA 4.0",
      pageUrl: "https://commons.wikimedia.org/wiki/File:Team.jpg",
      width: 640,
      height: 480,
    });
    expect(readImageInfo(answer("CC0"))?.licence).toBe("CC0");
    expect(readImageInfo(answer("Public domain"))?.licence).toBe("Public domain");
  });

  it("is refused under a licence that does not allow a copy with credit, or with no rendering", () => {
    expect(readImageInfo(answer("CC BY-NC 4.0"))).toBeNull();
    expect(readImageInfo(answer("Fair use"))).toBeNull();
    expect(readImageInfo({ query: { pages: { "1": { imageinfo: [{}] } } } })).toBeNull();
    expect(readImageInfo(null)).toBeNull();
  });

  it("writes the photographer as words, not markup", () => {
    expect(plainArtist('<a href="x">Leif  Jørgensen</a>')).toBe("Leif Jørgensen");
    expect(plainArtist("x".repeat(200))).toHaveLength(80);
  });

  it("is named in the registry by its Commons file, with a jersey checked the same day", () => {
    const withPhoto = REGISTRY.filter((t) => t.photo);
    expect(withPhoto.length).toBeGreaterThanOrEqual(7);
    for (const team of withPhoto) {
      expect(team.photo).toMatch(/^File:.+\.jpe?g$/i);
      expect(team.colours).toBeDefined();
    }
  });
});
