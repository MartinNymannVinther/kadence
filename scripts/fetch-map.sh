#!/usr/bin/env sh
# Fetches the map behind routes (ADR 0023): Denmark, cut from the newest
# OpenStreetMap basemap Protomaps builds, with Protomaps' own tool in
# Docker. About 500 MB; only the parts inside Denmark are downloaded.
#
#   scripts/fetch-map.sh            # into ./data/map, for `pnpm dev`
#   scripts/fetch-map.sh compose    # into the kadence-map volume, for docker compose
#
# Set MAP_BUILD=YYYYMMDD to pick a build instead of the newest.
set -eu

build="${MAP_BUILD:-$(curl -fsS https://build-metadata.protomaps.dev/builds.json |
  grep -o '"key": *"[0-9]\{8\}\.pmtiles"' | tail -1 | grep -o '[0-9]\{8\}')}"
[ -n "$build" ] || { echo "fetch-map: could not find the newest build; set MAP_BUILD" >&2; exit 1; }
echo "fetch-map: Protomaps build $build"

if [ "${1:-}" = "compose" ]; then
  MAP_BUILD="$build" docker compose --profile map run --rm map
else
  mkdir -p data/map
  docker run --rm -v "$PWD/data/map:/data" protomaps/go-pmtiles:latest extract \
    "https://build.protomaps.com/$build.pmtiles" /data/denmark.pmtiles \
    --bbox=7.7,54.5,15.4,57.9 --maxzoom=14
  echo "fetch-map: set MAP_FILE=./data/map/denmark.pmtiles in .env"
fi
