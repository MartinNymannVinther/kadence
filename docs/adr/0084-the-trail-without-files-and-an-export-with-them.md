# ADR 0084: The trail without files, and an export with them

Status: accepted · Date: 2026-10-11 · Amends ADR 0003, ADR 0005 and ADR 0048 · Backlog S-04 (trin 0)

## Context

Kadence is to hold many clubs on one installation (the plan for Kadence
alone and as a service, §5.0, approved by Martin on 11 October 2026).
Four things in the audit trail and the export were written for one small
team and do not hold for many:

- **The trail turned every file into hex before it threw it away.**
  `audit_row_change()` (drizzle/0001) built the row image with
  `to_jsonb(NEW)`, and only then did `audit_redact()` drop `bytes` and
  `streams`. A FIT file of up to 25 MB was read out of TOAST and written
  as a hex string twice its size inside the trigger, on every upload. On
  this machine that cost 9 ms for a 5 MB file and 80 ms for 25 MB on top
  of the insert itself, and two to three times the file in memory for
  the moment it took.
- **Deleting a workspace wrote a row to the trail for every row it
  deleted,** then deleted all of them again. `delete_workspace()`
  (drizzle/0003) let the cascade fire the audit trigger on every rider,
  ride, check-in and comment the club ever had.
- **A demo's trail stayed forever.** The demo's clean-up deleted the
  workspace and its throwaway accounts and never the audit rows about
  them, so with `DEMO=on` the trail grew by a seeded team's worth of rows
  for every visitor.
- **The export read everything at once, with no limit, and without the
  files.** `select *` over every table, `activities` with its samples
  (redacted in JavaScript after they were read), the club's whole trail,
  all in one request; any member could ask for it as often as they
  liked; and the ride files themselves were not in it at all. Dogma
  three says everything can be taken out. When Haij holds a thousand
  riders' files, "everything" has to include the files, and taking it out
  must not take the server with it.

## Decision

- **The trail keeps who changed what, never the file.** The trigger
  empties the heavy column on its own copy of the row before it becomes
  jsonb: `NEW.bytes := NULL` on `activity_files` and `org_images`,
  `NEW.streams := NULL` on `activities`, and the same for `OLD`. `NEW`
  and `OLD` are the trigger's own variables, and an AFTER trigger's row
  is already written, so the table keeps its bytes; `to_jsonb` never
  sees them. Inserting a 5 MB file now costs nothing measurable on top
  of the insert. The columns are named table by table, because plpgsql
  has no way to leave a column out of `to_jsonb` without reading it;
  tests/audit/files.test.ts fails a new bytea or `streams` column on an
  audited table until it is named in the trigger too. `audit_redact()`
  keeps both names on its list as the safety net. Every other column of
  every table is recorded before and after exactly as before.
- **A deleted workspace is one event.** A DELETE whose own row names a
  workspace (`org_id`, or `organization_id` on the auth tables) that no
  longer exists is a workspace's cascade, and the trigger does not write
  it. `delete_workspace()` keeps its owner check and its ERRCODE, deletes
  the workspace's own audit rows as before, and writes one
  `workspace.deleted` event: who, which workspace, and how many rows each
  table held (`workspace_row_counts()`, which counts every table with a
  workspace column, whatever is added later). `scripts/delete-club.ts`
  writes the same counts beside its reason.
- **Not by switching the triggers off.** The first idea was
  `session_replication_role = replica` around the cascade. It does not
  work: Postgres enforces foreign keys with triggers, and in replica mode
  `ON DELETE CASCADE` does not fire either; the workspace would go and
  leave every row it held behind. tests/audit/workspace-delete.test.ts
  keeps that proof. The check in the trigger is one primary-key lookup
  on `organizations`, on deletes only.
- **A demo leaves no trail.** `delete_expired_demo()`, a definer function
  the auth role may call, deletes an expired demo, its throwaway accounts
  (the visitor, the demo's rider and parent) and every audit row about
  either: the workspace's, and the accounts' own rows that carry no
  workspace (users, accounts, logins). It locks the demo's row and
  refuses — returns false and does nothing — anything that is not a demo
  past its time, so the role that runs the clean-up can never reach a
  real club. Nothing records that a demo went: a stranger's sandbox is
  not the installation's history (ADR 0054).
- **`erase_rider()` reads an index,** not the workspace's whole trail:
  two partial expression indexes on `before_data ->> 'rider_id'` and
  `after_data ->> 'rider_id'`. Its semantics are unchanged.
- **The export names its columns.** Every exported table has a fixed
  list of columns in `src/modules/export/tables.ts`, and a test holds
  every column of every such table to that list or to its list of what
  is left out by name. `activities.streams` and `org_images.bytes` are
  never read; the old redaction stays as a second net. A column added
  later is out of the export until a person puts it in.
- **The trail leaves in pages.** It is read in pages of 5,000 rows by id
  (a new `(org_id, id)` index), each page in its own short transaction.
  The JSON export is streamed and holds the whole trail, one page in
  memory at a time. The spreadsheet is built whole by our own writer
  (`src/core/xlsx.ts`), so it holds the newest 10,000 rows of
  the trail, and the data page says that the whole trail is in the JSON.
- **The files come out beside it: "Hent dine filer".** A third download
  under Indstillinger → Data: every ride's original file as a ZIP, a
  folder per rider, `<rider>/<date>-<activity id>.fit`. It reads under
  the same RLS as everything else — a coach gets the team's files, a
  rider their own, a parent their child's when the child shares
  training. The archive is store-only (a FIT file is already dense) and
  streamed: the list first, then the files about 16 MB at a time, each
  batch in its own transaction. Our own writer (`src/core/zip.ts`) with
  the CRC-32 the spreadsheet already had, and ZIP64 when a club's
  archive passes 4 GB or 65,535 files. No dependency. That the files
  left is written to the trail with how many and how large.
- **Limits per workspace.** The export (spreadsheet and JSON together)
  three times an hour, the files twice, counted per workspace with the
  installation's limiter. Past the limit the link comes back to the data
  page, which says when it lifts.

## Trade-offs accepted

- **A cascade is trusted to be a cascade.** The trigger skips a delete
  because the row's workspace is gone, not because of who asked. Every
  workspace column is a foreign key to `organizations`, so an ordinary
  delete always finds its workspace; only a workspace's own deletion
  can make it disappear, and nothing a runtime role can reach deletes a
  workspace without writing the event (Better Auth's organisation
  deletion is off). Anyone who later deletes organisations another way
  must write the event too.
- **The count is all that is left of a deleted workspace.** It was so
  before; the event now says how much went, never what.
- **Heavy columns are a list in the trigger.** A new one must be named
  there. The meta-test makes forgetting loud, and until it is named the
  trail is still correct, only slow.
- **The spreadsheet's trail is capped.** A person opening the workbook
  sees the newest 10,000 changes; the JSON beside it has every one. A
  streamed spreadsheet would lift the cap and cost a deflating streaming
  ZIP writer, which is more of our own code than the cap is worth today.
- **The limits are per process today.** They use `src/core/rate-limit.ts`
  as it is; when it moves to the database (trin 0's own story), so do
  they, without a change here.
- **Indexes on the trail are built in the migration.** On a large trail
  `CREATE INDEX` holds writes to `audit_log` while it builds; at today's
  size that is seconds. Build it by hand with `CONCURRENTLY` first on an
  installation where it is not.
- **The demo's accounts are deleted in the database now,** in the same
  transaction as their trail, rather than by the clean-up's own
  queries. The auth role can still delete users itself, as before.
