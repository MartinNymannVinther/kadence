# Decisions

Every significant decision in Kadence is written down here, numbered in
the order it was taken, and says what trade-off was accepted rather than
only what was chosen. A decision is never rewritten once it is accepted:
a later one amends it and says so in both directions, so a reader who
arrives at the old number is told where the story continues.

This index is the way in. It is checked in, which means it has to be
re-read when an ADR is added. The number of the next one is the highest
here plus one.

ADR 0002 to 0009 came with the foundation from Plot and are the
family's decisions; each says so at the top. Kadence's own are 0001 and
from 0010.

Where the product's own words live instead: **README.md** has the seven
dogmas in the family's voice, **CLAUDE.md** is the constitution every
session reads, and **TECH-DEBT.md** is what we know is not right yet.

| #                                                                | Decision                                                                                                 | Relations                      |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------ |
| [0001](0001-foundation-from-plot.md)                             | Kadence becomes a Haij app on a copy of the Plot foundation                                              |                                |
| [0002](0002-tenancy-rls.md)                                      | Multi-tenancy enforced with RLS and two runtime roles                                                    |                                |
| [0003](0003-audit-logging.md)                                    | Trigger-based, append-only audit log                                                                     |                                |
| [0004](0004-admission-by-invitation.md)                          | Admission by application and invitation                                                                  |                                |
| [0005](0005-demo-workspaces.md)                                  | A demo workspace per visitor                                                                             |                                |
| [0006](0006-workspace-chosen-models.md)                          | A workspace can choose its own model                                                                     |                                |
| [0007](0007-design-scale-and-tokens.md)                          | A named small-text scale, and the last hard-coded values become tokens                                   |                                |
| [0008](0008-ai-reads-on-their-own-route.md)                      | An AI read is a route, not an action                                                                     |                                |
| [0009](0009-ai-installation-roof.md)                             | The installation's own roof over the AI                                                                  |                                |
| [0010](0010-three-roles-and-the-parent.md)                       | Coaches, riders and parents — three roles on the foundation's two                                        |                                |
| [0011](0011-riders-separated-in-the-database.md)                 | Riders are separated inside a team, in the database                                                      | → 0002                         |
| [0012](0012-one-open-conversation.md)                            | One open conversation, no private messages                                                               | → 0011                         |
| [0013](0013-youth-defaults.md)                                   | Youth defaults — no weight, no leaderboards, school in the calendar                                      |                                |
| [0014](0014-dcu-as-the-default.md)                               | DCU's recommendations are the default, and deviations show                                               |                                |
| [0015](0015-dcu-season-and-heart-rate-bands.md)                  | The season runs October to September; DCU's heart-rate bands beside Kadence's zones                      | → 0014                         |
| [0016](0016-load-without-a-power-meter.md)                       | Load without a power meter, on one scale                                                                 |                                |
| [0017](0017-ai-proposals-for-coaches.md)                         | Three AI proposals for coaches, and the team's yes to riders' data                                       | → 0008                         |
| [0018](0018-devices-act-as-the-rider.md)                         | A device's ride comes in as the rider it belongs to                                                      | → 0011                         |
| [0019](0019-hardening-after-the-first-review.md)                 | Hardening after the first security review                                                                | → 0011                         |
| [0020](0020-polar-as-the-third-device.md)                        | Polar as the third device                                                                                | → 0018                         |
| [0021](0021-coach-guide-and-tips.md)                             | A coach guide in Kadence's own words, and tips that never enforce                                        | → 0013, 0014                   |
| [0022](0022-activity-files-in-every-format.md)                   | Activity files in every common format                                                                    | → 0018                         |
| [0023](0023-a-map-served-by-kadence.md)                          | The map behind a route is served by Kadence itself                                                       | → 0022                         |
| [0024](0024-process-goals.md)                                    | Process goals, counted from what was done                                                                | → 0013                         |
| [0025](0025-training-blocks.md)                                  | Training blocks, previewed before they are applied                                                       | → 0014                         |
| [0026](0026-resolved-flags.md)                                   | A coach's "afklaret" on a guardrail flag, one week at a time                                             | → 0011, 0017                   |
| [0027](0027-strava-stays-a-file-source.md)                       | Strava stays a file source                                                                               | → 0018, 0022                   |
| [0028](0028-zoom-on-the-curves.md)                               | Zoom on the ride's curves: a drag or two taps, and no number changes                                     | → 0022                         |
| [0029](0029-an-upload-key-per-rider.md)                          | An upload key per rider: a ride handed over with nobody signed in                                        | → 0018, 0019                   |
| [0030](0030-a-strava-archive-in-one-move.md)                     | A Strava archive in one move: read in the browser, the rides only, their names kept                      | → 0019, 0022, 0027             |
| [0031](0031-sessions-onto-a-garmin-by-cable.md)                  | Sessions onto a Garmin by cable: the day first, a serial per version, into Garmin/NewFiles               | → 0018                         |
| [0032](0032-a-way-back-in.md)                                    | A way back in: a one-time link a coach makes, for a member who forgot the password                       | → 0010, 0019                   |
| [0033](0033-rulle-the-session-on-the-trainer.md)                 | Rulle: today's session on the trainer, in the browser                                                    | → 0016, 0018, 0019, 0022       |
| [0034](0034-rulle-small-things-on-the-way.md)                    | Rulle's small things: once in a while, at the edge of the picture, never on the numbers                  | → 0013, 0033                   |
| [0035](0035-rulle-real-roads-real-land-and-company.md)           | Rulle's routes: a session to choose, real roads through real land, and company on them                   | → 0014, 0033, 0034             |
| [0036](0036-rulle-in-the-city-on-race-day.md)                    | Rulle in the city: Future Racing in Copenhagen and the Worlds in Montréal, on race day                   | → 0013, 0034, 0035             |
| [0037](0037-rulle-bridges-tunnels-and-marshals-on-motorbikes.md) | Rulle's bridges and tunnels: the road over them, a train now and then, marshals on motorbikes            | → 0034, 0035, 0036             |
| [0038](0038-build-a-session-with-ai.md)                          | Build a session with AI, bike and strength: from words or by changing what is there                      | → 0014, 0017                   |
| [0039](0039-races-from-cykling-danmark.md)                       | Races from Cykling Danmark: a rider's races in the calendar, the placing for the coach                   | → 0011, 0013, 0018             |
| [0040](0040-four-numbers-against-the-season-plan.md)             | Four numbers against the season plan: DCU, the coach's goal, planned and done, one bar everywhere        | → 0014, 0015, 0025             |
| [0041](0041-repeat-a-session-on-set-weekdays.md)                 | Repeat a session on set weekdays: a series key on ordinary sessions, not a rule                          | → 0014, 0025, 0040             |
| [0042](0042-copy-a-week.md)                                      | Copy a week: each rider's own sessions laid again, groups kept, series not doubled                       | → 0025, 0040, 0041             |
| [0043](0043-the-teams-week-plan.md)                              | The team's week plan: built in one place for many riders, laid in at once, an AI week without rider data | → 0017, 0025, 0038, 0040, 0042 |
| [0044](0044-a-better-builder.md)                                 | A better builder: building blocks for the bike, exercise suggestions, the session at a glance            | → 0014, 0015, 0016, 0038       |
