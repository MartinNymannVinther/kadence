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

| #                                                | Decision                                                                            | Relations    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------ |
| [0001](0001-foundation-from-plot.md)             | Kadence becomes a Haij app on a copy of the Plot foundation                         |              |
| [0002](0002-tenancy-rls.md)                      | Multi-tenancy enforced with RLS and two runtime roles                               |              |
| [0003](0003-audit-logging.md)                    | Trigger-based, append-only audit log                                                |              |
| [0004](0004-admission-by-invitation.md)          | Admission by application and invitation                                             |              |
| [0005](0005-demo-workspaces.md)                  | A demo workspace per visitor                                                        |              |
| [0006](0006-workspace-chosen-models.md)          | A workspace can choose its own model                                                |              |
| [0007](0007-design-scale-and-tokens.md)          | A named small-text scale, and the last hard-coded values become tokens              |              |
| [0008](0008-ai-reads-on-their-own-route.md)      | An AI read is a route, not an action                                                |              |
| [0009](0009-ai-installation-roof.md)             | The installation's own roof over the AI                                             |              |
| [0010](0010-three-roles-and-the-parent.md)       | Coaches, riders and parents — three roles on the foundation's two                   |              |
| [0011](0011-riders-separated-in-the-database.md) | Riders are separated inside a team, in the database                                 | → 0002       |
| [0012](0012-one-open-conversation.md)            | One open conversation, no private messages                                          | → 0011       |
| [0013](0013-youth-defaults.md)                   | Youth defaults — no weight, no leaderboards, school in the calendar                 |              |
| [0014](0014-dcu-as-the-default.md)               | DCU's recommendations are the default, and deviations show                          |              |
| [0015](0015-dcu-season-and-heart-rate-bands.md)  | The season runs October to September; DCU's heart-rate bands beside Kadence's zones | → 0014       |
| [0016](0016-load-without-a-power-meter.md)       | Load without a power meter, on one scale                                            |              |
| [0017](0017-ai-proposals-for-coaches.md)         | Three AI proposals for coaches, and the team's yes to riders' data                  | → 0008       |
| [0018](0018-devices-act-as-the-rider.md)         | A device's ride comes in as the rider it belongs to                                 | → 0011       |
| [0019](0019-hardening-after-the-first-review.md) | Hardening after the first security review                                           | → 0011       |
| [0021](0021-coach-guide-and-tips.md)             | A coach guide in Kadence's own words, and tips that never enforce                   | → 0013, 0014 |
