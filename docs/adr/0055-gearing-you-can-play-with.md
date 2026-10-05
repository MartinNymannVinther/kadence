# ADR 0055: Gearing you can play with, and one suggested way to build it

Status: accepted · Date: 2026-10-05 · Amends ADR 0047 ("Products are named neutrally")

## Context

The gearing calculator (ADR 0047) asked for the class in a dropdown and
the teeth in number fields, answered in sentences, and listed seven
products neutrally — every junior cassette and Magene's chainrings, each
with what it allows. Martin asked for it to be more interactive and
simpler (5 October 2026): the class chosen on larger symbols, sliders
for the tyre, the chainring and the smallest sprocket, a drawing that
shows what "metres per pedal turn" means, and a shorter answer about
parts. A sprocket of 10 or 11 teeth is an ordinary cassette and needs no
reference; a bigger one means a junior cassette such as Miche's, with
the chainrings that match — Shimano's or SRAM's ordinary ones, or a 1×
ring from Strada Lab (first written as Magene; Martin corrected it the
same day).

## Decision

- **Five class buttons** with the class, its ages and its limit, radio
  buttons underneath so the keyboard and a screen reader work as before.
  The ages are DCU's (`GEAR_CLASS_AGES` beside the limits in
  `src/modules/dcu/gearing.ts`).
- **Sliders over short lists**: tyre width 23–32 mm, chainring 28–56 T,
  smallest sprocket 10–16 T, each with a step button on either side and
  its value spoken in words. A measured circumference is still possible
  behind a switch.
- **One turn of the pedals, drawn to scale and animated.** The bike
  starts with a pedal straight down, as the commissaire sets it, turns
  the cranks once and rolls its rollout along a ruler in metres past or
  short of the limit; chainring and sprocket are drawn at their real
  pitch size, and a dot on each tyre lets the wheel's turns be counted.
  It plays once when the page opens and again on a button; with reduced
  motion it shows the finished turn and moves only when asked.
- **The limit is marked plainly** (Martin, the same day). The limit is a
  solid line with its value on a label. The moment the bike passes it,
  the distance turns the warning ink with a badge "Over grænsen", the
  stretch beyond the limit is hatched, the bike is drawn in the warning
  ink and a label gives the centimetres over. A finished turn within
  the limit gives the centimetres under, in yellow and "Lige ved
  grænsen" within 5 cm. Every state is said in words and with an icon,
  never by colour alone.
- **A concrete build for the gear on the sliders** (`propose` in
  `src/modules/calc/gear-build.ts`). When the gear holds, the build is
  that gear: a cassette and a chainring that give it, on the nearest
  smaller ring a product carries if none carries the one chosen. When
  it is over the limit, two builds that hold: the chosen chainring with
  the smallest sprocket that passes, and the chosen sprocket with the
  biggest ring that passes; where no part in the list can do it, the
  calculator says so. Each build is drawn — the drivetrain from the
  chain's side, to scale, with the smallest sprocket in moss and a
  double's small ring dashed as the one that does not count — and named
  part by part with the price and shop where it was seen.
- **Which parts.** For 10 or 11 teeth the cassette is an ordinary one
  and no product is named. For 12 to 16 teeth one concrete cassette —
  Miche's first, another maker's only where Miche has none for that
  sprocket — for 12-speed and, where one exists, for 11-speed. Miche has
  no 12-speed cassette on 12, 13 or 15 teeth, so 13 and 15 get
  E.Dubied's and 12 only the 11-speed. Chainrings are Shimano's and
  SRAM's ordinary double sets, then single rings — Strada Lab's 110 BCD
  rings, which fit Shimano's and Magene's cranks, and SRAM's X-Sync. A
  list under the build gives every chainring that keeps the chosen
  sprocket within the class, with a small drawing of two rings or one,
  and names together the families whose rings are all too big. The
  figures and their sources are in docs/research/klasser-og-gearing.md,
  section 3.6. Prices stay dated with the shop they were seen at, and
  there are still no affiliate links.
- **Fewer products.** Recon, Shimano's CS-R8000 14-28, Miche's 10-speed
  Primato and Magene's QED rings leave the calculator: each is either
  never the first suggestion or the same sizes as Shimano's own. The
  research note keeps them.

## Trade-offs accepted

- **A preference where there was a neutral list.** Naming Miche first
  ranks one maker above Recon and E.Dubied. Martin asked for it, and a
  parent needs one thing to look for, not seven to compare; the others
  are still named where Miche has no cassette, and the research note
  keeps the whole list.
- **The drawings are drawings.** The frame is one small road frame, and
  the wheel's size follows the tyre's circumference from Garmin's table.
  In a build's drivetrain only the cassette's smallest and largest
  sprockets are the real ones; those between are spaced evenly, and the
  crank is drawn short. What matters to the rule — the distance, the
  ring and the smallest sprocket — is exact; the rest is near enough to
  read.
- **A build is one way, not the way.** The first product in the list
  that carries a ring is named, doubles before singles, so a build can
  pair a SRAM crank with a Shimano-freehub cassette; the notes under
  each part say what it fits, and the list below the build shows the
  other rings.
- **Animation costs a little.** A frame-by-frame redraw of a small SVG
  for under three seconds, only on request after the first; nothing
  moves while the reader is reading.
- **Standard sets age.** Which double chainrings Shimano and SRAM sell
  changes with each groupset; the sets are dated October 2026 and need
  reading again each season, as the prices do.
