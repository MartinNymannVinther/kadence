import type { MetadataRoute } from "next";

/**
 * Kadence installs as a web app (CLAUDE.md: mobile first, a PWA, no
 * native app): standalone, opening on today's page, in 2a's paper and
 * moss. The PNG icons are drawn from src/app/icon.svg by
 * scripts/icons.ts; the SVG itself stays the favicon. No service worker:
 * installing is about the home screen, not offline pages.
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
    orientation: "portrait",
    background_color: "#f7f5f1",
    theme_color: "#f7f5f1",
    categories: ["sports", "health", "education"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
