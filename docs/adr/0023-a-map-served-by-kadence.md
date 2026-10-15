# ADR 0023: The map behind a route is served by Kadence itself

Status: accepted · Date: 2026-09-28 · Builds on 0022 · Amended by ADR 0099 (the world at low zoom and the training camps in detail) and ADR 0100 (place and road names, in glyphs Kadence serves itself)

## Context

A ride's route was drawn as a line on plain paper (the activity page),
on purpose: map tiles from a map service tell that service where the
rider was, and a young rider's rides start and end at home. Coaches and
riders asked for a map behind the route — a line without roads, water
or towns says little about where the ride went.

Three ways were weighed: a public tile service (fast, but every rider's
area goes to a third party, often outside the EU, and OpenStreetMap's own
servers forbid app use at scale); a tile service the installation chooses
(still a third party, unless self-run); and the map on Kadence's own
server.

## Decision

- **Kadence serves the map.** One PMTiles file of OpenStreetMap data for
  Denmark (Protomaps' basemap, cut to Denmark with Protomaps' own tool,
  about 500 MB) lives on the server (`MAP_FILE`, the `kadence-map`
  volume) and is read by byte ranges from `/api/map/tiles` — signed in,
  rate limited, one capped range per request. No request leaves the
  installation; with the internet cut, the map still works (dogma 2).
- **MapLibre draws it** in the browser (`maplibre-gl`, BSD-3), reading the
  file through `pmtiles` (BSD-3). Both loaded only on an activity page
  with a route. The style is Kadence's own: quiet colours, no labels (no
  font files to host). MapLibre's worker is served from `public/maplibre`
  (`scripts/copy-maplibre-worker.ts`, a test holds it to the installed
  version), so the content policy gains `worker-src 'self'` and nothing
  from any other host.
- **Without the file, nothing changes**: the route is drawn on paper as
  before, and so it is if WebGL fails.
- Fetching the file (`scripts/fetch-map.sh`) talks to Protomaps once, from
  the server, with no rider data in it.

## Trade-offs accepted

- **Two dependencies**, where CLAUDE.md asks for hand-drawn charts: a
  real map cannot sensibly be hand-drawn. Charts stay SVG.
- **Half a gigabyte on the server**, and a map that ages until it is
  fetched again.
- **Denmark only.** A training camp in Mallorca shows the route on paper.
  A wider extract is the same command with another box.
- **No place names** until Kadence hosts fonts; roads, water, woods and
  towns carry the picture.
