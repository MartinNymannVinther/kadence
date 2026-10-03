import { RACE_RULES } from "./races";

/**
 * The biggest gear DCU allows on the road for the young classes, in
 * metres per pedal revolution. DCU's sporting rules 2026
 * (Sporstlige_regler_2026, "Endelig version" of 17 February 2026),
 * chapter 7: U17 § 1.15-4, U15 § 1.16-5, U13 § 1.17-4, U11 § 1.18-4.
 * The limits have stood since the 2023 season, when DCU raised them as
 * the UCI dropped the junior limit of 7.93 m (UCI Part 2 art. 2.2.023,
 * "abrogated on 1.01.23"); U19 rides with free gearing ("U19/U19P: Fri
 * gearing", Information_om_nye_BU_gearinger_2023.pdf). Research:
 * docs/research/klasser-og-gearing.md, section 3.2.
 *
 * U17 is read from RACE_RULES, so the calculator and the coach's tips
 * cannot disagree. The rules also forbid riding with "låst gear" in
 * every one of these classes.
 *
 * Pure: imports nothing from the database.
 */

export type GearClass = "U11" | "U13" | "U15" | "U17" | "U19";

export const GEAR_CLASSES: readonly GearClass[] = ["U11", "U13", "U15", "U17", "U19"];

const RULES = "Sporstlige_regler_2026 ch. 7";

export const YOUTH_GEARING: Record<GearClass, { limitM: number | null; source: string }> = {
  U11: { limitM: 6.18, source: `${RULES} § 1.18-4` },
  U13: { limitM: 6.18, source: `${RULES} § 1.17-4` },
  U15: { limitM: 6.68, source: `${RULES} § 1.16-5` },
  U17: { limitM: RACE_RULES.U17.gearingM, source: `${RULES} § 1.15-4` },
  U19: {
    limitM: null,
    source: "Information_om_nye_BU_gearinger_2023.pdf; UCI Part 2 art. 2.2.023 abrogated 1.1.2023",
  },
};
