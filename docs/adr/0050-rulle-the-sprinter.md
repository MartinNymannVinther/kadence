# ADR 0050: Rulle — the sprinter, called by HYLDTOFT

Status: accepted · Date: 2026-10-05 · Builds on 0013, 0045, 0049

## Context

The challenger (ADR 0049) races on a plan of his own. The wish was a
second rider, drawn from photos of a real young rider: a small one,
called by his own cheat code, who does nothing but sit on your wheel
until the sprint, and then wins it with a jump over the line — unless
you have ridden him tired first. What he can ride was told as two
efforts: 360 W for five minutes and 600 W for one, at 52 kg. The rest
was left to be worked out.

## Decision

- **Called by HYLDTOFT, on a free ride only**, as JOHAN calls the
  challenger: in a session it does nothing. Of himself he turns up where
  the challenger would, sharing his chance half and half, and offers a
  race the rider can say yes or no to (ADR 0049). The race is the
  challenger's — ten seconds counted down
  beside the rider, then two kilometres — with a rival of his own in it
  (`ride/rivals.ts`): the challenger on his plan of watts, or the
  sprinter.
- **His legs, worked out** (`src/modules/rulle/sprinter.ts`, pure). The
  two efforts give, by the critical power model (Monod & Scherrer,
  Ergonomics 1965), 300 W he can hold for as long as he likes — 5.8 W/kg
  — and a reserve of 18 kJ above it. Above 300 W he spends the reserve;
  below it he wins it back, the faster the emptier it is, as in the
  differential W′ balance model (Skiba et al., Eur J Appl Physiol 2015).
  He never rides more than 1150 W.
- **What following costs him**: the physics turned round (`wattsFor`) —
  52 kg and an 8 kg bike, a wheel's length behind the rider in their
  slipstream, and about 18 % less air than the 70 kg rider the physics
  is for, a body's area going as its mass to the two thirds. While he
  can, he holds the rider's wheel whatever they do; when the reserve is
  gone, he rides 300 W and drops. On the flat in a wheel that is almost
  never; up a long climb at a hard pace it is within minutes.
- **The sprint and the throw**: from 200 metres out, if he has anything
  left, 1150 W out of the saddle with his hands in the drops; for the
  last 15 metres he stops pedalling, his hips go far back and his arms
  straight, and he jumps 70 cm into the air in an arc that comes down on
  the line, his shadow left on the road. Dropped, he has no sprint.
- **His look**: the rider's own figure and bike in his kit, drawn at
  85 % of the rider's size, smaller still than his weight says, as
  asked. A jersey quartered in red and black — split down the middle of
  the chest and the back and across halfway up, the black quarters
  diagonal — with a white royal crown in the middle of the chest and of
  the back (`jersey-crown.ts`): a band set with lozenges and studs,
  small crosses on its ring, beaded arches, and an orb with a cross,
  its openings showing the jersey through. Red sleeves, black shorts, a
  white road helmet and gold glasses, bare hands, white socks and shoes,
  a black bike with deep rims and a number. No maker's names.
- **His words**: his own call as he comes up — a small rider in red and
  black, who sits on your wheel and waits for the sprint, and that you
  can ride him tired before it.
- **Only where the rider is shown**, as the challenger: what is recorded
  is what was ridden. Under the developer's warp he runs on as the rider
  does.

## Trade-offs accepted

- **A real rider's surname, weight and watts in the open source.**
  HYLDTOFT names a real young rider, and the code is public, so the name
  is too — far more findable than JOHAN's first name — and beside it his
  weight and what he can ride. ADR 0013 keeps young riders' weight out
  of Kadence; here a weight is tied to a name in public. It is there
  because the one who asked for it knows him; he — and, if he is under
  18, his parents — should say yes to the name and the numbers before
  this is merged, or the numbers should be made up. The photos are not
  in the repository, and he has no face and no team's name.
- **Told numbers, a model's rest.** Two efforts fix only two numbers.
  His sprint, his size in the air and his recovery are the models'
  answers, not measurements, and he is a figure in the landscape, not a
  rider anyone is compared with (ADR 0013).
- **The first H.** H shows the speed on the ride screen; typing
  HYLDTOFT turns it on or off with its first letter, before the code is
  known. The letters after it are the code's.
- **A throw seen from behind.** He usually wins by tens of metres, so
  the rider sees the jump small, under the arch ahead. Close enough to
  see it well, they are close to beating him.
