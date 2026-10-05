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
  motion it shows the finished turn and moves only when asked. The sum
  is said in one sentence underneath, and over, close or within in words
  with an icon.
- **One suggested build instead of a list.** For 10 or 11 teeth the
  calculator says the cassette is an ordinary one and names no product.
  For 12 to 16 teeth it names one concrete cassette — Miche's first,
  another maker's only where Miche has none for that sprocket — for
  12-speed and, where one exists, for 11-speed. Then the chainrings that
  keep that sprocket within the class: Shimano's and SRAM's ordinary
  double sets whose big ring is small enough, and Magene's single rings.
  Prices stay dated with the shop they were seen at, and there are still
  no affiliate links.

## Trade-offs accepted

- **A preference where there was a neutral list.** Naming Miche first
  ranks one maker above Recon and E.Dubied. Martin asked for it, and a
  parent needs one thing to look for, not seven to compare; the others
  are still named where Miche has no cassette, and the research note
  keeps the whole list.
- **The drawing is a drawing.** The frame is one small road frame, and
  the wheel's size follows the tyre's circumference from Garmin's table.
  What matters to the rule — the distance — is exact; the rest is near
  enough to read.
- **Animation costs a little.** A frame-by-frame redraw of a small SVG
  for under three seconds, only on request after the first; nothing
  moves while the reader is reading.
- **Standard sets age.** Which double chainrings Shimano and SRAM sell
  changes with each groupset; the sets are dated October 2026 and need
  reading again each season, as the prices do.
