# ADR 0048: Rulle — a WATT cheat code, with an avatar's weight

Status: accepted · Date: 2026-10-02 · Builds on 0013, 0033, 0045

## Context

SPURT (ADR 0045) hands the rider the bike's speed. What riders ask next
is the other way round: what would 350 W do up this climb, or 5 W/kg?
Rulle's physics already turns watts into speed on the road's slope, for
a fixed standard of 70 kg and a bike. Watts per kilo needs a kilo, and
Rulle reads no body data (ADR 0013, 0031).

## Decision

- **A second code, WATT.** Typed on the ride screen, it turns on with the
  same fanfare; typed again it is off, and the other code goes over to the
  other. Five taps on the rider still turn SPURT on, and whichever is on
  off; on a touch screen a press on the panel goes between the two. None
  of its letters is a key of the ride's.
- **The keys set the watts.** W/S or ↑/↓ step 10 W, or 0.1 W/kg when the
  panel shows watts per kilo; held, they step on after 0.4 s every 0.1 s
  (`watt-dial.ts`, pure). From 0 to 1500 W. A/D or ←/→ steer as on SPURT.
  It starts at the watts that hold the speed the rider is shown at, so the
  bike does not jump, and at 100 W from a standstill or a descent.
- **The avatar's weight**, 30 to 120 kg, starting at Rulle's own 70, is
  set with a button either side of it on the panel. In watts per kilo the
  W/kg stays as the weight changes and the watts follow; in watts the
  watts stay. It is held in the browser for the ride and kept nowhere: not
  saved, not sent, not on the next ride.
- **One set of numbers at a time.** While either code is on, the watts,
  the time and the body's tiles make way for the cheat's own panel in
  their place, at their size (`ride-numbers.tsx`, `cheat-panel.tsx`): on
  SPURT the speed, on WATT the watts, the other unit, the speed and the
  avatar's weight, each with a press over to the other code and a cross.
  Turned off, the tiles come back. What is recorded is unchanged by it.
- **The road decides the speed.** The avatar is ridden through Rulle's
  physics (`nextSpeed`, now with a mass of its own) on the slope where it
  is shown, so a heavy avatar climbs slower than a light one at the same
  watts, and a descent runs on by itself.
- **It cheats only the landscape**, as SPURT does (ADR 0045): the watts,
  the heart rate, the cadence, the time and the distance recorded are
  what was ridden, the trainer never feels it, and a test proves this
  against the same ride without the code.

## Trade-offs accepted

- **W/kg on a youth screen.** ADR 0013 keeps weight and W/kg away from
  riders under 19 unless the coach turns them on for the team. Here they
  are shown to everyone who types the code. What is weighed is an avatar
  in a game and not the rider, nothing is stored or shown to anyone else,
  and there is no ranking — but a young rider may type their own weight
  into it. The team setting could gate the W/kg half of it; that is a
  small change if the first winter says it should.
- **Steps, not a field.** A weight is set a kilo at a time and the watts
  ten at a time. A number field would be quicker to reach 55 kg, and would
  take keys the ride needs.
- **The physics stays a model.** The speed for a weight and the watts is
  Rulle's model of a rider on the hoods on good asphalt, not a measure of
  what any rider would ride.
