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
  kilometres on his own watts, whatever the rider does: 800 W for the
  first 7 seconds and 460 W to the end of the first minute — about
  7 W/kg at 66 kg and a bike — 360 W from there, and 800 W for the last
  200 metres. He does not answer an attack; in the rider's wheel he goes
  faster on the same watts, as the rider does in his.
- **The slipstream**: behind another rider, either of them pushes about
  two thirds of the air a wheel's length back, rising to all of it eight
  metres back; none alongside, wheels overlapping. `nextSpeed` takes the
  share. Who is behind whom is judged where both were before the step,
  and what the wheel gives the rider fades out of it, never below their
  own speed. With a cheat code on, the cheat takes it: WATT on its own
  watts and the avatar's weight, whatever the trainer reads, and SPURT
  holds the speed it was given.
- **Only where the rider is shown** (`ride/race.ts`), like the cheat
  codes: his place, and the rider's gain in his wheel, are a shift on the
  landscape. What is recorded — watts, time, distance — is what was
  ridden, and a test proves it against the same ride without him.
  Under the developer's warp (ADR 0045) he runs on as the rider does, by
  the same rule from his own speed, forwards or backwards; the warp now
  runs from the speed the rider is shown going — with the slipstream or
  a cheat code in it — so the two stay a race, played faster.
- **Only on a free ride**: a session is the coach's, so he never comes
  into one — not of himself, and not called. On a ride with no session
  he comes.
- **On the screen**: a call in the cheat code's arcade manner as he comes,
  with a fanfare; the distance left and the gap in the road's top corner,
  clear of him on the road; at the line who won and by how much, a
  cowbell for a win; a beep for each of the last three of the count and a
  whistle for the start. An arch over the road in red and white, with the
  word for the finish and a checkered line, stands where the race ends
  (`challenge-line.ts`). His figure is the rider's own (`RiderFigure`,
  `RoadBike`) in his kit (`kits.ts`): a smooth aero helmet with its
  straps, a broad white band across the jersey with a thin stripe
  either side of it, white bands round the sleeves, red and white at the
  shorts' leg ends, a number on the seat post, and the bars 10 cm lower
  and 22 cm further forward than the rider's own, on a long stem that
  climbs 15° to them from a head tube cut almost to nothing, the bar
  turned up 20° about the stem. His hands go with the bars, and his
  shoulders and head as far down, and a third as far forward in the
  saddle and most of the way out of it (`Kit.bars`, `poseOf`). Where the
  road would have him in the saddle he rides a posture of his own, as in
  the photo: forward on the saddle's nose, the upper arms straight down,
  the forearms along the top of the bar and the hands on the hoods, a
  little ahead of his face, his head down between his shoulders. From
  500 W to 700 W he has his hands in the drops, flat in the saddle; over
  700 W — his first seconds and his sprint — he is out of the saddle,
  low over the bars, his hands in the drops (`challengerEffort`).
- **A cheat code, JOHAN**, calls him up at once on a free ride, and does
  nothing in a session. The H in it is the code's while it is typed, not
  the ride's speed. Under `next dev`, G calls him session or not.

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
  Kadence is for; most will lose most races. Riding his watts whatever
  happens, he can be beaten: by an attack he does not answer, or a
  sprint well over his 800 W — or by the cheat codes, which race only the
  landscape too.
- **Not in a session.** A rider in a planned session never meets him,
  and JOHAN does nothing there; the coach's session goes first.
- **His posture is a look, not his air.** His drag in the physics is
  the rider's own; the flat back is drawn, not counted, so the same
  watts at the same weight still go as fast as the rider's.
- **A position the rules no longer allow.** Resting the forearms on the
  bar has been banned in UCI road races since April 2021. He rides as the
  photo shows him, as a figure in the landscape; nothing in Kadence
  suggests a rider should.
- **Indoor speed only.** The slipstream moves the rider on the screen,
  not on the record: an indoor ride's distance stays the physics' answer
  to the watts ridden.
