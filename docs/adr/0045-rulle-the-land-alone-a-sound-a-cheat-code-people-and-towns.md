# ADR 0045: Rulle — the land alone, a sound under the ride, a cheat code, and people and towns of their own

Status: accepted · Date: 2026-10-02 · Builds on 0013, 0033, 0034, 0035, 0036, 0037 · Amends 0033, 0034, 0036 · Amended by ADR 0056 (the world behind RULLE_WORLD, off by default)

## Context

After riding Rulle, the coach asked for five things:

- **The land alone.** A way to take every number off the screen and see
  only the rider and the land, while still being able to show the
  little map.
- **A sound under the ride.** A little sound all the time, which can be
  muted. Without it a marshal's hoot comes out of silence, as a shock.
- **A cheat code.** One that lets the rider take the bike's speed and its
  place on the road in hand. It is mostly for development, but it should
  be fun and done properly, because the young riders may love it.
- **People of their own.** People who do not all look alike.
- **A big city and a country town.** Copenhagen should look like a big
  city and Vejle like a country town.

The plan agreed before the work had six parts: those five, then this ADR
and the docs.

Rules this work kept to:

- Dogma two: no service at ride time, and nothing new to install.
- ADR 0013: no points, no ranking, nobody raced.
- ADR 0016: a ride is what was measured.

## Decision

### The land alone

- **How:** I, a button in the strip, or a tap anywhere hides every number:
  the strip, the three tiles, the corner with the percent and the speed,
  and the session's bar.
- **What stays:** the landscape fills the screen, and the camera frames the
  rider in all of it. The little map stays if it is shown, and K still
  shows and hides it.
- **Back again:** I again, or a tap, brings the numbers back.
- **When the trainer drops out:** the numbers come back by themselves, so
  nobody rides on without ERG unawares.
- **Not remembered:** a ride always starts with its numbers.

### A sound under the ride

While the ride's screen is up, there is a quiet sound under everything
else.

- **The road:** the tyres on the road and the wind past the ears, both
  louder and brighter with speed. Standing still, there is only a breath
  of wind.
- **The place:** in the country a bird sings about every seven seconds;
  in a town every twenty, over a low hum; in a city a louder hum and no
  birds. Above 14 m/s the wind drowns the birds.
  - A town is ten buildings or more within 150 m of the rider, counted
    from the land file.
- **Race day:** the crowd murmurs as thick as it stands (`crowdAt`), and
  cheers at the finish.

How it is made:

- What the rider hears is decided in pure code (`hearing.ts`, tested).
  The browser makes the sound from looped noise and short tones with Web
  Audio (`ambience.ts`): no sound files and no dependency.
- It fades in over the countdown and out when the ride ends.
- M quiets all of it, as before.
- The marshal's horn and whistle swell in rather than snapping on, and
  the horn has its edge taken off.

### The cheat code

**How it starts.** Typing SPURT, or tapping the rider five times quickly,
turns it on with an arcade fanfare. None of the letters is a key of the
ride's. The same code or five more taps turn it off.

**The controls:**

- **Speed:** W/S or the up and down arrows, from standstill to 120 km/h.
  Faster by 5 m/s every second, slower by 9. Let go, and the bike keeps
  its speed.
- **Steering:** A/D or the side arrows, at 3.2 m/s across the road, up to
  2.6 m either side of the middle, leaning into the turn.
- **On a touch screen:** four pads do the same.
- **The arrows:** while the code is on, they steer the bike and leave the
  session alone, so nobody makes the session harder by mistake.
  Intensity and skipping go by the buttons.

**On the screen:**

- A banner says what it is, the keys, and that only the landscape is
  cheated.
- A badge shows the speed in big digits, with a cross to turn the code
  off.
- Speed lines streak past from 13 m/s.
- The view widens by up to 12 more degrees towards 33 m/s, and the camera
  keeps up.
- The other riders make way.
- Turned off, the rider glides back to their own line and rides on from
  where the cheat left them.

**It cheats only the landscape, never the training.** Like the
developer's warp, it moves only where the rider is shown (`shown.ts`).

- The watts, the heart rate, the cadence, the time and the distance
  recorded are what was ridden; a test proves this against the same ride
  without the code.
- The trainer never feels it: it is never sent the route's slope.
- There are no points and no ranking.
- The help says a cheat code is hidden and that it cheats only the
  landscape, and leaves the code itself to be found.

### People of their own

- **The looks:**
  - **Skin:** eight tones from fair to dark, the fair ones commoner.
  - **Hair:** blond, brown, black, red, grey or white. The darkest skins
    have dark hair.
  - **Trousers:** seven everyday kinds.
- **Figures made on their own** take their looks from their number
  (`personOf`): the riders on the road, the one mending a puncture, the
  marshals, the soigneurs, the cargo bike's parent and child, the cowbell
  fan and the people at a finish.
- **The crowd of race day** is dressed per person in its material
  (`folkMaterial`), from where each one stands.
  - Its shapes are painted in marker colours the material paints over.
  - About two in five wear long hair, and about one in five a cap in
    their jacket's colour.
  - Grown-ups differ in height by up to 8 %. About one in seven of the
    front row is a child.
  - None of it adds a draw call.
- **The rider's own figure** is as it was.

### A big city and a country town

**Copenhagen is built as a big city** (`building-city.ts`). Its blocks of
three storeys or more have:

- taller storeys, in plaster of the city's colours or dark red brick;
- tall windows in white frames;
- a cornice under the eaves;
- a slate mansard with dormers (two in three) or a slate gable;
- within 45 m of the road, shops at the foot: panes, a sign band, and an
  awning on two in five.

A plain block whose height the map gives, up to 30 m, is built the same
way, its storeys taken from its height.

**Vejle and the other towns of the country routes are built as country
towns** (`building-homes.ts`):

- houses whitewashed or in yellow or red brick, under red tiles or black
  glazed ones, about one in three hipped;
- blocks of flats in brick, three storeys high.

Montréal keeps its plexes.

### What this amends

- **0033:** the ride screen can hide every number, and its arrows steer
  the bike while the cheat code is on.
- **0034:** the small things' sounds sit over a sound under the ride, and
  the horn and the whistle swell in.
- **0036:** Copenhagen's buildings are a big city's, and its crowd and
  Montréal's are dressed per person.

## Trade-offs accepted

- **Nothing on the screen means nothing to read.** With the numbers gone,
  a block's change is heard (the beeps) but not seen. Only a trainer that
  drops out brings the numbers back by itself.
- **A sound made, not recorded.** The wind, the tyres, the birds and the
  crowd are noise and tones, not recordings. They are recognisable, not
  lifelike.
  - The levels were chosen without a listening test on a family's
    speakers.
  - There is one level, and only M to quiet it.
- **A cheat code for everyone.** It ships in the build, so anyone who hears
  the code can use it. Nothing about it is kept or shown to a coach,
  because the ride it leaves is the one that was ridden.
  - The cost of that honesty: while it is on, the little map, the profile
    and the shown distance run ahead of the recorded ride.
  - Today's little things count what the cheat rode past.
- **Looks by eye.** The shares of skins and hair are chosen to look like a
  Danish or a Canadian crowd, not taken from statistics. Long hair and
  caps are drawn on everyone in the crowd and folded away where they are
  not worn, which costs vertices but not draw calls. The rider cannot yet
  choose their own look.
- **A city by rule.** Copenhagen's colours, roofs and shops are given by
  rule, not by building.
  - The map seldom says a building's colour, and shops are drawn on any
    block near the road, not only where a shop is.
  - Every town on a country route is built as a country town, whether it
    is Vejle or a village.
