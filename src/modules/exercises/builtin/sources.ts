/**
 * Where the built-in exercises' doses and advice come from, written once
 * and named in each entry's `source`. Team Danmark's and DCU's material
 * (docs/research) first; a recognised source where they say nothing;
 * Kadence's own suggestion said plainly where it is one.
 */
export const SOURCES = {
  /** The hold and the weekly rhythm of a static stretch. */
  acsmStretch:
    "Static stretches held 10–30 s to mild tightness, about 60 s in all per exercise, on at least 2–3 days a week: ACSM, Garber et al. 2011, Med Sci Sports Exerc 43(7):1334–59",
  /** Strength training for young people: safe, and how much. */
  youthStrength:
    "Strength training is safe for young people and does not harm growth (Team Danmark, ATK 2.0, pp. 56–57; DCU_U17_styrketraening.pdf p. 2); 1–3 sets of 6–15 on 2–3 days a week (Faigenbaum et al. 2009, J Strength Cond Res 23(5 Suppl); Lloyd et al. 2014, Br J Sports Med 48(7):498–505)",
  /** DCU's own rules for a strength session (docs/research/dcu-traeningsanbefalinger.md, section 6). */
  dcuStrength:
    "DCU's strength programmes (Team Danmark, Jarl Pors Jakobsen, 2015): warm up 8 min on the bike and 1 × 20 squats, at least 48 h between sessions, technique before load, full effort up and control down, stretch afterwards (DCU_U17/U19/U23_styrketraening.pdf; U17 compendium p. 18, U19 p. 23)",
  /** The starting points of the strength builder's own exercises (src/modules/workouts/exercise-catalogue.ts, ADR 0044). */
  catalogue: "Kadence's own starting point, as in the strength builder's catalogue (ADR 0044)",
  /** The side bridge and the bird dog. */
  mcGill:
    "one of McGill's 'big three' for the trunk (S. McGill, Low Back Disorders, 3rd ed., Human Kinetics 2016)",
} as const;
