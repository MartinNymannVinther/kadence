# ADR 0087: Files in the database or in an EU object store, with quotas

Status: accepted · Date: 2026-10-11 · Builds on 0018, 0022, 0084, 0085 · Amends 0029 (one more answer at the upload key's door) and 0081 (the objects follow the history a moment after the rows) · Backlog S-09 (trin 1)

## Context

Every ride's original file is a `bytea` in `activity_files` (ADR 0018):
in the database, in every dump, on the VPS's disk thirty times over.
That is right for a club on its own server and wrong for an installation
that is to hold many clubs (the plan for Kadence alone and as a service,
§5.1, approved by Martin on 11 October 2026): a thousand riders at a few
hundred rides a year at 0.3–1 MB each is 75–250 GB a year, which no
nightly dump should carry and no 4 GB VPS should keep on its one disk.
Martin's answers (§10): our own S3 signing rather than an SDK, Hetzner
Object Storage is fine, and quotas of 20 GB per club and 2 GB per person.

Three things had to stay as they were: the row in `activity_files` is
what RLS decides about, so who may read a file is decided before any byte
is fetched; deleting a ride, a rider or a workspace takes the file with
it; and the export carries the files (ADR 0084). And nothing may depend
on the store: a self-hoster who runs `docker compose up` has no bucket
and loses nothing by it (dogma two).

## Decision

- **Two back ends behind one adapter**, `src/core/files`: `db` keeps the
  file in its row as always, `s3` keeps it as an object in an
  S3-compatible store and the row keeps its key. `FILES_STORAGE` chooses;
  `db` is the default. The row carries either `bytes` or `storage_key`,
  never both (a check constraint), and `size_bytes` for both, filled from
  the bytes by a trigger when they are in the row.
- **Our own SigV4** (`sigv4.ts`, about 150 lines): the canonical
  request, the string to sign, the four HMACs and the header, as AWS
  describes them. The payload's hash is always signed; `UNSIGNED-PAYLOAD`
  is never used. tests/files/sigv4.test.ts holds AWS's own worked
  examples with their published signatures, and the tests' fake S3
  (`tests/helpers/fake-s3.ts`) checks every request with a verifier
  written on its own, so the client and the server agree because both
  follow the description and not because they share code.
- **Path-style, private, encrypted at rest where the store does it.**
  `<endpoint>/<bucket>/<key>`, so any S3 API in the EU works. Every
  object is written with `x-amz-server-side-encryption: AES256`; a store
  that encrypts at rest honours it and another ignores it, and whether
  Hetzner's does is checked at deploy time (docs/deploy.md, "File
  storage"). No ACL is ever set and no URL is ever handed out: the
  application is the bucket's only reader, and a file reaches a browser
  only through `/api/activities/<id>/file` and the export, after the row
  was read under the caller's policies.
- **Keys say nothing about anyone.** `<org id>/<rider id>/<sha256>.fit`:
  three ids. A listing of the bucket shows which rider has how many
  files and nothing more, and the same file for the same rider is the
  same object.
- **The row and the object stand or fall together**, as far as a
  database and a store can share a transaction
  (`src/modules/storage/keep.ts`). Before the upload, the key is written
  to `file_tombstones` on its own connection; then the object is
  uploaded; then, in the import's transaction, the row is inserted and
  the tombstone deleted. A transaction that never commits leaves the
  tombstone, and the job removes the object. A row that cannot be
  inserted has its object deleted at once. A store that refuses means no
  row and no ride: the import throws before anything is written.
- **Tombstones, because the database cannot delete from a store.** A
  trigger on `activity_files` (`ENABLE ALWAYS`, so it fires under the
  replica mode the definer functions use) writes the key to
  `file_tombstones` when a row is deleted or its key changes — the
  rider's delete, `erase_rider()`, `delete_workspace()`'s cascade, the
  move job — and `files.tombstones`, every fifteen minutes, deletes the
  objects whose tombstone is older than five minutes and held by no row,
  locked for its transaction so two workers never share one. A key a row
  holds again (a reservation that was kept, a re-upload of the same
  file) is never deleted. The deletion page says files are gone from the
  store within the hour.
- **The objects follow a moved history** (ADR 0081). `move_rider_history`
  moves the rows in one transaction; their keys still name the workspace
  left, and still read. The move service then puts `files.move` in the
  queue, which runs as the rider in the new workspace under the ordinary
  policies, copies each object under its new key, points the row at it
  and leaves the old key as a tombstone. Nothing is unreadable in between.
- **Old files move out by a job**, `files.migrate`, put in by hand with
  `scripts/migrate-files.ts` after an installation switched to `s3`:
  fifty rows a run, each uploaded, fetched back and compared by sha256
  before the row is pointed at its object and emptied of bytes in one
  statement. Idempotent and resumable; with files in the database it
  gives up with the word `files_storage_db` rather than wait. Until a
  row is moved the `s3` back end still reads its bytes from the row, so
  the switch can be made first and the move run after.
- **Quotas per workspace.** `team_settings.file_quota_bytes`, null being
  the installation's default for the workspace's kind:
  `FILES_QUOTA_CLUB_BYTES` (20 GB) and `FILES_QUOTA_PERSONAL_BYTES`
  (2 GB), decimal gigabytes as the pages show them. The sum is
  `workspace_file_usage()`, a definer any member may call, because a
  rider sees only their own rows under RLS and the quota is the
  workspace's. Every door a file comes in by — the upload, the upload
  key, a Strava archive, a share from the phone, Rulle, a device's
  webhook — passes the check inside the import, before the file is
  decoded, and refuses with one word, `quota`, that every page says as
  "Pladsen til filer er brugt. Slet gamle ture eller hent dem ud først."
  The upload key's door answers 507; the device job gives up at once and
  the link says why, since an hour later changes nothing. Settings →
  Data shows a coach, and the owner of a personal workspace, the bar;
  Installation shows the owner every club's files against its quota and
  lets them set another, through `set_file_quota()` with the same guard
  trigger as the AI budget (ADR 0089): the application role cannot
  write the column.
- **The installation's tables and definers.** `file_tombstones` has no
  `org_id` (a deleted workspace's keys must outlive it) and no audit
  trigger (named in the meta-test); the job's definers refuse any caller
  with a workspace in its context, so no request can reach the only
  definer that hands bytes over. `platform_overview()` counts files by
  `size_bytes` and gains `file_quota_bytes`.

## Trade-offs accepted

- **Our own SigV4 instead of an SDK.** About 150 lines and five test
  vectors against a dependency of a few megabytes with its own release
  cycle. The cost is that nobody but us fixes it; the gain is that a
  reader can check every line against AWS's description. The fake S3
  verifies independently, which is as close to a second implementation
  as a test suite gets without running a real store.
- **Two back ends to test.** Every path a file takes runs twice in the
  suite, once per back end. Worth it: `db` is what every self-hoster
  runs and `s3` is what kadence.haij.dk will.
- **An object may outlive its row by minutes**, and in the other
  direction a reservation outlives an abandoned upload by the same. Five
  minutes of grace and a fifteen-minute job: an object whose row is
  gone exists for at most about twenty minutes, in a private bucket
  nothing reads. The deletion page says "within the hour".
- **Keys carry ids.** A bucket listing says which rider row in which
  workspace has how many files. The ids are random and mean nothing
  outside the database; a key with a random name instead would need a
  lookup to find a rider's objects and would make the move job and the
  migration's idempotency harder. The store's credentials are the
  installation's, as the database's are.
- **Quotas are soft on the device path.** A ride a provider says is
  saved is fetched and then refused, so the provider's bytes have come
  and gone once; the link says why, and the ride is still on the
  provider for an upload when there is room.
- **A quota check is a sum over the workspace's files on every import**:
  an index-only scan of the workspace's rows, milliseconds for a club's
  tens of thousands. A counter would be faster and another thing to keep
  right.
- **The move job runs as the rider**, so it can only touch their own
  rows, which is the point; a rider whose account is gone before the job
  runs leaves objects under old keys that still read. Nothing is lost;
  the keys are cosmetic until the next move.
- **The migration verifies by reading back.** Twice the traffic of a
  plain upload, once, for the certainty that what the row now points at
  is what it held.
- **Hetzner's encryption at rest is a header we send and a promise we
  check by hand.** If the store ignores the header, the files are still
  only readable with the installation's keys, as the database is; the
  deploy guide says to look at the object's metadata once.
