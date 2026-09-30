# Tech debt

What we know is not right yet, why it is not right, and what fixing it
would take. A debt item is written down when it is discovered and moved
to **Paid** when it is done — an item nobody can find is an item nobody
pays.

CLAUDE.md's ways of working point at this file; this is it.

Opened at wave 0, September 2026, when the foundation was taken from
Plot and the product was thirteen tables and their policies. What is
here was inherited with the foundation, checked against this repository's
code, and kept only where it still applies. **Check an item against the
code before acting on it.** A debt file that is trusted without being
checked is worse than no file.

Three kinds of item live here, and they are kept apart on purpose. What
is **open** is wrong and worth fixing. What is **accepted** is a
boundary we chose, written down so nobody re-discovers it as a bug. What
is **waiting for real use** is a product question we refuse to answer
from the armchair (dogma seven).

## Open

### Files over 300 lines

One responsibility per file and no file over roughly 300 lines. The
inherited ones over it are the family's (`tests/access/admission.test.ts`,
`tests/rls/tenant-isolation.test.ts`, `settings/access/access-admin.tsx`,
`core/access/service.ts`, `core/db/schema/foundation.ts`); a split there is
better made once and carried across. Kadence's own: `drizzle/0003` is SQL
and reads top to bottom as one story, and `tests/rls/rider-isolation.test.ts`
is one team's cast in one file on purpose.

### The inherited ADRs speak of flows, conversations and initiatives

ADR 0002 to 0009 came with the foundation and were written for Domino,
Makker and Plot. Where they explain the foundation they hold here word
for word; where an example names a flow, a conversation or an initiative,
it is a sibling's. Each carries a line at the top saying so.

### The streaming half of the adapter is unused

`src/core/llm` has `stream()` beside `complete()`, and `streamAnswer` in
`src/modules/ai/service.ts` wraps it. Kadence asks for JSON only. It stays
because the adapter is the family's and is kept in step across the
tools; it is tested and costs nothing but lines.

### Wahoo and Garmin have never answered a real request

The adapters (src/modules/devices) are built from the public docs; the
endpoints those do not pin down are marked "verify against the partner
docs on approval" in the code. Garmin does not sign its pings (what a
forged one can do is written at `verifyWebhook`), a ride whose download
fails is not retried by the provider (the rider sees it in the link's
last error and can upload the file), and two refreshes of one link at
once are not serialised. All of it waits for developer access. Garmin
has taken no new partners since March 2026
(docs/research/garmin-without-partner-access.md), and a coach reported
in June 2026 that Wahoo no longer passes on heart rate for riders under
16; that report is not confirmed with Wahoo and should be asked about in
the application.

### The limiter trusts a forwarded address when nothing is in front

`src/core/rate-limit.ts` reads the caller's address from the right of
X-Forwarded-For, `TRUSTED_PROXY_HOPS` from the end, and treats 0 as 1. An
installation with no proxy in front, which 0 is there to say, therefore
believes the one entry the caller sent: a bucket of the caller's
choosing on every public route, the upload key's door included (the
review of ADR 0029 found it). The entries are not checked to be
addresses either. The fix is small — at 0 read neither header, and take
only what parses as an address — but the file is the family's, and is
better changed once for all siblings. Kadence's own deployment has
Traefik in front and is not affected.

### Members can read each other's addresses in the database

The foundation's `users` policy (drizzle/0001, `app_select_org_members`)
lets any member of a team read the name and email of everyone on it.
Kadence needs the names (comment authors); no page, export or API shows
a rider or a parent another member's address any more (ADR 0019), but
the row is there for a query that bypasses the services. Closing it
means a narrower view for names only, or column privileges on `users`
for the application role — family code, better changed once for all
siblings.

## Accepted, with the reason written down

### The content policy still allows inline scripts

`next.config.ts` sends a Content-Security-Policy, and it blocks
everything Kadence never uses: no external scripts, no framing, no
`<base>`, no form posting off-site. But `script-src` keeps
`'unsafe-inline'`, because Next.js writes its own bootstrap inline and
next-themes writes the one that sets the theme before first paint.

Closing it means a per-request nonce, set on the _request_ headers in
`src/proxy.ts` so Next stamps it onto its own scripts — and composed with
`next-intl`'s middleware, which builds its own response and will not
carry modified request headers by itself. It also forces every page to
render dynamically, which `src/app/[locale]/layout.tsx` currently avoids
with `generateStaticParams` and `setRequestLocale`.

That is a real trade with a real cost. It deserves its own change, with a
test, not a line in a hardening pass.

### Rate limiting is per process

`src/core/rate-limit.ts` counts in memory, which is correct for one
container behind one proxy and says so. An installation scaled to several
instances gets a limit per instance rather than a limit. The file is
written so that it is the only one to replace; the call sites do not
change.

### The workspace model key is bound to its workspace, but old ciphertexts are not

`src/core/crypto/secret-box.ts` seals as `v2` with the workspace id as
additional authenticated data, so a stored key only opens for the
workspace it was stored for. `v1` values are still read, without that
binding, for installations upgraded from an older foundation. Kadence has
never written a `v1` value; the read path can go the day the family's
other tools no longer need it.

### The date helpers are wider than the product

