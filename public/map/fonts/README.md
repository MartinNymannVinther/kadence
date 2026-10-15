# Glyphs for the map's names

The place and road names on the map behind a ride's route (ADR 0100) are
drawn by MapLibre from these files: Noto Sans Regular and Medium as
signed-distance-field glyphs, one `.pbf` per range of 256 code points.
Kadence serves them itself, at `/map/fonts/{fontstack}/{range}.pbf`, so
no font is fetched from anyone else.

- **Source:** Protomaps' basemaps-assets,
  <https://github.com/protomaps/basemaps-assets>, directory `fonts/`, at
  commit `028c18f713baecad011301ff7a69acc39bcc2ae7` (31 October 2025).
- **Licence:** the SIL Open Font License 1.1, in `OFL.txt` beside this
  file. The OFL asks for the licence to travel with the fonts, not for a
  credit on screen.
- **Ranges:** only what names in Latin script need — `0-255`, `256-511`,
  `512-767`, `7680-7935` and `8192-8447`. About 1 MB for both weights. The list
  is `GLYPH_RANGES` in `src/components/activities/map-text.ts`, and
  `tests/charts/map-glyphs.test.ts` holds the files to it.
- **Any other character** (Greek, Cyrillic, Arabic, CJK …): the style
  shows a name in another script in its English form when the tiles have
  one. Where a character outside these ranges is still asked for, MapLibre
  gets a 404 for that range once, warns in the console and draws the
  character from the browser's own fonts. Nothing else is affected.

## Refreshing or widening

```
scripts/fetch-map-fonts.sh                 # the pinned commit, again
FONTS_REF=main scripts/fetch-map-fonts.sh  # the newest
```

To add a range, add it to `ranges` in the script and to `GLYPH_RANGES`,
fetch, and run `pnpm test:unit`.
