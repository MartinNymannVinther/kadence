# ADR 0033: Rulle — today's session on the trainer, in the browser

Status: accepted · Date: 2026-09-29 · Builds on 0016, 0018, 0019, 0022

## Context

A Danish winter has days when nobody should be out on a bike. Riders
then ride indoors, and until now that meant another app: the session
exported as .zwo or .erg (ADR 0022's formats), loaded somewhere else,
ridden there, and the file brought back — or, more often, not ridden as
planned at all. Zwift and its kind are built for racing and for a world
of other riders, which is the opposite of what Kadence is for young
riders (ADR 0013: no leaderboards, process before results), and they
cost money every month.

What a rider needs is narrow: open today's session from the coach, ride
it on the trainer without setting anything up, and have the ride count
in the week's load like a ride outdoors. It is an emergency solution
that should feel good, not a game.

## Decision

- **A module of Kadence, not a product.** Rulle lives under `/rulle` in
  its own full-screen route group, with the same login, workspace,
  database and deployment. It is in the menu for riders and coaches, and
  "Kør indendørs" on today's page and in a session opens it on that
  session. With no session asked for, it takes the rider's first open
  bike session with steps today.
- **The browser talks to the trainer** over Web Bluetooth: the Fitness
  Machine Service (FTMS) for a smart trainer, which Rulle takes control
  of and gives each block's watts (ERG) and a flat road for a free block;
  Cycling Power as the fallback, read but not steered, for a trainer or
  power meter that only measures; Heart Rate for a strap. Every Control
  Point command waits for the trainer's answer; a dropped connection is
  taken up again by itself, and control with it. The parsers are pure
  and tested against the specifications' byte layouts
  (`src/modules/rulle/ble`); the Web Bluetooth types are Kadence's own
  (no package). Permissions-Policy names `bluetooth=(self)` and
  `screen-wake-lock=(self)`.
- **The session is Kadence's own structure**, read as blocks in the
  plan-against-ride's order: each block's watts are the ones the workout
  files write for its target, from the rider's FTP. RPE and open blocks,
  and every block for a rider without an FTP, are ridden freely: the
  rider hits the numbers, and the screen says what the block asks for.
  The rider can turn the watts five per cent down or up, skip a block,
  and turn ERG off; the ride pauses by itself when the legs stop.
- **The ride is an ordinary FIT file.** Recorded a second at a time,
  written with Kadence's own FitWriter (indoor cycling, a lap per block,
  no positions) and sent to `POST /api/rulle/ride`, it goes through the
  same import as any upload and lands on the session it was ridden for:
  the import takes a preferred session, used when it is the rider's own,
  still open and on the ride's day. Only the rider saves: a coach may
  try a session on the trainer, and a trial is saved nowhere. A file sent
  again is answered with the ride it became. The save counts with the
  upload's hour. A ride with nothing measured is not a file; the session
  is ticked off by hand with its minutes filled in.
- **Nothing is lost to a browser.** The ride is kept in the browser every
  few seconds while it goes on and until Kadence has it, under the
  rider's own key; a closed tab or a lost connection offers it back.
- **A route is a GPX file and a curve.** Kadence's own XML reader reads
  a track or a planner's route points with heights; the course made from
  it is a loop (out and back when the file ends elsewhere), sampled every
  ten metres, heights smoothed and slopes held to 15 %. One route comes
  with Kadence as an ordinary file in `public/rulle/routes`, read through
  the same import: Vejle station, the fjord, Munkebjerg, the plateau and
  Kiddesvej, 18 km and about 230 m of climbing (roads from OpenStreetMap
  routed by BRouter, heights from EU-DEM 25 m; credited on the page). A
  rider may ride their own GPX; it is read in the browser and sent
  nowhere.
- **The physics are one-dimensional.** The rider is a distance along the
  curve and a small sideways sway; the speed is the watts against a fixed
  standard mass (78 kg with the bike), the slope, rolling and air.
- **The picture is three.js, low-poly, in the 2a palette**: land made from
  the route's own heights, fields, woods, farms, a church, wind turbines,
  a low sun and haze. The sense of speed comes from the camera and from
  what passes close to the edges of the picture — posts, tufts, trees,
  the dashes of the middle line — not from detail. The interval bar is
  the centre of the screen: the whole session as a profile the rider
  moves across, with the time left of the block and whether the watts are
  on target, all sized to be read at two metres (`text-ride-*`).
- **No schema change.** A ride is an activity; a route is a file.

## Trade-offs accepted

- **One new dependency**, three.js (MIT), where Kadence otherwise draws
  by hand. A landscape cannot sensibly be hand-drawn. It is loaded only
  on the ride screen; without WebGL the quiet sky remains and the ride is
  the same.
- **Web Bluetooth is Chrome's.** Chrome and Edge on a computer and on
  Android have it; Safari and Firefox do not, so an iPhone needs the
  Bluefy browser. The page says so, and the session can still be ridden
  on the clock, ticked off by hand afterwards. It needs https (or
  localhost while developing). ANT+ is not spoken.
- **The mass is not the rider's.** Rulle reads no body data (ADR 0013);
  a light rider climbs a little slower on the screen than on the road.
  The watts, which are what is recorded and what the load comes from,
  are the rider's own.
- **ERG only, no simulated gradients.** In ERG the trainer holds the
  block's watts whatever the road does; a free block is a flat road. The
  route's hills move the rider on the screen, not the resistance.
- **The land is invented around a true road.** Only the road's own
  heights are known, so the country beside it is drawn from them and from
  noise: the hills of Munkebjerg are there, the woods and farms beside
  them are not the real ones.
- **A route is not shared through Kadence.** A team's own routes would be
  a table with RLS, audit and isolation tests — a later decision. Until
  then a coach can hand a GPX to the riders, and the bundled route is
  what everyone rides.
- **Not built:** other riders on the road, races, segments and records,
  workouts made in Rulle, and the trainer's resistance following the
  hills. No real trainer has been connected yet; the first real ride is
  the test that matters (TECH-DEBT.md).
