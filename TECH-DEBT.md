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

### A rider cannot yet have their own trail erased

Deleting a rider deletes their rows by cascade, but the audit trail keeps
the before-images of their check-ins and training until the whole team is
deleted (`delete_workspace` purges it). A rider's right to erasure needs
a `delete_rider` definer function that purges the trail for that rider's
rows, like the workspace one. Planned for wave 4.

### Docs still describe Plot in places

`docs/deploy.md`, `docs/launch.md`, `docs/subprocessors.md` and
`docs/haij-tool-card.md` came with the foundation and name portfolio
examples. They are rewritten for Kadence in wave 4, when there is a
product to launch and a model call to list.

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

### One team per rider

A rider on a club team and a national squad at once needs two accounts
(ADR 0010). Whether real riders need more is for the first winter to say.

## Paid

Nothing yet.
