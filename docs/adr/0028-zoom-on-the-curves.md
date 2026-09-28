# ADR 0028: Zoom on the ride's curves

Status: accepted · Date: 2026-09-28 · Builds on 0022

## Context

The ride's curves draw a whole ride — two, three hours — in at most 480
points per channel, and a coach reading an interval, a climb or the
minute before a stop wanted that stretch on its own. The curves are
hand-drawn SVG (CLAUDE.md), the chart already reads a moment with a
pointer or the arrow keys and tells the route where the rider was, and
"Skjul pauser" already changes the chart's clock. On a phone the chart
sits under `touch-action: pan-y`: a vertical swipe over it scrolls the
page, a sideways one scrubs the readout, and neither may be taken away.

## Decision

- **A window is a span of sample indices** into the streams the chart
  draws, null for the whole ride, and what is drawn is a pick of the
  samples in it (`thin`), never an average — so no number a reader sees
  changes with the zoom. The readout, the strips' dots and the route's
  dot read the same stored sample, zoomed or not, pauses hidden or not.
  One x-scale over the drawn points places everything — curves, cursor,
  pause bands and seams, the selection band, the ticks — inside one
  clip, so nothing can drift apart at any zoom.
- **Three ways in.** A mouse or a pen drags across a stretch. A finger
  turns on "Vælg et område" and taps twice, or drags sideways while the
  mode is on; a vertical swipe stays the page's, and a start already set
  survives it. The keyboard sets the start and the end with Enter, halves
  and doubles with + and −, slides with Shift + arrows. The buttons zoom
  around the moment being read, the centre when none is.
- **The way back is first and largest:** "Vis hele turen", also Esc and
  a double-click with a mouse or a pen — a finger's double tap is two
  readings, and a phone has the button. A window is kept with the
  streams' clock, their samples rather than the object, since every
  action on the page — a comment posted under the ride — refreshes the
  page and hands the chart the same samples in a new object. Hiding or
  showing pauses changes the clock, shows the whole ride, forgets the
  window so it cannot come back with the old clock, and drops the moment
  being read — a drawn-point index on one clock names another moment on
  the next, and across a pause there is no moment to carry it to.
- **One clock for a window.** Its ticks, its printed ends, the status
  and the selection's readout say a moment through one function
  (`clockStamp`): h:mm from ten minutes, to the second below that, with
  the hour digit kept through a ride of an hour or more, so "0:44:55"
  sits beside the total "2:30" and never "50:00 0:51 … 55:05" on one
  axis. The readout's own clock keeps the hour digit the same way.
- **Each strip's y-axis follows the drawn points**, so a window on a
  climb gets its own axis, and the tick labels say what it is.
- **The window has a live region of its own**, an `<output role="status">`
  in the toolbar, so a hover never talks over what the window is.
- **A finger's reading is pinned on this chart only.** A tap reads the
  nearest sample and the reading survives the lift and the blur when a
  toolbar button is tapped next, so "Zoom ind" has a moment to zoom
  around. The other charts keep clearing on leave and blur. While the
  select mode is on, its instruction takes the readout's line even over
  a pinned reading — otherwise a phone, where every tap pins, would
  never see it.
- **The hint fits the pointer.** A finger's sideways drag scrubs the
  reading and never zooms, so the line above the curves tells a mouse
  to drag and a phone (`pointer: coarse`) to press "Vælg et område"
  under the curves, by the button's own name. Once a start is set, the
  same line tells a mouse that Esc cancels and a phone, which has no
  Esc, to turn "Vælg et område" off. On a phone the line keeps the
  hint's three lines whatever it says, so the curves and the buttons
  under them never move under the finger that changed the words.

## Trade-offs accepted

- **An extra tap on a phone** rather than a long-press, which misfires
  under a resting finger, or replacing the one-finger scrub that reads
  the curves today.
- **No pinch and no wheel zoom.** A pinch over the chart zooms the page
  and a wheel scrolls it, as everywhere else; the page's gestures stay
  the page's.
- **A reset, not a translation, across the clocks.** Carrying a window
  from the real clock to the pause-free one is a mapping both ways with
  edge cases inside a pause; the whole ride is what a reader expects
  when the curves move together.
- **The pinned reading persists** until the next tap or a mouse move; a
  reader who wants it gone taps elsewhere.

## Next

An overview strip under the curves — the whole ride in miniature with
the window as a band with two grips — if the winter shows riders
reaching for it. It is additive to this model: the same span, the same
`setSpan`. A sticky toolbar on a phone, if the winter shows the buttons
sit too far below a five-strip chart.
