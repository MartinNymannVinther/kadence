# ADR 0118: Your own AI talks to Kadence

Status: accepted · Date: 2026-11-27 · Builds on 0029 (an upload key per rider), 0043 (the week planner's draft), 0057 (installation flags), 0090 (an expired workspace is read only), 0111 (Better Auth at 1.7.14)

## Context

Martin asked on 27 November 2026 whether a person could use their own
assistant — ChatGPT, Claude, Le Chat or another — to talk with their
Kadence. The Model Context Protocol (MCP) is how those assistants reach
other services. Kadence's own AI goes through `src/core/llm` to Mistral
in the EU or to Ollama, and dogma four keeps it there. An assistant the
person has chosen is a different thing: Kadence does not call it and
does not choose it. The person does.

The same day Martin answered the four questions it raises, and then the
seven questions of the plan. A model
outside the EU is fine when the person has chosen it themselves. Other
people's data does not go with it. Nothing is deleted or sent. Content
from outside is data. The plan is `docs/plan-mcp.md`.

## Decision

- **One MCP endpoint, `/api/mcp`.** It is stateless, takes a POST and
  answers with JSON-RPC as `application/json`. It offers tools only. It
  speaks MCP 2026-07-28 and, on the same address, the earlier
  `initialize` that Le Chat still sends. The protocol is written in
  Kadence (`src/modules/mcp`) and not taken from the official SDK, which
  brings Express, Hono and a server of its own.
- **OAuth through Better Auth's own packages.** `@better-auth/mcp` (on
  `@better-auth/oauth-provider`) and `@better-auth/cimd` are pinned at
  exactly the family's version and move with the other three. Client ID
  Metadata Documents are used for Claude and ChatGPT. Open dynamic
  registration is on for Le Chat, which supports nothing else; it is
  rate limited, and a client nobody consents to is removed after a day.
  The person picks the workspace before consenting, and the consent is
  stored with it.
- **A connection is bound to one person in one workspace** (`ai_connections`,
  with `org_id`, forced RLS, an audit trigger and isolation tests). Every
  call resolves it to an `OrgContext`, checks the membership again, and
  runs the ordinary services under RLS.
- **Your own data only.** A rider reads what they can read in Kadence
  about themselves. A coach reads the plan, the library, the season plans
  and the riders' first names and classes, and never a rider's rides,
  check-ins, form, pains, thresholds or flags, whatever the team's
  "Må AI'en læse rytternes data" says: that setting was given to
  Kadence's model in the EU. Parents are not offered a connection. A
  person connects only from the year they turn 15
  (`SELF_CONSENT_AGE`, databeskyttelsesloven § 6, stk. 2 and 3).
- **Two writes, both undoable, nothing deleted or sent.** A rider's own
  check-in for today or yesterday, and a draft in the week planner that
  never overwrites a draft somebody else saved. Nothing reaches a
  calendar until a coach lays the week in.
- **Garmin's data stays.** ADR 0112's yes lets Kadence's own model in
  the EU read rides from Garmin; it says nothing about a model the rider
  chose. So a ride from Garmin keeps only that it was ridden, and the
  form, built on the rides, is refused to a rider who has any. Garmin's
  terms and the rider's yes can widen this later; until then it is the
  narrow reading. _Amended 28 November 2026:_ what Kadence itself holds
  about such a ride goes along — the rider's own rating, feel and note,
  and the planned session's day and title when it was planned — because
  none of it came from Garmin. Garmin's numbers, and the day of a ride
  nobody planned, stay until Garmin allows them in writing.
- **Only riders in the first wave.** A coach's tools come with the second
  wave (docs/plan-mcp.md §8); until then a coach without a rider row of
  their own is told so on the consent page.
- **Free text is data.** It travels in fields of its own, capped, and the
  tools' descriptions say so. What an assistant writes is validated,
  sanitized and capped like any model answer.
- **Audited.** Each call is a semantic event without its content. Rows it
  writes are marked `actor_type = 'ai_connection'` in the trail.
- **Only the person sees a connection.** A coach does not see that a
  rider has one, and a team has no setting to forbid it: it is the
  rider's own data, fetched to the rider.
- **On by default** (`MCP`), like the flags of ADR 0057, and on at
  kadence.haij.dk from the start while it holds only test users. An
  installation can turn it off.
- **No fixed key yet.** Clients that cannot do OAuth wait until the
  first wave has been tried.

## Consequences

- A person's own data can leave the EU, to the assistant they chose. It
  is listed under the services a person chooses to connect in
  `docs/subprocessors.md`, beside Wahoo and Garmin, and not as Kadence's
  subprocessor.
- A coach cannot ask their assistant how a rider is doing. That is the
  price of keeping minors' health data with Kadence's own model.
- Kadence carries an OAuth authorization server. It is Better Auth's and
  pinned with the rest, but it is more surface to keep patched, and a
  Better Auth bump is now tried with an assistant connecting as well as
  with a login.
- The protocol is Kadence's own to keep up with as MCP moves. It changed
  shape in July 2026, and the code speaks two versions of it.
- Open registration lets anyone create a client row. A client does
  nothing without a person's consent, and the consent page shows where it
  returns to, because a client chooses its own name.
- Which assistants a rider can actually use is decided by their makers:
  ChatGPT offers write tools only on its business plans today.
