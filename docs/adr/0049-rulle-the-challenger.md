# ADR 0049: Rulle — the challenger, a race for two kilometres now and then

Status: accepted · Date: 2026-10-04 · Builds on 0034, 0045, 0048

## Context

Riding alone indoors, a rider meets other riders on the road (ADR 0035)
but never races one. The wish was an easter egg: a rider in red and
white who now and then comes up beside you and races you, a strong one,
with a plan of his own, who sits on your wheel when you attack, and a
slipstream that makes it easier behind him.

## Decision

- **Where he turns up** (`src/modules/rulle/challenge.ts`, pure): every
  10 km of the ride is a stretch he may turn up in. With a climb in it
  (3.5 % over 200 m, as the cargo bike's), one time in five, 150 m before
  its foot, so the race goes up it; without, one time in ten, somewhere
  along it. Fixed by the route and the stretch: the same ride meets him
  in the same places.
- **The count, then his race**: he comes up beside the rider and rides at
  their very speed while ten seconds are counted down; then two
  kilometres. He builds over ten seconds from the watts that held that
  speed to 900 W — no jump — rides 460 W for a minute, 360 W from there,
  and 800 W for the last 200 metres, at 66 kg and a bike: about 7 W/kg
  for the minute. When the rider is ahead of him he rides as hard as he
  must, up to 1100 W, to sit a metre behind them; his sprint still comes
  at 200 metres.
- **The slipstream**: behind another rider, either of them pushes about
  two thirds of the air a wheel's length back, rising to all of it eight
  metres back; none alongside, wheels overlapping. `nextSpeed` takes the
  share. Who is behind whom is judged where both were before the step,
  and what the wheel gives the rider fades out of it, never below their
  own speed.
- **Only where the rider is shown** (`ride/race.ts`), like the cheat
  codes: his place, and the rider's gain in his wheel, are a shift on the
  landscape. What is recorded — watts, time, distance — is what was
  ridden, and a test proves it against the same ride without him.
- **Only where the rider sets the watts**: while a trainer holds a
  session's watts (ERG), there is nothing to race with, and he lets the
  rider be. In a free ride, a free block or with ERG off, he comes.
- **On the screen**: a call in the cheat code's arcade manner as he comes,
  with a fanfare; the distance left and the gap in the road's top corner,
  clear of him on the road; at the line who won and by how much, a
  cowbell for a win; a beep for each of the last three of the count and a
  whistle for the start. An arch over the road in red and white, with the
  word for the finish and a checkered line, stands where the race ends
  (`challenge-line.ts`). His figure is the rider's own (`RiderFigure`,
  `RoadBike`) in his kit (`kits.ts`): a smooth aero helmet with its
  straps, white bands round the sleeves, red and white at the shorts' leg
  ends, a number on the seat post; low and aero on the flat, out of the
  saddle as he builds and in the sprint.
- **A cheat code, JOHAN**, calls him up at once, wherever the rider is,
  in ERG too: asked for, he comes. The H in it is the code's while it is
  typed, not the ride's speed. Under `next dev`, G does the same.

## Trade-offs accepted

- **A real rider's look, and a first name.** He is drawn from a photo of
  a real young rider, so he has no face and no maker's logo, and his
  number has no digits: a rider in red and white, in a white aero helmet,
  on a black bike with a yellow fork. The screen calls him a rider
  in red and white; only the code that calls him is a first name, which
  is in the open source. The photo is not in the repository.
- **A race is a ranking of one.** ADR 0013 keeps leaderboards out of
  Kadence. This is a rider against a figure in the landscape: nothing is
  kept, counted or shown to anyone else.
- **He is strong on purpose.** 460 W for a minute is beyond most riders
  Kadence is for; most will lose most races. A rider beats him by
  sprinting from his wheel well over his 800 W, or by the cheat codes,
  which race only the landscape too.
- **Not in ERG by chance.** A rider in a planned session with the watts
  held never meets him unless they type JOHAN; the coach's session goes
  first.
- **Indoor speed only.** The slipstream moves the rider on the screen,
  not on the record: an indoor ride's distance stays the physics' answer
  to the watts ridden.
