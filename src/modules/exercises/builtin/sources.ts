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
  /** Lifts with a barbell, dumbbells or a kettlebell: technique first, start light, a coach watches. */
  freeWeights:
    "Lifts with free weights take time to learn, so technique comes before load (Team Danmark, ATK 2.0, pp. 56–57; 'Teknik før belastning', DCU_U17_styrketraening.pdf p. 2); learn them light, and with a qualified coach watching (Lloyd et al. 2014, the international consensus on youth resistance training, Br J Sports Med 48(7):498–505; Faigenbaum et al. 2009, the NSCA's position statement, J Strength Cond Res 23(5 Suppl))",
  /** DCU's squat and its cues, in all three programmes. */
  dcuSquat:
    "DCU's squat (Deep back squat 03553): a straight back or a slight arch, knees in line with the feet, feet shoulder-width apart; 1 × 20 at a low load is the warm-up in all three programmes, and in U19 (4 × 6 RM once the technique is there) and U23 (3 × 10–12 RM to begin) it is an exercise of its own (DCU_U17/U19/U23_styrketraening.pdf p. 1; docs/research/dcu-traeningsanbefalinger.md, sections 6.2–6.4)",
  /** DCU's start-up for the leg exercises. */
  dcuStartUp:
    "DCU's start-up: 3 × 16 in U17's sessions 1–6 and 3 × 12 in U19's sessions 1–4, 'træn ikke til udmattelse', before the load goes up (DCU_U17_styrketraening.pdf p. 1–2; DCU_U19_styrketraening.pdf p. 1–2)",
  /** The side bridge and the bird dog. */
  mcGill:
    "one of McGill's 'big three' for the trunk (S. McGill, Low Back Disorders, 3rd ed., Human Kinetics 2016)",
} as const;
