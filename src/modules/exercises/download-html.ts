import type { Translate } from "./dose";
import { formatDose } from "./dose";
import { downloadScript } from "./download-script";
import { DOWNLOAD_STYLE } from "./download-style";
import { figureSvg } from "./figure-svg";
import { FIGURE_CSS_VARS } from "./figure-colours";
import { escapeHtml } from "./html-escape";
import type { Dose, ExerciseView, PartKey, ProgramView } from "./types";

/**
 * A programme as one self-contained HTML file (docs/plan-ovelser-og-programmer.md):
 * Kadence's own colours in light and dark through the file's own stylesheet
 * (download-style.ts), tabs per part in pure CSS, numbered cards with a
 * figure, the dose, how, why and a "Færdig" button that remembers its
 * state (download-script.ts). No external file is read, fetched or
 * linked; the only script is the one above, and it reaches nowhere but
 * `localStorage`.
 *
 * Every piece of free text — an exercise's name, its "how" and "why", a
 * team's own description — is escaped on its way in (html-escape.ts); the
 * figure's SVG carries only numbers (figure-svg.ts) and is `aria-hidden`,
 * labelled instead by the card around it.
 *
 * Pure: a `ProgramView` and a translator in, a string out.
 */

export type RenderOptions = {
  t: Translate;
  locale: "da" | "en";
  /** What this was downloaded as (`builtin:<id>`, `team:<uuid>`, or the `c` composition) — the "Færdig" state's key. */
  programKey: string;
  /** For the footer's date; the caller's clock, so a test can hand in a fixed one. */
  now?: Date;
};

function cardHtml(
  item: { exercise: ExerciseView; dose: Dose },
  number: number,
  cardId: string,
  t: Translate,
): string {
  const svg = figureSvg(item.exercise.pose, FIGURE_CSS_VARS);
  const label = escapeHtml(t("figure.label", { name: item.exercise.name }));
  const why = item.exercise.why ? `<p class="why">${escapeHtml(item.exercise.why)}</p>` : "";
  return (
    `<article class="card">` +
    `<div class="figure" role="img" aria-label="${label}">${svg}</div>` +
    `<div class="body">` +
    `<div class="headline"><h3><span class="num">${number}.</span>${escapeHtml(item.exercise.name)}</h3>` +
    `<p class="dose">${escapeHtml(formatDose(item.dose, t))}</p></div>` +
    `<p class="how">${escapeHtml(item.exercise.how)}</p>${why}` +
    `<button type="button" class="done-btn" aria-pressed="false" data-card-id="${escapeHtml(cardId)}">${escapeHtml(t("card.done"))}</button>` +
    `</div></article>`
  );
}

function tabHtml(key: PartKey, index: number, t: Translate): string {
  const checked = index === 0 ? " checked" : "";
  return (
    `<input type="radio" id="part-${index}" name="part" class="tab-input"${checked}>` +
    `<label for="part-${index}" class="tab">${escapeHtml(t(`parts.${key}`))}</label>`
  );
}

/** A tabbed part: its name is for paper only, where the tabs are not shown (download-style.ts). */
function partHtml(
  part: ProgramView["parts"][number],
  index: number,
  tabbed: boolean,
  t: Translate,
): string {
  const cards = part.items
    .map((item, i) => cardHtml(item, i + 1, `${part.key}:${i}:${item.exercise.ref}`, t))
    .join("");
  return tabbed
    ? `<div class="panel" id="panel-${index}"><h2 class="part-title">${escapeHtml(t(`parts.${part.key}`))}</h2><div class="cards">${cards}</div></div>`
    : `<div class="part">${cards}</div>`;
}

function footerDate(locale: "da" | "en", now: Date): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Copenhagen",
  }).format(now);
}

/** The whole downloaded file, as a string ready to serve with `Content-Type: text/html`. */
export function renderProgramHtml(program: ProgramView, options: RenderOptions): string {
  const { t, locale, programKey, now = new Date() } = options;
  const title = escapeHtml(program.title);
  const intro = program.description
    ? `<p class="intro">${escapeHtml(program.description)}</p>`
    : "";
  const tabbed = program.parts.length > 1;
  const tabs = tabbed
    ? `<div class="tabs-shell">${program.parts.map((part, i) => tabHtml(part.key, i, t)).join("")}${program.parts
        .map((part, i) => partHtml(part, i, tabbed, t))
        .join("")}</div>`
    : program.parts.map((part, i) => partHtml(part, i, tabbed, t)).join("");

  return (
    "<!doctype html>" +
    `<html lang="${locale}"><head>` +
    `<meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${title}</title>` +
    `<style>${DOWNLOAD_STYLE}</style>` +
    `</head><body><div class="wrap">` +
    `<header><h1>${title}</h1>${intro}</header>` +
    tabs +
    `<footer>Kadence · ${escapeHtml(footerDate(locale, now))}</footer>` +
    `</div><script>${downloadScript(programKey)}</script></body></html>`
  );
}