`src/core/dates.ts` carries week numbers, plan-date arithmetic and three
formatters, all inherited and all tested. Kadence uses the date and stamp
formatters and none of the week arithmetic. The rest stays because it is the family's one calendar; it
costs nothing while it waits.

### A guardian's link lapses by birth year

`app_is_guardian_of` ends a parent's access on 1 January of the year the
rider turns 18, because Kadence only stores the birth year (DCU's classes
go by year). Up to a year early, never late (ADR 0011).

## Waiting for real use

### A phone, a cable and a share sheet

"Hent fra enheden" and the share target (ADR 0029) are tested against a
folder on a computer and against the routes, in Chrome and in WebKit.
Nobody has yet plugged a Garmin Edge into an Android phone or an iPhone
and pressed the button, or shared a file to the installed app on a
phone. What is known from reading: the older Edges (130, 530, 830, 1030)
are plain storage; the newer ones (540, 840, 1040, 1050) speak MTP,
which phones do not read reliably; Safari has no share targets. The
winter's team has the devices, and says which of this is worth more
work.

### Nothing brings a file by itself yet

An upload key is a door. What uses it today is `scripts/send-rides.sh`,
a shell script for a Mac or a Linux machine, run by hand. A Windows
script, something that runs when the device is plugged in, a target in
Gadgetbridge and an app on a Hammerhead Karoo are each possible and each
unwritten. The winter's team says what the families actually have
(docs/upload-keys.md, section 6).

### A session on a real Edge has not been ridden

Sessions go onto a Garmin through `Garmin/NewFiles` (ADR 0031), written
by Chrome through the File System Access API or copied by hand. It is
tested against the browser's own private file system laid out as a
Garmin drive, and the FIT file against Garmin's profile. Nobody has yet
plugged an Edge in, sent a week to it and ridden a session: whether the
Edge takes the files in, keeps the day's two sessions apart, replaces a
changed one, and shows the step names, the notes and the cadence as the
profile says. The winter's first Edge 530 or 830 says.

### A real Strava archive has not been tried

The archive import (ADR 0030) is tested against archives laid out the
way others describe Strava's: `activities.csv` with its English or
German column names, or with names Kadence does not know found by what
the columns hold and where they stand, an `activities/` folder of
`.fit.gz`, GPX and TCX. Strava writes the list in the account's
language; a German account's is seen in others' code, a Danish one is
inferred from it, not seen, and neither are Strava's Danish type words
beyond those on its website. Strava's own help does not describe the
layout, and no rider's real archive has been dropped on it yet. The
winter's first rider with a Strava history — best one with Strava in
Danish — says whether the names and types come through; if the list
cannot be read, the rides come in without their names.

### The rides a key brought have no page

A ride remembers which upload key it came with (ADR 0029), and the day a
key has gone astray a coach finds its rides in the export and the audit
trail. Nothing in the app lists them. The page is built when a key has
been lost for real, and shaped by what the coach needed that day.

### One team per rider

A rider on a club team and a national squad at once needs two accounts
(ADR 0010). Whether real riders need more is for the first winter to say.

### Rulle has never met a real trainer

Rulle (ADR 0033) speaks FTMS, Cycling Power and Heart Rate as the
specifications lay them out, and is tested against those byte layouts
and against a fake trainer in the page, in Chromium. No Wahoo, Tacx,
Elite or Saris has been connected yet. Known from reading, not from a
ride: some trainers want to be started before they take a target, some
send their Indoor Bike Data in two halves, and some drop control when
another app connects — each handled, none seen. The first real ride says
whether the watts hold, whether the ride saves on a phone with a
connection that comes and goes, and whether the landscape keeps up on
the laptop a family actually has in front of the bike. The two metres
the numbers are sized for are measured on paper; a rider on a real
trainer says whether they read.

### Whether the small things are too many, or too few

The things that pass, the cowbell and the coffee stop (ADR 0034) have
been seen in stills and in a simulated ride, not by a rider an hour into
a winter session. About one every eight or nine minutes is a guess; so
is a cowbell at the end of every hard block. A real winter says whether
they cheer or wear, and whether anyone wants a switch.

### A team's own routes

Every rider rides one of the three routes that come with Kadence or a
GPX of their own on the device. A coach who wants the team on the same
local loop hands out a file, and that loop runs through land made up
from it, not the real land the three have (ADR 0035). A route shared
through Kadence is a table with RLS, audit and isolation tests (ADR
0033), and waits until a coach asks for it.

### The real land is a map's

The land round the three routes (ADR 0035) is OpenStreetMap's and a
height model's, drawn by rule: a building is the rectangle round its
footprint with windows spaced evenly, a lake's shore follows a 25 m grid
softened by the land, a wood the map does not call conifer is one or the
other by its number, and no building beyond 650 m of the road is real.
The files were fetched once, on 30 September 2026, and are refreshed by
hand (`scripts/rulle-land.ts`); the terrain tiles it reads sit in a US
cloud's open-data bucket, fetched by a developer, never by Kadence. The
stills look right; whether a rider who knows Vejle recognises it, and
whether a family's laptop keeps up with the woods at Munkebjerg and the
shadows, is for a real ride to say.

## Paid

### A rider cannot yet have their own trail erased

Paid in wave 4: `erase_rider` (drizzle/0006) deletes one rider and the
audit rows about them, checked by the function itself like
`delete_workspace`, and records that an erasure happened without naming
anyone (tests/team/erase.test.ts).
