# ADR 0076: Rulle — ten seconds of the route and a rider turning, before the countdown

Status: accepted · Date: 2026-10-08 · Builds on 0033, 0074, 0075

## Context

Pressing Start on a route went straight to the countdown, three, two,
one, while the landscape was still being built behind it. The wish was a
loading screen in its own right: ten seconds with the route in the
background, a view of what it looks like, and one of the two riders the
rider may race — the challenger or the sprinter — turning round in front of it.

## Decision

- **Ten seconds, then the countdown** (`start-curtain.tsx`): on a route
  with the landscape (`RULLE_WORLD`), Start leads to a phase of its own,
  `loading`, before `counting`. The screen shows the words for getting
  the route ready, the route's name and a bar that fills over the ten
  seconds; then the countdown and the ride as before. A session without
  the landscape goes straight to the countdown, as it did.
- **The route behind, a rider in front** (`scene/showcase.ts`): the
  landscape is the ride's own, built in those same seconds, so what is
  shown is the route as it will be ridden. One of the two riders, by
  chance, stands on his bike on the road a little way from the start —
  the challenger flat and aero, the sprinter in the saddle and at his
  size — and turns slowly round, once in eight seconds. The camera stands
  back from him, looking at him with the road and the land behind. The
  rider's own figure is away meanwhile; the camera cuts to it when the
  countdown begins.
- **No name on the screen**, as in the races: the riders are a rider in
  red and white and a small rider in red and black.

## Trade-offs accepted

- **Ten seconds every time.** The screen does not wait for the landscape
  to be finished, nor end when it is: a fast machine waits the full ten
  seconds, and on a slow one the land may still be filling in at the
  countdown. A way to skip it can come if riders ask for one.
- **Checked by eye, not by a test.** Kadence's tests run without a
  browser, so the timing and the picture were checked in Chrome on the
  development server, not by an automated test.
