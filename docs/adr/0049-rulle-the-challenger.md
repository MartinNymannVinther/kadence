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
- **His race**, two kilometres: 900 W for 7 seconds, 460 W for a minute,
  360 W from there, and 800 W for the last 200 metres, at 66 kg and a bike
  — about 7 W/kg for the minute. When the rider is ahead of him he rides
  as hard as he must, up to 1100 W, to sit a metre behind them; his
  sprint still comes at 200 metres.
- **The slipstream**: behind another rider, either of them pushes about
  two thirds of the air a wheel's length back, rising to all of it eight
  metres back; none alongside. `nextSpeed` takes the share.
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
  cowbell for a win. His figure is the rider's own (`RiderFigure`,
  `RoadBike`) in his colours (`kits.ts`), out of the saddle in his attack
  and his sprint. Under `next dev`, G calls him up at once.

## Trade-offs accepted

- **A real rider's look, not the rider.** He is drawn from a photo of a
  real young rider, so he has no name, no face and no maker's logo: a
  rider in a red jersey with a white band, black shorts, white helmet,
  socks and shoes, on a black bike with a yellow fork. The photo is not
  in the repository.
- **A race is a ranking of one.** ADR 0013 keeps leaderboards out of
  Kadence. This is a rider against a figure in the landscape: nothing is
  kept, counted or shown to anyone else.
- **He is strong on purpose.** 460 W for a minute is beyond most riders
  Kadence is for; most will lose most races. A rider beats him by
  sprinting from his wheel well over his 800 W, or by the cheat codes,
  which race only the landscape too.
- **Not in ERG.** A rider in a planned session with the watts held never
  meets him; the coach's session goes first.
- **Indoor speed only.** The slipstream moves the rider on the screen,
  not on the record: an indoor ride's distance stays the physics' answer
  to the watts ridden.
