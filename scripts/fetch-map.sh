#!/usr/bin/env sh
# Fetches the map behind routes (ADR 0023, 0099), cut from the newest
# OpenStreetMap basemap Protomaps builds, with Protomaps' own tool in
# Docker. Two files:
#
#   world.pmtiles   every country to zoom 8, about 560 MB
#   detail.pmtiles  the regions in scripts/map-regions.geojson (Denmark and
#                   the training camps) to zoom 14, about 640 MB
#
#   scripts/fetch-map.sh            # into ./data/map, for `pnpm dev`
#   scripts/fetch-map.sh compose    # into the kadence-map volume, for docker compose
#
# Each file is written under a .next name and moved into place when it is
# whole, so the app never reads one half written. Set MAP_BUILD=YYYYMMDD to
# pick a build instead of the newest, MAP_WORLD_MAXZOOM for a finer world.
set -eu

build="${MAP_BUILD:-$(curl -fsS https://build-metadata.protomaps.dev/builds.json |
  grep -o '"key": *"[0-9]\{8\}\.pmtiles"' | tail -1 | grep -o '[0-9]\{8\}')}"
[ -n "$build" ] || { echo "fetch-map: could not find the newest build; set MAP_BUILD" >&2; exit 1; }
source="https://build.protomaps.com/$build.pmtiles"
world_maxzoom="${MAP_WORLD_MAXZOOM:-8}"
echo "fetch-map: Protomaps build $build"

if [ "${1:-}" = "compose" ]; then
  extract() { docker compose --profile map run --rm map extract "$source" "$@"; }
  into_place() { docker compose --profile map run --rm map-files mv "$1.next.pmtiles" "$1.pmtiles"; }
else
  mkdir -p data/map
  extract() {
    docker run --rm -v "$PWD/data/map:/data/map" \
      -v "$PWD/scripts/map-regions.geojson:/regions.geojson:ro" \
      protomaps/go-pmtiles:latest extract "$source" "$@"
  }
  into_place() { mv "data/map/$1.next.pmtiles" "data/map/$1.pmtiles"; }
fi

echo "fetch-map: the world to zoom $world_maxzoom"
extract /data/map/world.next.pmtiles --maxzoom="$world_maxzoom"
into_place world
echo "fetch-map: Denmark and the training camps to zoom 14"
extract /data/map/detail.next.pmtiles --region=/regions.geojson --maxzoom=14
into_place detail

if [ "${1:-}" != "compose" ]; then
  echo "fetch-map: set these in .env:"
  echo "  MAP_FILE=./data/map/detail.pmtiles"
  echo "  MAP_WORLD_FILE=./data/map/world.pmtiles"
fi
