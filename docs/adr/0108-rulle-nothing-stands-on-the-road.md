# ADR 0108: Rulle keeps the land, the bridges and the trees off the road

Status: accepted · Date: 2026-10-21 · Builds on ADR 0033 (Rulle), 0035 (the real land), 0037 (bridges, tunnels and what passes over) · Touches ADR 0036 (the city's street trees)

## Context

The product owner rode Rulle on a real trainer for the first time: ERG
held each block's watts, the heart-rate strap and the watts came through,
and the speed on the screen matched the pedalling and the slope. What
looked wrong was the landscape, now and then: the rider riding through a
bridge's piers, a tree or a hill over the road, the rider sitting inside
a hill where "the road and the levels go a little wrong".

Measured on the six bundled routes, three causes:

- **The land's triangles passed over the road.** The land is drawn in
  triangles 25 m across, and only their corners know its height; near the
  road those corners lie a little below it. Where the land beside the road
  rises steeply — a road cut into the slope above Vejle Fjord, Munkebjerg
  — a triangle that spans the road has a corner up the slope, and its
  flat face passes over the asphalt or the verge. On Vejle–Munkebjerg up
  to 3.7 m, at some ten thousand of 150,000 places looked at; on every
  route somewhere. The test that should have caught it measured the
  smooth ground at the road's samples, not the drawn triangles.
- **The walls under an overpass stood on the road.** The wall either
  side of the road under a deck was placed 6.2 m from the crossing along
  the deck's middle line, and drawn as wide as the deck. A deck crossing
  at a slant reaches across the road with its corners: a 26 m motorway
  deck at 60° put its wall's corner in the middle of the road. Four of
  six walls on Vejle–Munkebjerg, one of four on the B&U DM route.
- **Distances to the road were to its samples, not its line.** The
  road is a sample every 10 m, and "how far from the road" was the
  distance to the nearest sample. A place on the asphalt midway between
  two is 5 m from either: far enough, by that measure, for a map's tree
  (5.3 m) — and the street trees' crowns reached over the asphalt anyway.

## Decision

- **The land is lowered where it would cover the road.** When a ride
  begins, every place on the road and its verges is looked at, 2.5 m
  along and 1 m across, and where the drawn land rises over what the road
  draws there — asphalt, verge, a city's pavement, a bridge's underside —
  the corners of that triangle are lowered just enough, each by as much
  as it counts at that place. The nearest corner drops most; the land up
  the slope is hardly touched; the result looks like a road cut into a
  hillside. Only ever lowered, never raised. It takes 20–60 ms per route
  at the start of a ride. Pure: `src/components/rulle/scene/road-clear.ts`,
  with the triangles in `grid-triangle.ts` and the road's cross-section
  in `road-profile.ts`.
- **A deck lies level, and its walls stand, far enough along to clear
  the road at any angle.** The level stretch either side of the road is
  now `(3 + 3.2 + width/2·|cos angle|) / sin angle` (`holdOver`), so the
  whole road is under the level part and the wall's nearest corner is
  3.2 m from the asphalt. As a last guard, no wall, abutment or pier is
  drawn whose outline comes within 4.5 m of the road's middle line
  (`offTheRoad`); a missing wall under a bridge is less wrong than one on
  the road.
- **The distance to the road is to its line.** `RoadGrid.nearest` finds
  the nearest sample as before, then the nearest point on the stretches
  either side of it, and its height there. Every tree, building, hedge
  and pier placed by distance now keeps the distance it was meant to.
- **A tree the map has stands 6.3 m from the road's middle at least**,
  so its crown ends at the kerb.

## Consequences

- On every bundled route the drawn land now stays under the asphalt
  everywhere, and within 0.15 m of the verge's foot (where it is meant to
  meet it); no deck support comes within 1 m of the asphalt's edge. Tests
  hold both on the bundled routes, measured independently of the code
  they test (`tests/rulle/road-clear.test.ts`, `overpass-deck.test.ts`,
  `road-grid.test.ts`).
- Where the land was lowered, the hillside beside the road has a cut
  where it had a smooth slope over the verge. On a route of the rider's
  own, where the land is made up, the same holds.
- A wall under a slanted bridge stands further from the road than
  before, and a wall that would still come near it is left out: the deck
  then rests, to the eye, on its abutments and piers.
- The land is made up of places the code looks at; a place between two of
  them can still be a few centimetres off. Not a hill, though.
- Not looked at here: what a rider passes on the road itself (traffic,
  visitors, the moto), which is placed on the road on purpose.
