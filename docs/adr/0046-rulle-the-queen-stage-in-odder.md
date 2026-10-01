# ADR 0046: Rulle's queen stage in Odder — every building in its land, the roads round it, and the hill sprint on Pederstrup

Status: accepted · Date: 2026-10-02 · Builds on 0013, 0034, 0035, 0036, 0037 · Amends 0034, 0035, 0036

## Context

The coach asked for the queen stage of Tour de Himmelfart as a route in
Rulle: stage 5, the road race in Odder on Saturday 16 May 2026, run by
Odder Cykel Klub (https://www.tourdehimmelfart.dk/5-etape/). The
organiser's route file came with it, as a FIT file. The climb up
Pederstrupvej to the hill sprint at Pederstrup is what the stage is
known for. The coach asked for as much of the real buildings and land
along the route as could be had.

The routes so far (ADR 0035, 0036) draw OpenStreetMap's buildings within
650 m of the road and make up the rest, and draw no road but the route.
Odder lies one to two kilometres from much of the lap, and its streets
are what make it a town.

The plan agreed before the work had four slices:

1. the route and its land;
2. every building in the land, all of Odder's;
3. the roads round the route;
4. the hill sprint on Pederstrup.

Dogma two keeps the landscape free of any service at ride time. Nobody
on the road is raced (ADR 0013).

## Decision

### The route

- **The organiser's file.** The FIT file's 689 points are written as an
  ordinary GPX file, since Rulle reads routes as GPX. The lap is 15.7 km
  and 178 m, from the finish on Vestermarken out by Ballevej and
  Bondesvadvej to Tvenstrup, up Pederstrupvej to the hill sprint, round by
  Løjenkær, down Findalsvej through Hads Bæk's valley at Balle Findal, and
  home by Balle and Snærild.
- **Its heights are the file's.** Checked against EU-DEM v1.1 through
  OpenTopoData, they agree within a metre (median 0.06 m). The line lies
  within 4 m of OpenStreetMap's roads at the 99th percentile.
- **Its marks are the organiser's.** The hill sprint at 6.4 km is from
  the route sheet. The two drop zones, on Findalsvej and on Vestermarken
  before the line, are from the organiser's map, laid on the route by its
  kilometre marks (within 30 m).
- It has its finish (ADR 0035), and it is listed second, after B&U DM:
  both are races the riders ride.
- The chalk climb (ADR 0034) falls on Pederstrup by itself: its steepest
  400 m, at 8 %, are the lap's.

### Every building in the land

- **The land file says how far its buildings reach** (`reach`, metres
  from the road). The landscape makes up houses and farms only beyond
  that. A file that does not say has them out to 700 m (`MAPPED`), as
  before.
- **`--buildings all`** has the land script fetch every building in the
  land, and the file then reaches 2,600 m: as far as the land is drawn.
- **The queen stage is made so.** It has 10,382 real buildings, the whole
  of Odder with Odder Kirke on the skyline, and none made up.

### The roads round the route

- **The land file carries the roads** from OpenStreetMap: main roads,
  minor roads and streets, service roads and drives, farm tracks, cycle
  paths and footpaths. Each has its kind, whether it is unpaved, and its
  line.
- **They are drawn on the land** as strips as wide as their kind (7 m for
  a main road down to 1.6 m for a footpath). They are asphalt, a
  pavement's paving, a cycle path's darker asphalt, a farm track's gravel
  or a path's earth, a hand's breadth above the ground.
- **A side road meets the route.** Within the route's verge it climbs to
  the asphalt's edge, and none lies on the route's own asphalt.
- **Nothing stands on a road.** No tree, hedge, tree row or made-up house
  stands on one, or within 1.5 m of its edge.
- **The route's own road is left out** by the land script. A stretch of
  road within 8 m of the route that runs its way (within 30°) is the
  route's. A side road keeps the point where it leaves it.
- **A bridge by the route** is drawn as a bridge (ADR 0037), not again on
  the land under it. A tunnel runs under the land and is not drawn.
- **Drives, cycle paths and footpaths only near the route.** They are
  kept within 700 m of it. Further off they are thinner than a pixel.
- The queen stage has 1,636 roads.

### The hill sprint on Pederstrup

- **The organiser's word for it.** A waypoint that says bakkespurt,
  bjergspurt, hill sprint or the like is a hill sprint (`marks.ts`). The
  words are only matched, never shown, as before (ADR 0036). "Dropzone"
  is now read as a litter zone.
- **The line.** A banner in a climber's red dots stands over the road on
  two legs, saying BAKKESPURT (HILL SPRINT in English), with a white line
  across the road.
- **The people.** They stand along the last 70 m of the climb on both
  sides, most of them with their arms up. Someone in red rings a cowbell
  as the rider comes up.
- **Counted.** Every time over the line is one of today's little things
  ("Over stregen i bakkespurten én gang."). A ride kept from before
  counts none.
- A hill sprint is drawn wherever a course has one, including a rider's
  own file that marks one: the words on the banner are Kadence's own.

### What this amends

- **Amends 0034.** Today's little things count the hill sprints' lines
  crossed.
- **Amends 0035.** The land file says how far its buildings reach, and
  carries the roads round the route. Older files read as before: 700 m,
  and no roads.
- **Amends 0036.** The organiser's marks include the top of a hill
  sprint, and a drop zone is a litter zone.

## Trade-offs accepted

- **A big file.**
  - The queen stage's land is 878 KB, near the 1 MB the tests allow a
    land file (ADR 0035), and 93 KB more than the next largest.
  - Its buildings are 358 KB of it and its roads 105 KB.
  - Kept, because the town is what the coach asked for, and the file is
    fetched once, with the route.
- **More to draw.**
  - Five times the buildings within reach of the road. In Odder's middle
    up to 250 stand in a chunk of 400 m, where made-up houses were at
    most about 80.
  - The roads are 96,000 triangles over the whole land, at most 1,710 in
    a chunk, and a chunk's roads take a third of a millisecond to build.
  - Buildings far from the road have no windows (ADR 0035), and a slow
    device gets half the trees as before. Whether a family's laptop keeps
    up in town is for a real ride to say.
- **Roads as strips.**
  - No kerbs, no lines, no shaped junctions. Widths are by kind, not
    from the map.
  - They lie on the land's 25 m triangles, so a road over a crest runs
    with the land, not cut into it.
  - Where a wide road meets the route at a sharp angle, its edge lies
    over the route's edge line, as at a real junction.
- **Narrow ways only near the route.** A footpath 1.5 km away is not
  drawn, though it is there.
- **The route is the organiser's file, not its programme.** The
  programme gives laps of 16.2 km (six for 97.2 km). The route sheet and
  the file say 15.7 km, and the file is what the rider rides.
- **The FIT file was turned into GPX by hand, once.** Rulle reads a
  rider's route only as GPX, and teaching it FIT routes is another
  decision. The GPX file says where it came from.
- **The hill sprint every day.** Its banner and its people are there all
  year, as race day is in the cities (ADR 0036).
  - Nobody is timed, no points are given, and no classification is kept
    (ADR 0013).
  - The drop zones are read but not drawn: a litter zone is drawn only on
    a city's race day.
- **Only this route's land is made again.** The other routes get their
  roads and every building when someone runs the script for them again.
  Doing that also brings their buildings and woods up to today's map, and
  is a change of its own to look at.
- **A developer's script talks to OpenStreetMap's Overpass API**, as
  before (ADR 0035), now for every road in the land too: a box round a
  public road, run by hand.
