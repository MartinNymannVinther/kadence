# ADR 0080: A person alone — a personal workspace, the owner who is also the rider

Status: accepted · Date: 2026-10-11 · Builds on ADR 0004 (admission), 0010 (three roles), 0048 (many clubs) · Amends ADR 0061 and 0077 (the menus) · docs/plan-alene-og-som-tjeneste.md §2–3, backlog S-01

## Context

On 11 October 2026 Martin asked that one person, a child or an adult,
can use Kadence without a team, and come onto a team later. The model
already carries it: ADR 0010 says "a rider who trains alone is the owner
of their own team and has a rider row". Nothing created that row. A
person who registered stood as a coach without a rider — no Mig, no
devices, no check-in, no name in Rulle — and met a coach's menu built
for a team: Overblik, Ryttere, the team's week. The application at
`/register` asked for an organisation and nothing about a person, and a
child cannot give their own consent below the age Danish law sets.

## Decision

- **A personal workspace is a workspace.** The same tables, RLS, audit
  trail, export and deletion as a club's; the person is its owner and its
  rider. What sets it apart is one column, `organizations.kind`
  ('club' | 'personal', default 'club', checked and indexed;
  drizzle/0041). No policy is rewritten and no table gets another owner.
- **Only our server code sets the kind.** Better Auth does not know the
  column; `markWorkspacePersonal` in `src/core/auth/register-personal.ts`
  sets it on the auth role right after Better Auth has created the
  workspace, for an approved personal registration and for the demo's
  "alone". A before-hook on `/organization/create` and
  `/organization/update` refuses any body that names `kind`, so a later
  Better Auth that learns to pass unknown fields on cannot let a browser
  choose. The audit trigger on `organizations` records the change.
- **The application asks.** `/register` offers "En klub eller et hold" or
  "Mig selv", and for the second "Det er til mig" or "Det er til mit
  barn" with the rider's birth year — the applicant's own, or the child's
  with the child's name and, if the parent has it, the child's address.
  There is no workspace name to type: it is the rider's first name and
  "træning" ("Emmas træning", "Lars' træning"), in the applicant's
  language. `access_requests` and `access_invitations` carry `kind`,
  `birth_year`, `for_whom`, `child_name` and `child_email`, still without
  `org_id` and on the auth role only (ADR 0004); checks keep a personal
  row whole. The owner sees for whom and the birth year under Adgang, the
  approval and "Nyt link" carry all of it into the invitation, and the
  owner's direct invitation has the same choice.
- **Under 15 a person cannot apply for themselves.** Databeskyttelsesloven
  § 6, stk. 2 and 3, as amended by lov nr. 1783 af 28. december 2023 (in
  force 1 January 2024), sets the age for a child's own consent to an
  information society service at 15 in Denmark; GDPR art. 8(1) lets each
  member state choose 13 to 16. Kadence also holds health data about the
  rider (GDPR art. 9). The rule is one pure function with its source
  beside it (`src/core/access/age.ts`), asked by the form, the
  application, the owner's invitation and again at registration, and
  counted from the birth year in the current Copenhagen year. Below 15 a
  parent applies "for my child", owns the workspace and plans as its
  coach; the child is its rider and joins later by the link a coach's
  "Inviter rytter" would make.
- **The registration makes the rider.** For "me", a rider row through
  `createRider` under RLS as the new owner, with `user_id` the new
  account: coach and rider in one. For "child", the child's row without
  an account, and a team invitation for the child's address when the
  application gave one. The class follows the birth year; "youth" and
  "senior" have no DCU hours, and the season plan now says so plainly and
  that the hours are the person's own to set.
- **What the person meets.** `navRole(person, kind)` gives two new menus
  (`nav-items.ts`): "self", the owner who rides — I dag · Kalender · Mig ·
  Bibliotek; Mere: Sæson, Rulle, Viden og hjælp — and "family", a parent
  who owns their child's workspace — the child's page (the coach's page
  about that rider, by first name) · Kalender · Bibliotek · Sæson; Mere:
  Viden og hjælp. Neither has Overblik, Ryttere, the team's week,
  Trænerrummet or Klubmester. Today is "I dag", and a parent's Today is
  the child's page. Settings put everything under "Dig": the team tab
  becomes "Træning" without the team's kind, championship or pilot
  numbers; AI and Data stand there; there is no workspace tab. "Slet
  arbejdsrummet" is "Slet min konto og alt om mig" on the Data page: the
  workspace goes through `delete_workspace()` as before, and then the
  account, when no other team holds it and it is not the installation's
  owner. Mig links the person to their rider page for thresholds and a
  parent who can follow along. The guards are untouched: every service
  still decides by role; this is presentation and one column.
- **The owner's overview** (`platform_overview()`, drizzle/0041) returns
  the kind and no name for a personal workspace. Installation shows clubs
  as before and persons as one line, "Enkeltpersoner": how many, how many
  were in during the last week, their files and AI calls.
- **The demo** has "Prøv alene" (`/demo?alene=1`, linked from the front
  page): the team demo's Emma, U19, alone in her own workspace with six
  weeks of training, seeded from the same pieces as the team (ADR 0054).

## Trade-offs accepted

- **One team per rider remains** (ADR 0010, TECH-DEBT.md). A person with a
  personal workspace who is invited onto a team has two workspaces and
  two rider rows, and their history stays in the personal one until the
  move of S-02 (`move_rider_history`) exists.
- **The kind is a column on Better Auth's table**, like
  `memberships.last_active_at` (ADR 0048). The plugin neither reads nor
  writes it; our code and our hook do. Lifting the Better Auth pin must
  keep the hook refusing the field and the default keeping every
  workspace Better Auth creates a club.
- **Under 15 goes through a parent.** A 14-year-old who wants to start
  alone needs a parent's application. Asking only a birth year means a
  child born in 2011 may apply from 1 January 2026, some months before
  their fifteenth birthday; asking for a date of birth would be more
  personal data for a few months' precision.
- **The parent of a child is the coach.** In the parent's own workspace
  the parent plans and sees everything a coach sees. A rider's choices
  about what parents see (ADR 0011) apply to guardians, and the parent
  here is the owner, not a guardian; the child, once they have joined,
  sees their own training as any rider does.
- **The workspace is named after the rider's first name** without being
  asked. It can be renamed like any workspace; the deletion's typed name
  is that name.
- **The open registration form (`SIGNUP=open`) stays club-only.** A
  personal workspace comes through an approved application or the
  owner's invitation; self-service for individuals with a confirmed
  address is door 2 of the plan (backlog S-08), after mail.
- **A person's season plan still starts from a DCU class-year.** For
  "youth" and "senior" the person picks one and changes the hours to
  their own; no adult corridor is invented.
