# ADR 0079: A user manual as a document — one page under public/, and a PDF rendered by hand

Status: accepted · Date: 2026-10-09

## Context

On 9 October 2026 Martin asked for a good-looking user manual for
Kadence that can be downloaded as a PDF. Kadence already explains itself
in two places: the help page, built from `messages` and always current,
and the two guides for coaches and parents. Neither is a document a
coach can hand out at a parents' meeting, print for the clubhouse wall,
or read on a sofa with pictures of what the screens look like.

The house pattern for paper is the programmes' (ADR 0067): a page with a
print stylesheet, and "the PDF is the browser's own print". That gives
an always-current print, but not a file to link to, and the browser's
print of a long app page is not a designed document with a cover,
contents and page numbers.

## Decision

- **The manual is a document, not a page of the app.** It lives at
  `public/brugervejledning/index.html` with its pictures beside it, in
  Danish, written by hand in Kadence's own words and look: the paper, the
  moss and Archivo from the app's own font files, laid out for A4 as much
  as for a screen, with a cover, a contents list, eight chapters by role,
  the words, and who sees what. It names no real person; its pictures
  are taken from a seeded team.
- **The PDF is rendered by hand, with a Chrome of the machine, and
  committed.** `scripts/manual-pdf.ts` drives a local Chrome over the
  DevTools protocol — Node's own fetch and WebSocket, no npm package, no
  Chromium in the image, nothing at build time — and writes
  `public/brugervejledning/kadence-brugervejledning.pdf`. Whoever changes
  the manual runs the script and commits the PDF with it;
  `tests/guides/manual.test.ts` holds the page, its pictures, its
  contents and the PDF together, and the links on Viden og hjælp to files
  that exist.
- **Viden og hjælp opens with it**: a card to the PDF, and under it the
  page on screen. Both are plain files under `public/`, reachable without
  signing in, as the open guides are (ADR 0047); the manual holds no
  data about anyone.

## Trade-offs accepted

- **Danish only.** The interface has English too, but the manual is for
  Danish clubs first; an English manual is a second document when a
  team needs it, not a second set of message keys.
- **It can go stale.** The help page is built from the same words the
  interface uses and moves with it; the manual is a snapshot with a
  version and a month on its cover, and the pictures age with the
  screens. The script makes refreshing it a minute's work, and the test
  keeps the PDF from being forgotten when the page changes.
- **A binary in the repository.** About two megabytes of PDF and
  pictures per edition, in `public/` and so in the image. Kept small on
  purpose — a few pictures per chapter at 1200 px — and worth it for a
  file a coach can send.
- **Not from messages.** The manual repeats what the help says in its own
  voice rather than being assembled from `messages/da.json`; assembling a
  document from message keys would give neither the layout nor the
  reading order a manual needs.
