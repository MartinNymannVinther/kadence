# ADR 0081: The history follows the rider — into a team, and out again

Status: accepted · Date: 2026-10-11 · Builds on ADR 0010 (one team per rider), 0011 (riders separated in the database), 0048 (who creates a workspace), 0064 (all or nothing in two steps), 0080 (a personal workspace) · docs/plan-alene-og-som-tjeneste.md §2.4, §3.2, §3.4 · backlog S-02

## Context

ADR 0080 gave one person a workspace of their own. A person who then
joins a team got two workspaces and two rider rows, and their training
stayed in the first; ADR 0080 named that as the gap S-02 would close. A
rider who leaves a team (P1-07) left everything behind, with a copy under
Data as the only way to keep it. Martin approved on 11 October 2026 that
the training follows the rider both ways, asked for and answered on the
join page and in "Forlad holdet".

Every row about a rider carries `rider_id` and `org_id`, and the
database decides who reads it by both (ADR 0011). Nothing has ever
written across two `org_id`s.

## Decision

- **A move, not a share.** The rider's rows change `org_id` and
  `rider_id` and are then the other workspace's, under the same policies
  as any row there. Letting a coach read into another workspace would be
  the first policy to cross `org_id`, and it would have to be proven for
  every table for ever. A move is one function, one test, and a rider
  understands it: my training is with my team, or it is my own.
- **One SECURITY DEFINER function,** `move_rider_history(from, to)`
  (drizzle/0042), the first that writes in two workspaces. It refuses,
  with ERRCODE 42501 and a plain word in DETAIL, unless the caller's
  account is `riders.user_id` on **both** rows (`not_own_rider` — also
  for a row that does not exist, so it cannot be used to find out whether
  an id does), the rows are in different workspaces (`same_workspace`),
  the caller is a member of both (`not_member`), the target row has no
  planned session, activity or check-in yet (`target_has_history`) and
  no unique key would collide (`would_collide`, the table in HINT). A
  coach cannot pull a history to the team, and nobody moves another's.
  Everything moves in one transaction or nothing does.
- **What moves and what stays is one list,** `move_rider_history_tables()`,
  read by the function and by a meta-test that fails when a table with a
  `rider_id` column is in neither column. Moved: workout_templates with a
  rider (ADR 0050), planned_sessions, activities, upload_keys,
  activity_files, comments, checkins, rider_measurements, rider_goals,
  flag_resolutions, season_plans, race_results, calendar_events,
  device_links. Stays: guardians (a parent's link is to the team's rider
  row and is confirmed again on the new team, ADR 0011),
  planned_session_deletions, week_plan_drafts, club_championship_entries
  and club_champions (the team's). Three references are cut rather than
  carried across: a session's `template_id` and a template's
  `copied_from` when the template is the library's — the session keeps its
  own structure and title — and a race result whose race is a team event
  stays, since the event does. The target rider row takes the source's
  thresholds and UCI ID where it has none, and the rider's sharing
  choices as they are; sex and the class override are a coach's fields
  (drizzle/0018) and follow only into a workspace the rider coaches
  themselves.
- **Counts in the trail, never rows.** The rows move under
  `session_replication_role = replica`, as `delete_workspace` and
  `erase_rider` step around a trigger for one transaction: the row trigger
  would otherwise copy every moved row, check-ins included, into the
  target workspace's trail as before and after images. Instead the
  function writes one line per table with rows on both sides —
  `rider.history_moved_out` on the source and `rider.history_moved_in` on
  the target, `{table, rows}` — which a coach reads as any audit line.
  Audit rows stay where they were written: the trail is append-only, the
  old workspace's lines stand there and go with it when it is deleted.
  Foreign keys on `org_id` and `rider_id` hold because both targets are
  checked to exist first and nothing else changes; unique indexes are not
  triggers and still apply.
- **Joining a team** (`/join/[id]`, `src/modules/team/history-join.ts`):
  a signed-in rider who owns a personal workspace with their own rider
  row is asked "Tag din træning med over på holdet?", yes by default,
  with two sentences on what moves and what stays. Yes accepts the
  invitation, claims the prepared row, moves the history with the team
  as the context, and deletes the emptied personal workspace as its
  owner deletes any workspace. No accepts as before: two workspaces and
  the switcher. A refused move leaves the person on the team with the
  history where it was, and says so.
- **Leaving a team** (`src/modules/team/history-leave.ts`): a rider is
  asked "Tag din træning med?", yes by default. Yes makes a personal
  workspace named after them ("Emmas træning", as ADR 0080 names one),
  a rider row carrying their account, moves the history and only then
  leaves the team, landing them in the new workspace. All or nothing in
  two steps as ADR 0064: a refused move deletes the new workspace again;
  a team that cannot be left after the move has the history moved back
  and the workspace deleted. A personal workspace they already own is
  used instead of a new one, and refused plainly when it holds training.
- **One personal workspace per person, made only by the server.** ADR
  0048 lets nobody on a team create a workspace, and that still holds
  for every request. The server makes the leaving rider's workspace
  through Better Auth's server-only path — a call with the person's id
  and no session, which the endpoint refuses to any request and which
  skips `allowUserToCreateOrganization` — and a before-hook on
  `/organization/create` adds the one rule that path needs:
  `canCreatePersonalWorkspace`, false once the person owns one. The
  plan's nonce header had no slot here: Better Auth 1.7.1 refuses a
  session-less call that carries a request at all, so no header can
  open the door, and the hook needs none to close it.
- **The coach sees nothing new** except the `rider.history_moved_out`
  lines in the team's trail. No copy of the rider's rows stays with the
  team after leaving.

## Trade-offs accepted

- **The target must be empty.** A coach who has already planned for a
  new rider, or a personal workspace with training in it, refuses the
  move; the rider is told and keeps both. Merging two histories would
  mean deciding which check-in wins on a day, and nobody has asked.
- **Guardians re-confirm.** A parent followed the rider's row on the old
  team; the new team's coach adds the parent again and the rider
  confirms again, as for any parent (ADR 0011). Carrying the link across
  would make a coach's prepared guardian rows on the new team and the
  old team's links collide.
- **The personal workspace is deleted after a move in.** An empty
  workspace with a rider row and nothing else would stay in the switcher
  for ever; it goes as the owner would delete it, name and all, and the
  account stays because the team holds it.
- **Counts only, both ways.** A team's trail says how many rows left, not
  which. A coach who wants to know what a rider trained before they came
  reads it in the rider's calendar, which is now the team's.
- **Sex and class do not follow onto a team.** They are the coach's to
  set on the team's row (drizzle/0018); the coach sets them once.
- **A row trigger is stepped around** for the duration of the move. The
  same device as deletion and erasure; the function leaves its own
  lines, and the test proves no row image is written on either side.
- **The server-only path is open to every in-process caller**, as the
  demo's nonce was. The hook holds the one rule that matters — one
  personal workspace per person — and nothing a request sends reaches
  the path at all. When several instances run (plan §5), nothing here
  changes, since the call never leaves the process.
