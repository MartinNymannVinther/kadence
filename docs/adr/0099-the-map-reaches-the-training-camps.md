# ADR 0099: The map reaches the training camps

Status: accepted · Date: 2026-10-14 · Amends ADR 0023 (the map behind a route is served by Kadence itself) · Amended by ADR 0100 (the map names places and roads, once where the two files overlap)

## Context

ADR 0023 put a map behind a ride's route, served by Kadence from one
PMTiles file of Denmark, and accepted "Denmark only" as a trade-off: a
training camp in Mallorca showed the route on plain paper. Martin asked:
"Kan man få kort bagved ture f.eks. kørt på Mallorca?" Danish youth teams
go to the same few places every spring — Mallorca, Girona, Calpe and the
Canary Islands — and some riders race or holiday anywhere.

Three ways were weighed. The whole planet in detail is about 120 GB, too
much for one small server. A public tile service outside Denmark would
tell a third party where a rider was, which ADR 0023 refused for good
reasons that have not changed. Two files on Kadence's own server — the
world coarsely, the camps in detail — cost about a gigabyte.

## Decision

- **Two files, both served by Kadence.** `world.pmtiles` holds every
  country to zoom 8 (560 MB: coast, water, woods, towns and the bigger
  roads). `detail.pmtiles` holds Denmark and six training camps to zoom
  14 (640 MB: every road and path). Both are cut from Protomaps' daily
  OpenStreetMap build with Protomaps' own tool, as before. Zoom 8 was
  measured, not guessed: zoom 6 is 45 MB and 7 is 190 MB, both too coarse
  to tell one road from the next on a ride; zoom 9 would be about 1.6 GB.
- **The regions are data.** `scripts/map-regions.geojson` is one
  MultiPolygon of generous rectangles: Denmark (the box ADR 0023 used),
  Mallorca, Girona with the Costa Brava and the Pyrenees foothills, Calpe
  and the Costa Blanca, Gran Canaria, Tenerife and Lanzarote. Adding a
  camp is a rectangle, a test place and a new fetch (docs/deploy.md 6c);
  a test holds every camp's town inside it.
- **`MAP_FILE` stays the detail file, `MAP_WORLD_FILE` is new.** The
  world is served from `/api/map/world` by the same code as
  `/api/map/tiles` (`src/core/map`): signed in, rate limited per person
  and file, one capped range per request. The page tells the browser
  which files are there, each with a version from its size and time, and
  the version goes into the file's address — so a newly fetched file is
  never read through ranges cached from the old one. Responses carry the
  same version as an ETag.
- **The world lies under the detail.** The style draws the world's layers
  first, then the detail's land as a fill over them, then the detail's
  layers: inside the regions the detail is what shows, outside them the
  world. Both are drawn by the same layer function with a source and an
  id prefix. There are still no labels (ADR 0023), so nothing is named
  twice where the two overlap.
- **Existing installations keep their map.** Compose now names
  `/data/map/detail.pmtiles`; until it exists, a `denmark.pmtiles` beside
  it is read in its place, and without a world the detail is drawn alone,
  exactly as before. The fetch writes each file under a `.next` name and
  moves it into place when it is whole, because go-pmtiles writes its
  header first and the file at full size from the start: half a file
  would look whole to the app.
- **Fetching on a server without the repository** is plain `docker run`
  lines in the host's shell (docs/deploy.md 6c); the regions file is read
  from the public repository on GitHub. Nothing about a rider is in any
  of these requests.

## Trade-offs accepted

- **1.2 GB on the server instead of half a gigabyte**, and twice that for
  a few minutes while a refresh writes the new files beside the old.
- **A coarse map outside the regions.** A ride in the Alps or Belgium
  shows coast, water, woods, towns and the main roads, overzoomed from
  zoom 8 — enough to see where the ride went, not which lane it took. A
  region that matters is added to the GeoJSON.
- **Seams at the regions' edges.** The detail ends at tile borders, so
  the line between fine and coarse moves with the zoom. The rectangles are
  generous so that a camp's rides stay inside them.
- **Against no outside tile service.** Every one of these costs is paid
  so that no rider's position reaches a map service: ADR 0023's reason
  holds abroad as it does at home.
- **The fetch depends on GitHub** for the regions file when the server has
  no checkout. It is public data, read once, and the compose and local
  fetches read the checked-in file instead.
