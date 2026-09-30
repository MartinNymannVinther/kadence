# ADR 0037: Rulle's bridges and tunnels, and race marshals on motorbikes

Status: accepted · Date: 2026-09-30 · Builds on 0013, 0033, 0034, 0035, 0036 · Amends 0034, 0035

## Context

The routes that come with Kadence run through their real land (ADR 0035,
0036), but the landscape did not know where the road goes over or under
something.

- Under a bridge the land was lifted to the road, so the Gudenå at Ry ran
  under a road on an embankment.
- Nothing passed over the road, so the rider rode under Vejlefjordbroen as
  if through a field.

The coach asked for more to be made of the places where the road goes
over or under something. The coach also asked for race marshals on
motorbikes on race day.

The plan agreed before the work had five slices:

1. the bridges and tunnels along the routes, in their land files;
2. the road over its bridges;
3. what passes over the road, and what passes under it;
4. race marshals on motorbikes;
5. what runs over the bridges: now and then a train, and a motorway's
   traffic.

Dogma two keeps the landscape free of any service at ride time. Nobody on
the road is raced (ADR 0013).

## Decision

### The bridges and tunnels, in the land file

- The land script fetches every way OpenStreetMap marks as a bridge or a
  tunnel within 60 m of the road. It keeps those that come within 15 m of
  the road.
- Each is kept with:
  - what it carries: a road, a motorway (or its slip roads, or a trunk
    road), a path (a footway, a cycleway, a farm track), a railway, water,
    or a wildlife crossing's green;
  - whether it is a bridge, a tunnel or both;
  - its line.
- Left out: a building's passage, a tunnel indoors, what runs two levels
  or more underground, and the metro.
- The land file's `structures` holds `[kind, flags, line]`, at most 5,000.
  It is read like the rest of the file. A file from before has none.

### What they are to the road: `structuresOn`

`structuresOn` is pure and tested on the five routes. It sorts the
structures into three kinds.

- **Decks**, where the road itself is on a bridge. A deck is a road,
  motorway or path structure that:
  - lies within 6 m of the road;
  - runs the road's way, within 26°;
  - runs at least 8 m.

  Each deck gets 3 m more at each end, where the bridge meets the land.
  Examples are the Gudenå at Ry and at Emborg, Vejle Å under Dæmningen,
  and the harbour under Toldbodvej.

- **Overpasses**, where something passes over the road. This includes the
  road running through a tunnel of its own under something the map does
  not name. Overpasses closer than 25 m along the road count as one, as
  wide as all of them: the tracks of a station.
- **Underpasses**, where a path or a farm track goes under the road in a
  tunnel of its own.

A culvert, a stream in a pipe, is none of these: nobody sees it. Only a
road can be the road's own bridge or tunnel.

### The road on a bridge

- The road has no verge. It has the deck's concrete edge, a parapet on
  each side, and the deck's face down to its underside.
- Pairs of piers with a crossbeam stand under the deck about every 16 m,
  where there is room. An abutment stands at each end.
- The land under a deck is left as it lies, never higher than 2.5 m below
  the road, so the river under the bridge is seen from it.
- No post, tuft or tree stands on a deck.

### What passes over the road

- Its deck is drawn along its own line from the map, from end to end.
  - A line the map ends short of the road is drawn on past it to its
    abutments.
  - A railway is drawn at least 260 m past the road's middle, and a
    motorway 200 m, so what runs on it is seen coming.
- Its height:
  - It starts from the land at its two ends.
  - Over the road it leaves at least 5 m of room (5.4 m under a railway),
    plus the deck's depth.
  - It lies level over the road, between the walls either side of it.
  - It eases down to the land in a smooth curve, never steeper than what
    it carries climbs: a railway 3.5 %, a motorway 5 %, a road 6 %, a
    footbridge 8 %.
- What it carries shows on top:
  - a railway's ballast, with a pair of rails for every 4.5 m of width;
  - a motorway's guard rails;
  - a footbridge's railings;
  - a wildlife crossing's grass and hedge.
- Walls stand either side of the road under it, piers along it where the
  land lies low, and an abutment at each end. None stands on the road.

### What passes under the road

Where a path or a farm track goes under the road, the road crosses it as
a little bridge. It has a railing and a kerb on each side, as long as the
tunnel is wide.

### What runs over the bridges

- **A train**, now and then, over a railway's bridge.
  - It has three carriages, white with a red band, and runs at 80 km/h.
  - The first comes 4 to 30 seconds after the rider comes within 1.8 km.
    After that one comes every one to two minutes, one way and then the
    other.
  - Each keeps to the right-hand track.
- **A motorway's traffic**: cars and lorries both ways, keeping right.
  - A motorway has two lanes each way, or three on a wide bridge.
  - Lorries keep to the outer lane.
  - Traffic runs at 85 to 120 km/h.
- Both behave the same on the same bridge on every ride (`hash`). They
  run only while the rider is within 1.8 km (`bridge-traffic.ts`).
  Nothing of them is counted, and none of them stops.

### Race marshals on motorbikes

- On a city's closed course (ADR 0036), a race marshal's motorbike comes
  past where a car or a farm dog would in the country.
  - The bike is a big white touring bike with a top box and a blue light
    flashing.
  - Its rider wears a yellow vest. A marshal behind, in a vest too, holds
    a yellow flag.
- It hoots twice as it comes up and overtakes on the left. It then rides
  some 22 m ahead of the rider for about half a minute, with the flag
  waved overhead, and goes on.
- It is counted in today's little things ("moto"). The horn is the
  browser's own sound, like the bell and the whistle, and M quiets it. A
  ride kept from before reads as having met none.

### What this amends

- **Amends 0034.** In a city, a motorbike comes where a car or a farm dog
  would, and today's little things count it.
- **Amends 0035.** The land file carries the bridges and tunnels. The land
  under a bridge the road is on is no longer lifted to the road.

## Trade-offs accepted

- **A bridge's height is a guess.** The map says a bridge is there, not
  how high it is. The height model has no bridges in it, and the course's
  heights are smoothed. So a deck is as high as the land at its ends and
  the room over the road make it.
  - Vejlefjordbroen comes out high on its piers over the shore road.
  - By Vejle station the real road dips under the railway, but the
    course's heights do not dip. So the railway rises over the road
    instead. The course is what the rider rides, and lowering it is not
    the landscape's to do.
  - A railway drawn 260 m past the road stands on piers where the real
    one runs on the ground. By Vejle station it passes close to the
    buildings beside the tracks. Its deck is centred on one track of the
    several the map draws.
- **Traffic mostly out of sight.** From under a high bridge, the parapet
  hides the cars; only a lorry's top shows. A train on a low bridge shows
  whole. The traffic is for a rider who sees a bridge from a way off.
- **Coming and going at the ends.** A train's carriages and the cars
  appear and vanish at the ends of the drawn line, 200 to 260 m from the
  road.
- **Motorbikes only in the city.** Marshals on motorbikes belong to a race,
  and only the city routes are ridden on race day (ADR 0036).
- **What moves costs.** While the rider is near, a motorway bridge moves up
  to 120 vehicles each frame, and a railway three carriages.
- **One route of five.** Only Vejle–Munkebjerg passes under a railway or a
  motorway. The other routes have their bridges and tunnels, but no train
  and no traffic.
