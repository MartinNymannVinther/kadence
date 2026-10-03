# ADR 0048: Many clubs on one installation

Status: accepted · Date: 2026-10-03

## Context

kadence.haij.dk is to host several clubs at once, because not every club
will run its own installation (docs/plan-klubber-og-guides.md, wave B,
approved 3 October 2026). The foundation already separates workspaces in
the database (ADR 0002) and admits new accounts by the owner's approval
(ADR 0004). Three things stood in the way:

- **Anyone signed in could create workspaces**, as many as they liked:
  Better Auth's organisation plugin allows it by default, and the app
  offered "Opret arbejdsrum" to everyone. Admission gated accounts, not
  clubs.
- **Better Auth caps a workspace at 100 members** by default, enforced
  when an invitation is accepted. A club with forty riders, their parents
  and the coaches is close.
- **A login opened a workspace at random** (the first membership without
  an order), and the owner had no view of the clubs at all.

Martin also asked for a club's logo and a picture.

## Decision

- **A club is a workspace.** No level above or below it. Groups inside a
  club stay what the team plan already has; limiting a coach to a group
  waits until a real club asks for it.
- **Only the installation's owner creates workspaces.** Better Auth's
  `allowUserToCreateOrganization` asks `canCreateWorkspace`: the owner
  always, anyone else only while they belong to no workspace — which is
  the moment of their own approved registration, the very first account,
  and a demo. The switcher's "Opret arbejdsrum" is shown to the owner only.
- **Limits:** 500 members and 200 pending invitations per workspace.
- **The club opened last opens next.** `memberships.last_active_at` is set
  when someone makes a workspace active (an after-hook on
  `/organization/set-active`), and a new session opens the most recent,
  else the oldest membership.
- **The owner's overview** (Indstillinger → Installation) shows each club
  in figures: coaches, riders, parents, members, last seen, file space and
  AI calls in the last day. The SECURITY DEFINER function
  `platform_overview()` reads across workspaces and refuses anyone whose
  `app.user_id` is not the owner; it returns counts and the club's name
  only. Demo workspaces are left out.
- **No "sign in as".** A club that wants help invites the owner as a coach
  for a while; it shows in the member list and the log.
- **Deleting a club whose owner has gone** is a maintenance script,
  `scripts/delete-club.ts`, with the club's name typed exactly and a
  reason that stays in the log. The club's own owner deletes from the
  interface as before.
- **Logo and picture** live in `org_images` (one of each per workspace):
  everyone in the team reads, coaches write, as themselves, under forced
  RLS with an audit trigger. The browser scales the image and re-encodes
  it, which also drops EXIF data such as a GPS position; the server
  accepts PNG, JPEG and WebP only, checked on their own bytes, never SVG,
  at most 300 KB for a logo and 2 MB for a picture. The column is named
  `bytes`, so `audit_redact` keeps the image out of the log. Images are
  served from `/api/org/image/[kind]` to members only, with an address
  that changes with the image. The logo sits beside the club's name in
  the menu; the picture is a band at the top of the Today page.

## Trade-offs accepted

- **"No workspace yet" is the gate.** Someone removed from every team
  could create one club of their own. Tying creation to a spent admission
  key would be stricter, but it would also have to cover the very first
  account and the demo; the owner can see and delete such a club.
- **The overview is a window across tenants.** It is narrow on purpose —
  counts and names of clubs — and the owner of an installation is trusted
  with that much; the riders' data stays out of reach, in the database.
- **Images stay out of the export.** The club's export lists its images
  (which, type, size, who and when) without the bytes, which do not fit a
  spreadsheet cell; the images are one click away in the settings, and
  the club has the files it uploaded.
- **The last-used workspace is a column on Better Auth's table.** The
  plugin does not know it and does not write it; the hook does. Lifting
  the Better Auth pin must keep that hook working.
- **Hosting for clubs makes Haij a data processor.** That needs a data
  processing agreement and up-to-date terms; Martin owns that part.
