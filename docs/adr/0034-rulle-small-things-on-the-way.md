# ADR 0034: Rulle's small things — once in a while, at the edge of the picture, never on the numbers

Status: accepted · Date: 2026-09-30 · Builds on 0013, 0033 · Amended by 0035 (other riders pass while a small thing does)

## Context

Rulle (ADR 0033) is an emergency solution that should feel good, and an
hour on a trainer in a garage is long. The coach who asked for Rulle
asked next for something to smile at on the way: things from the world
of cycling — an electric cargo bike that overtakes you, a car that
sprays you with washer fluid — a coffee stop when you pause, and a
little gamification, but only the fun kind. And not too much: once in a
while, for a cosy mood, not a show.

Kadence's riders are young (ADR 0013: no leaderboards, process before
results, no weight), the numbers and the bar must read at two metres in
a hard interval (ADR 0033), and the AI never writes to a rider (dogma
five).

## Decision

- **Once in a while, something passes on the road.** An electric cargo
  bike with a child in the box, whose motor stops helping at 25 km/h
  (EU Regulation 168/2013) — so it only overtakes where the road climbs,
  with a ring of its bell, and on the flat the rider passes it; a car
  that washes its windscreen as it overtakes, a mist that drifts back
  over the rider and a few drops on the lens; a youngster on an electric
  scooter in a full-face helmet at fifty; a farm dog that runs along for
  seventy metres and sits down again. Where each happens is fixed by the
  route and the lap (`visitsOnLap`, pure and tested): the same ride meets
  the same things, a lap later something else. At most four a lap
  besides the cargo bike's climb, more than a kilometre apart, some
  places left quiet — about one every eight or nine minutes; the first
  lap shows one early. One thing at a time.
- **By the road**, the same on every lap: cows in fenced fields, the ones
  not grazing turning their heads to watch; Dannebrog on a flagpole now
  and then, always blowing against the rider whichever way the road
  runs. On the route's steepest climb (Kiddesvej on the Vejle route),
  the rider's first name in chalk on the road — "KOM SÅ EMMA!" — and
  "almost there" near the top, and someone in red with a cowbell.
- **Sounds**, all quieted by the same press on M: a cowbell ten, eight
  and six seconds before a hard block ends (a work block of 45 seconds or
  more at 85 % of FTP or above, or by feel), before the three beeps; the
  cowbell on the chalk climb; the cargo bike's bell. Made with Web Audio,
  like the beeps; no sound files.
- **A pause is a coffee stop.** For the first quarter minute the rider
  stays on the bike, a foot down, drinking from the bottle. Then the
  picture dips to the haze and comes back at a café by the road — or a
  farm stand with sodas and an honesty box: the bike against the wall,
  the rider at the table with a coffee or a soda. After three minutes a
  second cup and the paper; after ten, asleep, the z's rising and a cat
  on the table. When the ride goes on, it dips again and the rider is
  back on the road at once; the stop stays, empty cups on the table, for
  the next lap to pass.
- **Today's little things**, after the numbers on the done screen: the
  climbing in Himmelbjerge (147 m, Den Store Danske), the cargo bikes
  that overtook and were overtaken, the washer fluid, the scooter, the
  dog, the cows passed, the stops and the cups — and one mark that is
  not a joke: every block on target, the session ridden as it was
  written (`OnTarget`: nothing skipped, three quarters of each block in
  the band). Worked out from the recording and from what the landscape
  counted as it showed it; kept with the ride in the browser.
- **The rules for the humour.** It lives at the edge of the picture and
  on the done screen, never on the numbers or the bar, and never laughs
  at a rider under target. No calories, food or body; no points,
  streaks or badges for training more — the load is the coach's to plan;
  no comparison with anyone. The words in the landscape come from the
  message catalogues, in the reader's language; none are written by the
  AI. A rider who asked for less motion gets no drops on the lens.
- **No schema change.** The little things are the screen's, not a
  record: the ride saved is the same FIT file as before.

## Trade-offs accepted

- **Something may move at the edge in a hard interval.** The things are
  placed by distance, not by the session, so the cargo bike can overtake
  in the middle of a VO2 block. They are rare and brief, and none of
  them covers what a rider reads; there is no switch to turn them off
  one by one. If riders ask for one, it is a small change.
- **The little things are not kept in Kadence.** They are on the done
  screen and in the browser until the ride is saved, then gone; a ride
  saved from a copy kept before this wave shows fewer of them. Keeping
  them would be a column for a joke.
- **"Every block on target" is easier in ERG**, where the trainer holds
  the watts. It says the session was ridden as written — not skipped,
  not ended early, not turned down — which is the point, not strength.
- **Coffee and soda in a tool for young riders.** It is the café culture
  of cycling, the stop on the club ride; nothing is counted as food and
  nothing is advised.
- **Caricatures.** The scooter rider is a hooligan in a helmet, the dog
  is friendly and gives up, the driver never looks: the joke is always on
  the traffic, never on the rider.
- **The rider's first name on the road** is on the rider's own screen
  only; a coach trying a rider's session gets "KOM SÅ!" without a name.
- **Every trainer ride has the same things at the same places.** Chosen
  by the route and the lap, not at random, so they can be tested and
  counted; a rider who rides Vejle every winter will know where the
  cargo bike comes.
