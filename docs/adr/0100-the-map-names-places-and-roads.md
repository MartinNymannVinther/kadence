# ADR 0100: The map names places and roads

Status: accepted · Date: 2026-10-15 · Amends ADR 0023 (the map behind a route is served by Kadence itself) and ADR 0099 (the map reaches the training camps)

## Context

ADR 0023 drew the map behind a ride's route without a single name, and
said why: "no place names until Kadence hosts fonts". ADR 0099 kept it so
when the world and the training camps came. Martin asked how to get the
names of towns and roads onto the map: a route past unnamed villages on
unnamed roads says less than it could, especially at a camp abroad, where
the riders do not know the roads.

The names were in the files all along. Protomaps' basemap (schema v4)
carries them in its `places` layer (`name`, `kind`, `kind_detail`,
`min_zoom`, `sort_key`, and `script` with `name:en` for names in another
script) and its `roads` layer (`name`, `ref`, `kind`); this was checked
against tiles from both of Kadence's files before anything was drawn. What
was missing is the glyphs MapLibre draws text with. A glyph service on
someone else's host would be a third party in the path of every map, which
is exactly what ADR 0023 refused.

## Decision

- **Kadence serves the glyphs itself.** Noto Sans Regular and Medium as
  signed-distance-field PBFs, taken from Protomaps' basemaps-assets at a
  pinned commit by `scripts/fetch-map-fonts.sh`, checked in under
  `public/map/fonts` with the SIL Open Font License beside them. The
  style's `glyphs` URL is built from the page's own origin, as the tiles'
  are; the content policy's `connect-src 'self'` already covers it.
- **Only the Latin ranges are shipped**: `0-255`, `256-511`, `512-767`,
  `7680-7935` and `8192-8447`, about 1 MB for both weights. That is every
  letter of Danish, Spanish and Catalan names (æøå, ñ, ç, the accents, the
  middle dot of l·l) and of the other Latin-script languages of Europe,
  with the punctuation names use. A test parses the files and holds them
  to those letters.
- **A name in another script** (the tiles mark it with `script`) is shown
  in its English form where the tiles have one: Moscow, not Москва. Where
  a character outside the shipped ranges is still asked for, MapLibre gets
  one 404 for that range, warns in the console and draws the
  character from the browser's own fonts. Nothing else on the map is
  affected; this was checked on a real render. A range that is shipped
  but lacks a glyph is worse — the character is left out — which is why
  Geometric Shapes is not shipped: Copenhagen's ring roads numbered "○2"
  in OpenStreetMap are written "O2", as the rest of them are.
- **What is named, and from when.** Countries and regions coarsely, a
  city early, a town later and a village only zoomed in, each from the
  zoom its tile gives (`min_zoom`), and a city's quarters faintly from
  zoom 12. OSM's named spots (`place=locality`: a bastion, a bog), farms
  and lone houses are left out. Road names follow the line, the big roads
  from zoom 12 and the rest from 13. Road numbers (21, E 45, Ma-10) are
  small upright text, the first of several, with no shields and so no
  sprite to host.
- **Quiet, and under the route.** Grey text on a halo of the map's own
  paper in light and dark (`MapPalette.label`). The labels are the last
  layers of the style; the route, its ends and the dot are added after the
  style has loaded, so they lie over every name (`route-layers.ts`).
- **Named once where the two files overlap.** The detail's labels are
  placed over the world's and MapLibre places the top layer first, so
  where both files name the same place the two labels lie exactly on each
  other and the world's is hidden by collision. The world's roads carry no
  names, so road names come from the detail alone. Road numbers come from
  the world below zoom 9 and from the detail from 9 up: the world's lines
  are cut at zoom 8 and drift from the road when enlarged, and a number
  from each would sit side by side. Checked on renders of Copenhagen,
  Zealand, Mallorca, the Alps and Europe by listing the labels MapLibre
  actually placed: no name was drawn from both files.
- **Without glyphs or files, nothing changes.** The style has names only
  when it has a glyphs address and at least one file; without the world
  file nothing about the world is added, names included.
- The code is `map-text.ts` (glyphs, fonts, colours, which name),
  `map-labels.ts` (places, and the order) and `map-road-labels.ts`,
  beside `map-style.ts`.

## Trade-offs accepted

- **About 1 MB of font files in the repository and in the image**, under
  the OFL, which asks for the licence to travel with the fonts and for no
  credit on screen. They are binary files a person cannot review; they are
  fetched by a script from a pinned commit, so anyone can fetch them again
  and compare.
- **A busier map.** Names compete with the route for the eye. They are
  kept small and grey, under the route, and thinned by the tiles' own
  zoom levels, but a map with names is not as calm as one without.
- **English for other scripts.** A ride in Greece shows Athens, not
  Αθήνα. Kadence's riders read Latin script, and shipping Greek, Cyrillic
  and the rest would cost several more megabytes for rides that are rare.
- **Coarse names outside the regions.** The world file stops at zoom 8, so
  outside Denmark and the camps there are no road names, no numbers from
  zoom 9, and only the places the world file carries.
