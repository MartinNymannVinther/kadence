#!/usr/bin/env sh
# Fetches the glyphs the map draws place and road names with (ADR 0100):
# Noto Sans as signed-distance-field PBFs from Protomaps' basemaps-assets,
# under the SIL Open Font License, into public/map/fonts. Only the ranges
# Latin-script names need are kept; the map draws any other character
# from the browser's own fonts (see public/map/fonts/README.md).
#
#   scripts/fetch-map-fonts.sh               # the pinned commit below
#   FONTS_REF=main scripts/fetch-map-fonts.sh # the newest, to refresh
#
# The files are checked in, so this runs only to refresh or widen them.
set -eu

ref="${FONTS_REF:-028c18f713baecad011301ff7a69acc39bcc2ae7}"
base="https://raw.githubusercontent.com/protomaps/basemaps-assets/$ref/fonts"
stacks="Noto Sans Regular|Noto Sans Medium"
# Basic Latin and Latin-1, Latin Extended-A and -B, Latin Extended
# Additional, General Punctuation.
ranges="0-255 256-511 512-767 7680-7935 8192-8447"
out="public/map/fonts"

echo "$stacks" | tr '|' '\n' | while read -r stack; do
  mkdir -p "$out/$stack"
  encoded="$(printf %s "$stack" | sed 's/ /%20/g')"
  for range in $ranges; do
    curl -fsSL "$base/$encoded/$range.pbf" -o "$out/$stack/$range.pbf"
  done
  echo "fetch-map-fonts: $stack ($ranges)"
done
curl -fsSL "$base/OFL.txt" -o "$out/OFL.txt"
echo "fetch-map-fonts: $ref → $out ($(du -sh "$out" | cut -f1))"
