import { FIGURE_PALETTE, FIGURE_TOKENS } from "./figure-colours";
import { PART_KEYS } from "./types";

/**
 * The downloaded programme's own stylesheet (docs/plan-ovelser-og-programmer.md):
 * no external file, no net fonts, Kadence's colours in light and dark
 * through `prefers-color-scheme`. The figure's own tokens — `--foreground`,
 * `--warning`, `--chart-3`, `--label`, `--secondary` — are defined here
 * under their real names and FIGURE_PALETTE's values, so `figureSvg` can be
 * called with the ordinary `FIGURE_CSS_VARS` and the same drawing follows
 * the mode (figure-svg.ts, figure-colours.ts). A few extra variables, named
 * for what they are rather than for Kadence's own tokens, carry the rest of
 * the page's colour; their values are copied from src/app/theme.css.
 *
 * A fixed string: the tab rules are written out for every part key once,
 * whether or not a given download uses them all, so this needs no
 * parameter and no per-request work.
 *
 * Printed (or saved as a PDF) the file is light whatever the screen's
 * mode, shows every part under its name instead of the tabs, two cards
 * to a row, keeps a card whole and a part's name with its first cards,
 * draws the figure smaller and leaves the "Færdig" buttons out — the same
 * sheet the app prints (src/components/exercises/program-print.tsx).
 *
 * Pure.
 */

const EXTRA = {
  light: {
    background: "oklch(0.968 0.006 85)",
    card: "oklch(0.994 0.004 90)",
    border: "oklch(0.918 0.008 85)",
    "muted-foreground": "oklch(0.5 0.008 80)",
  },
  dark: {
    background: "oklch(0.185 0.006 80)",
    card: "oklch(0.225 0.006 82)",
    border: "oklch(1 0 0 / 9%)",
    "muted-foreground": "oklch(0.7 0.008 82)",
  },
} as const;

function vars(mode: "light" | "dark"): string {
  const palette = FIGURE_PALETTE[mode];
  const figureVars = (Object.keys(FIGURE_TOKENS) as Array<keyof typeof FIGURE_TOKENS>)
    .map((key) => `${FIGURE_TOKENS[key]}:${palette[key]};`)
    .join("");
  const extraVars = Object.entries(EXTRA[mode])
    .map(([name, value]) => `--${name}:${value};`)
    .join("");
  return figureVars + extraVars;
}

/** `#part-0:checked ~ #panel-0`, `#part-1:checked ~ #panel-1`, … for every possible part. */
const TAB_RULES = PART_KEYS.map((_, i) => `#part-${i}:checked~#panel-${i}{display:block}`).join("");

export const DOWNLOAD_STYLE = `
:root{color-scheme:light dark;${vars("light")}}
@media (prefers-color-scheme:dark){:root{${vars("dark")}}}
*{box-sizing:border-box}
html,body{margin:0;background:var(--background);color:var(--foreground)}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.5}
.wrap{max-width:46rem;margin:0 auto;padding:1.5rem 1rem 3rem}
h1{font-size:1.5rem;line-height:1.25;margin:0 0 .4rem}
.intro{margin:0 0 1.5rem;color:var(--muted-foreground)}
.tabs-shell{display:block}
.tab-input{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}
.tab{display:inline-flex;min-height:2.5rem;align-items:center;justify-content:center;margin:0 .4rem .6rem 0;padding:0 1.1rem;border-radius:999px;border:1px solid var(--border);font-weight:600;font-size:.9rem;cursor:pointer}
.tab-input:checked+.tab{background:var(--warning);border-color:var(--warning);color:var(--card)}
.tab-input:focus-visible+.tab{outline:2px solid var(--warning);outline-offset:2px}
.panel{display:none}
${TAB_RULES}
.cards,.part{display:grid;gap:1rem}
@media (min-width:40rem){.cards,.part{grid-template-columns:repeat(2,1fr)}}
.card{display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border);border-radius:.9rem;background:var(--card)}
.card .figure{background:var(--secondary);padding:.75rem 1rem 0}
.card .figure svg{display:block;width:100%;height:auto;max-width:22rem;margin:0 auto}
.card .body{display:flex;flex-direction:column;gap:.6rem;padding:1rem 1.1rem}
.headline{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:.75rem .5rem}
.headline h3{margin:0;font-size:1rem;line-height:1.35;font-weight:600}
.headline .num{color:var(--warning);margin-right:.3rem;font-variant-numeric:tabular-nums}
.dose{margin:0;white-space:nowrap;font-weight:600;color:var(--warning);font-variant-numeric:tabular-nums}
.how{margin:0;line-height:1.5}
.why{margin:0;font-size:.9rem;line-height:1.5;color:var(--muted-foreground)}
.done-btn{align-self:flex-start;min-height:2.5rem;min-width:6rem;padding:0 1.1rem;border-radius:999px;border:2px solid var(--warning);background:transparent;color:var(--warning);font-size:.9rem;font-weight:600;cursor:pointer}
.done-btn[aria-pressed="true"]{background:var(--warning);color:var(--card)}
.part-title{display:none;margin:0 0 .6rem;font-size:1.15rem;line-height:1.3}
footer{margin-top:2rem;font-size:.8rem;color:var(--muted-foreground)}
@media print{
:root{${vars("light")}}
@page{margin:14mm}
html{font-size:13.5px}
.wrap{max-width:none;padding:0}
.tab-input,.tab,.done-btn{display:none}
.panel{display:block;margin-bottom:1.25rem}
.part-title{display:block;break-after:avoid}
.cards,.part{grid-template-columns:repeat(2,1fr);gap:.75rem}
.card{break-inside:avoid}
.card .figure{padding-top:.5rem}
.card .figure svg{max-width:12rem}
.card .body{gap:.5rem;padding:.9rem}
}
`;
