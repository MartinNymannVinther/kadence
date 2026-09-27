import { basisParts, isClassBasis } from "@/modules/dcu";

/**
 * A column of DCU's table in words — "U19 1. år" — from its basis,
 * "U19-1". An unknown basis reads as nothing rather than as its code.
 */
type Translate = (key: "basis", values: Record<string, string | number>) => string;

export function basisText(basis: string | null | undefined, t: Translate): string {
  if (!isClassBasis(basis)) return "";
  const { category, yearInClass } = basisParts(basis);
  return t("basis", { category, year: yearInClass });
}
