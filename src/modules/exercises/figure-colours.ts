import type { FigureTone } from "./figure-style";

/**
 * The figure's colours are Kadence's own tokens (src/app/theme.css), in
 * light and dark mode alike:
 *
 * - ink, the figure: `--foreground`, 14:1 on the panel in light mode and 13:1 in dark.
 * - accent, the arrows and the dose: `--warning`, the clay ink of the light
 *   palette (6.0:1 on the panel, 6.7:1 on the card) and the warm amber of
 *   the dark one (7.9:1 and 9.0:1), which is the reference drawing's orange.
 *   The lighter clay of `--chart-4` reads 2.8:1 on the light panel, too
 *   faint for the dose's words.
 * - ground, the floor and the wall: `--chart-3`, the paper's sand, quiet on
 *   purpose (1.6:1 light, 2.0:1 dark); it places the figure and says nothing.
 * - prop, what is used: `--label`, a mid grey (4.6:1 light, 4.7:1 dark), so a
 *   bench or a kettlebell is plain to see without competing with the figure.
 *
 * The panel behind the figure is `--secondary`, a step darker than the card
 * in light mode and a step lighter in dark, as in the reference.
 */
export type FigureColours = Record<FigureTone, string>;

export const FIGURE_TOKENS: Readonly<Record<FigureTone | "panel", `--${string}`>> = {
  ink: "--foreground",
  accent: "--warning",
  ground: "--chart-3",
  prop: "--label",
  panel: "--secondary",
};

/** For `figureSvg` inside a page that carries Kadence's stylesheet. */
export const FIGURE_CSS_VARS: FigureColours = {
  ink: `var(${FIGURE_TOKENS.ink})`,
  accent: `var(${FIGURE_TOKENS.accent})`,
  ground: `var(${FIGURE_TOKENS.ground})`,
  prop: `var(${FIGURE_TOKENS.prop})`,
};

/**
 * The same tokens' values, for a file that carries no stylesheet of
 * Kadence's (the downloaded programme). Copied from src/app/theme.css;
 * tests/exercises/figure.test.ts proves they still agree.
 */
export const FIGURE_PALETTE: Readonly<Record<"light" | "dark", FigureColours & { panel: string }>> =
  {
    light: {
      ink: "oklch(0.245 0.008 75)",
      accent: "oklch(0.475 0.075 55)",
      ground: "oklch(0.8 0.012 85)",
      prop: "oklch(0.53 0.008 82)",
      panel: "oklch(0.953 0.007 85)",
    },
    dark: {
      ink: "oklch(0.94 0.006 85)",
      accent: "oklch(0.8 0.085 62)",
      ground: "oklch(0.45 0.01 82)",
      prop: "oklch(0.65 0.008 82)",
      panel: "oklch(0.27 0.006 82)",
    },
  };
