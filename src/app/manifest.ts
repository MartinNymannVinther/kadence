import type { MetadataRoute } from "next";

/**
 * Kadence installs as a web app (CLAUDE.md: mobile first, a PWA, no
 * native app): standalone, opening on today's page, in 2a's paper and
 * moss. The PNG icons are drawn from src/app/icon.svg by
 * scripts/icons.ts; the SVG itself stays the favicon. No service worker:
 * installing is about the home screen, not offline pages.
 *
 * No orientation: the phone in a hand is upright, but a tablet or a phone
 * on the handlebars in front of a trainer lies on its side, and Rulle
 * must be free to turn with it (ADR 0060).
 *
 * Installed, Kadence is a place to share a ride file to (ADR 0029): the
 * phone's share sheet posts it to /api/share, which imports it for the
 * rider who is signed in. Browsers that know share targets are Chrome's
 * on Android and on a computer; Safari has none, and ignores the entry.
 * A .fit file has no media type of its own on a phone, so plain bytes
 * are accepted too, and what is no ride is refused on arrival.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kadence",
    short_name: "Kadence",
    description:
      "Træningsplanlægning for unge cykelryttere, deres trænere og forældre. Open source, en del af Haij-familien.",
    lang: "da",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    background_color: "#f7f5f1",
    theme_color: "#f7f5f1",
    categories: ["sports", "health", "education"],
    share_target: {
      action: "/api/share",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        files: [
          {
            name: "file",
            accept: [
              ".fit",
              ".tcx",
              ".gpx",
              ".gz",
              ".zip",
              "application/vnd.ant.fit",
              "application/vnd.garmin.tcx+xml",
              "application/gpx+xml",
              "application/gzip",
              "application/zip",
              "application/octet-stream",
            ],
          },
        ],
      },
    },
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
