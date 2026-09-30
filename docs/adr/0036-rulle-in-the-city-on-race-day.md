# ADR 0036: Rulle in the city — Future Racing in Copenhagen and the Worlds in Montréal, on race day

Status: accepted · Date: 2026-09-30 · Builds on 0013, 0033, 0034, 0035 · Amends 0034, 0035

## Context

Rulle's routes (ADR 0035) ran through the Danish country: the B&U DM
lap in Vejle, the fjord to Munkebjerg, Himmelbjerget. The coach asked for
two more, both in a city.

- **Future Racing 2026.** The youth race on the Copenhagen Sprint circuit
  (14 June 2026, https://www.sportstiming.dk/event/18537). The young
  riders ride the lap in the morning, before the professionals come onto
  it, and the ride should feel like riding inside Copenhagen. The
  organiser's GPX file came with it.
- **The Worlds' circuit in Montréal.** The circuit alone of the 2026 road
  world championships.

The plan agreed before the work had three slices:

1. both routes through their cities;
2. race day on them;
3. each city's own face.

Dogma two keeps the landscape free of any service at ride time. Riders
are young, and nobody on the road is raced (ADR 0013). What a person
wrote into a file is data, never an instruction.

## Decision

### Two city routes

- **Future Racing 2026, 10.3 km.** The organiser's own file, turned to
  start at the finish line, with heights from EU-DEM.
- **The Mont-Royal circuit, 13.6 km and 271 m.** No organiser's file is
  published, so it is drawn along OpenStreetMap's roads through the
  streets the official course map names. The official map says 13.4 km
  and 269 m. Heights come from Mapzen's terrain model (CDEM).

Each route has its land file (ADR 0035). `city` in the routes table
names the city. A rider's own file is never a city.

### A city's streets

- Each side of the road has a kerb, a cycle track, a second kerb and a
  pavement.
- Paving covers what nobody mapped.
- Buildings come from the map, with their heights, the height they start
  at, their parts and their roof's shape and colour. Spires and domes
  are copper where the map gives no colour.
- The tall buildings (25 m and up) and the churches are drawn across the
  whole land, so the skyline stands.
- The street trees are the map's single trees.
- A building the map gives no storeys stands as high as the city's own
  mapped ones. Beyond 700 m the blocks are made up, square to one
  another as a city's streets run.
- Windows are drawn only within 200 m of the road.
- The course is closed: no car, no farm dog, nobody coming the other
  way, no herds.

### The organiser's marks

A race's GPX waypoints are read for what they say (`marks.ts`, pure),
in Danish, English or French. The kinds are:

- an obstacle in the road;
- cobbles;
- the feed zone and the litter zone;
- a sharp bend;
- speed bumps;
- the team parking and the podium;
- the finish.

The words are only matched: never shown, never obeyed. A file's marks
are capped at 500 and a mark's words at 200 characters. A mark more
than 120 m from the road is not the course's.

### Race day

`raceDayOf` (pure, tested) lays the day out from the marks, from the
cobbled streets the road runs along (now in the land file, from
OpenStreetMap) and from the road's own bends and climbs.

- **The finish straight** is barriered on both sides, from 250 m before
  the line to 60 m after it. The crowd stands behind the barriers two
  deep, and three deep near the line.
- **The crowd elsewhere:** two rows on the climbs (5 % or more over
  40 m), one row at sharp bends, and a few people together here and
  there.
  - Some hold flags: Dannebrog in Copenhagen; Canada's, Québec's and the
    visitors' in Montréal.
  - Those with their arms up bounce on their toes.
- **An island at every obstacle**, left of the middle, with a blue
  keep-right sign. A marshal on it waves a yellow flag as the rider
  comes, and whistles once for each cluster of islands.
- **A marshal at every sharp bend.** The bends the organiser warns of
  also get barriers round their outside.
- **The cobbles** lie where the road runs down a cobbled street: Adelgade,
  and a short stretch of Nørre Allé. They shake the bike and the camera,
  and crossing them is one of today's little things.
- **The speed bumps** lift the bike, then the camera.
- **The feed zone** has soigneurs holding musettes out. **The litter
  zone** has its bins. Each zone has its sign.
- **The team buses** stand where the teams park, and **the podium**
  stands where the organiser puts it. It stands empty.
- **A calm screen** does neither the shaking nor the bouncing.
- **A pause** puts its café in a gap the crowd makes for it.

### Each city's own face

`CITIES` (pure) records each city as it is on its race's day.

**Copenhagen:**

- a June morning, the sun in the east-south-east at 39°;
- trees in full leaf;
- lamps hung on wires across the street;
- a pølsevogn as the stand;
- churches under copper.

**Montréal:**

- a September afternoon, the sun in the south-south-west at 38°;
- maples turning red;
- lamps on posts;
- a dépanneur as the stand;
- churches under tin;
- the plexes in red and brown brick and grey stone, with their stairs
  outside up the front;
- gravestones and obelisks in the cemeteries by the course;
- the Mont-Royal cross where it stands, 31.4 m (OpenStreetMap
  1330276952);
- ARRIVÉE over the line.

In both cities the host's flags fly on poles by the finish.

### What this amends

- **Amends 0034.** In a city, no car and no farm dog pass; the cargo
  bike and the scooter still do. The stand becomes the city's own. A
  camera looking at a stop below the road looks down over the road's
  edge.
- **Amends 0035.** The land file also carries single trees, the cobbled
  streets the route runs along, and buildings' heights, parts and roofs.
  Older files read as before.

## Trade-offs accepted

- **Race day, every day.** The crowd, the marshals and the flags are
  there on every ride, all year. Rulle shows these two courses as they
  are on their day, not on a Tuesday in November. Nobody is raced, timed
  or placed, and the podium stands empty (ADR 0013).
- **Thousands of people cost.**
  - A finish straight or one of Montréal's climbs puts up to about 2,500
    people in view, and 500,000 to 600,000 triangles on the screen with
    the city round them. The country routes put 150,000 to 380,000.
  - To keep that down, the crowd is drawn in parts of the lap near the
    rider only, in a plainer shape further off, and without shadows. A
    small or slow device gets half the crowd.
  - Whether a family's laptop keeps up is for a real ride to say.
- **Words and a point, not a plan.**
  - A mark says what is there, not how big it is. Where the land does
    not say, the sizes are guesses: an island is 7 m long, the feed zone
    120 m, the litter zone 150 m, and cobbles that are marked but not
    mapped run 80 m.
  - A mark that says none of the known words is left alone.
- **A city drawn from its map.** Montréal's lap is the course map's
  streets as OpenStreetMap routes them, not the organiser's file. The
  plexes' stairs go up the side of the building that faces the road,
  on three in four of them, by rule. The cross stands where the map has
  it, but the mountain and its woods hide most of it from the road, as
  they do.
- **Local words on the signs.** ARRIVÉE, DÉPANNEUR and PØLSER · SODAVAND
  are what hangs there, so they stay the same in any language. They sit
  in the message catalogues like every other word.
- **Always that day.** Copenhagen is always a June morning and Montréal
  always a September afternoon, whatever the date the rider rides.
