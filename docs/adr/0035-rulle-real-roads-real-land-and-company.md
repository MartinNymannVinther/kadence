# ADR 0035: Rulle's routes — a session to choose, real roads through real land, and company on them

Status: accepted · Date: 2026-09-30 · Builds on 0014, 0033, 0034 · Amends 0033, 0034

## Context

Rulle (ADR 0033) rode today's planned session on a Danish route drawn
from a GPX file, through a landscape made up from the route's own
heights. The coach who uses it asked for four things next: a session to
choose when none is planned; two or three routes that come with Kadence,
the first the road race course of the Danish youth championships, B&U
DM 2026 in Vejle, with its finish where it stood on the day; the woods,
water, coast and towns from OpenStreetMap around the road; a small map
of the route with the rider on it; and more life on the road — riders
both ways, now and then someone mending a puncture — and a landscape a
little nicer to look at.

Dogma two says Rulle runs on one server with no key and no network it
depends on; dogma four keeps what is hosted with EU-owned providers;
riders are young (ADR 0013); DCU's recommendations are the default and a
deviation is always shown (ADR 0014).

## Decision

- **A session to choose.** With nothing planned, or instead of what is,
  the rider picks from the team's own library — the coach's templates
  that can be ridden on a trainer — or from DCU's sessions: a base ride,
  and DCU's interval forms as the interval sheet and the compendia's
  example weeks write them (2×15 medium, 3×8 AT, 3×3 VO2, 10×30/30, 5×10
  s sprints, an opener; `src/modules/dcu/bike-sessions.ts`, each with its
  source page). DCU's own words for when a form belongs in a season are
  shown beside it, never enforced; the warm-up, the rests and the zone
  each is ridden in are Kadence's, since DCU gives none.
- **Routes that come with Kadence.** B&U DM 2026's road race lap in Vejle
  (10.0 km, from the race's own file), with the finish arch, barriers and
  a few people at Vejledalen, the top of the climb, where the line was;
  Vejle along the fjord to Munkebjerg (18.0 km); and Ry to Himmelbjerget
  and back by Julsø (22.5 km). Each is an ordinary GPX file in
  `public/rulle/routes`, read through the same import as a rider's own.
  The race course is the default. A rider's own GPX still works, sent
  nowhere.
- **The real land round them.** Beside each route lies its land,
  `<route>.land.json`, made once by a developer with
  `scripts/rulle-land.ts` and checked in: the ground's heights every 40
  m for 2.6 km round the road, from Mapzen's terrain tiles (Terrarium; in
  Denmark EU-DEM and SRTM, the sea floor ETOPO1); and from OpenStreetMap
  the woods, water, fields, meadows, heath, wetland and towns, the tree
  rows, hedges and streams, the wind turbines, and every building within
  650 m of the road as the rectangle round its footprint. The file is
  read (`readLand`, pure, tested) only for the course it was made for;
  otherwise the land is made up as before. Lakes lie at their shore's
  lowest height and never above the road beside them; the sea is where
  the ground lies below it. The landscape draws it: fields each their
  own colour, woods close and turning (a third conifer, where the map
  does not say), lakes that give back the sky, streams, houses with their
  windows and chimneys, churches with their towers to the west, and
  beyond the mapped buildings towns and farmyards filled with houses of
  the same making. Cows graze only in fields and meadows, moved along the
  road to the nearest one; a coffee stop is never put in a lake.
- **A small map.** A drawing of the route in a corner with the rider on
  it, and the finish on a race course; K or a button hides it, and the
  choice is remembered on the device.
- **Company on the road** (amends 0034's "one thing at a time"): riders
  coming the other way, many with a hand raised; slower ones ahead to be
  caught, faster ones from behind that pass on the left; now and then a
  club of three or more in one kit; about one a minute and a half at a
  steady pace, fixed by the route and the lap like the small things, and
  never where a car overtakes. About one lap in three, someone at the
  roadside with the bike upside down, mending a puncture. None of them
  has a name, a time or a gap: nobody is raced. Today's little things
  count the waves and the punctures passed, and the finish crossed.
- **A little nicer.** The sun casts a soft shadow round the rider and
  what passes; the sky is warmer low toward the sun; water glints; there
  are birches, and some beech and oak have turned. A small or slow device
  gets no shadows and half the trees, as it gets fewer pixels.
- **Amends 0033**: a route that comes with Kadence is drawn through its
  real land, not land made from it. **Amends 0034**: other riders pass
  while a small thing does.

## Trade-offs accepted

- **1.8 MB of land in the repository and on the wire.** 456, 750 and 629
  KB of JSON, fetched with the route (180 to 290 KB compressed). Kept
  because the landscape then needs no service at all when it is ridden:
  a self-hosted Kadence without the internet draws the same land.
- **The land is OpenStreetMap's, under the ODbL.** The land files are a
  derivative database: they are available under the ODbL like the map
  they come from, and the route card credits OpenStreetMap's
  contributors, and the terrain's sources, as their licences ask.
- **A developer's script talks to two services**: OpenStreetMap's
  Overpass API (FOSSGIS, Germany) and Mapzen's terrain tiles on AWS's
  open-data bucket — a US cloud, which dogma four keeps out of the hosted
  service. It is run by hand when a route is added, sends nothing but a
  box round a public road, and is never run at build or at ride time;
  what it fetched is in the repository. EU-DEM through OpenTopoData,
  which gave the routes' own heights, was the alternative, but its limit
  of a thousand requests a day covers a route's road, not 20 km² round
  it.
- **Real land only for the routes that come with Kadence.** Fetching the
  land for a rider's own GPX would send their route to a third party at
  ride time. Their route keeps the made-up land. A self-hoster may run
  the script for routes of their own; making that easy is a later
  decision.
- **The height model is not the road.** Near a steep slope or where a
  road cuts into a hill, the model lies up to 20 m from the route's
  smoothed heights; within 18 m of the road the land is the road's, and
  it becomes the model's by 50 m, so the road runs on an embankment or in
  a cutting there. EU-DEM is a surface model, so woods stand a few metres
  high in it.
- **Buildings are rectangles.** An L-shaped farm is a rectangle round
  both wings, a round tower a square; every roof is gabled or flat, and
  the windows are placed by rule, not by photograph. Further than 650 m
  from the road no building is mapped for the ride: there towns and
  farmyards are filled with made-up ones, which from that far read as a
  town.
- **The map is as good as the map.** A wood OpenStreetMap does not say is
  conifer is broadleaf or conifer by its number; land nobody mapped is
  fields; a lake's shore follows a 25 m grid softened by the land.
- **More to draw.** The real land is 150,000 to 800,000 triangles on the
  screen, built a chunk at a time (a millisecond or two each) and drawn
  in 120 to 320 calls, a tree's crown coloured per copy so a chunk's
  woods are four; a trainer's laptop manages it, and a phone gets half.
- **Company that is never a race.** Riders pass and are passed, but none
  is timed, named or shown as a gap, and passing one counts for nothing
  (ADR 0013). A rider who wants a race has the session's own targets.
