import { describe, expect, it } from "vitest";
import { ageInYear, mayApplyForThemselves, SELF_CONSENT_AGE } from "@/core/access/age";
import { firstName, personalProblem, workspaceNameKey } from "@/core/access/personal";

/**
 * The pure rules of a personal application (docs/adr/0080): the age a
 * person may apply for themselves at — 15 in Denmark, databeskyttelsesloven
 * § 6, stk. 2 and 3 (lov nr. 1783 af 28. december 2023) — what else makes
 * an application whole, and how the workspace is named.
 */

const YEAR = 2026;

describe("the age a person may apply for themselves at", () => {
  it("is 15, in the year they turn it", () => {
    expect(SELF_CONSENT_AGE).toBe(15);
    expect(ageInYear(2011, 2026)).toBe(15);
    expect(mayApplyForThemselves(2011, 2026)).toBe(true);
    expect(mayApplyForThemselves(2012, 2026)).toBe(false);
    expect(mayApplyForThemselves(2013, 2026)).toBe(false);
    expect(mayApplyForThemselves(1980, 2026)).toBe(true);
    expect(mayApplyForThemselves(2011.5, 2026)).toBe(false);
  });

  it("refuses 'me' under 15, lets a parent apply for a child of any rider age, and wants the child's name", () => {
    const me = { forWhom: "me" as const, childName: null, childEmail: null };
    expect(personalProblem({ ...me, birthYear: YEAR - 13 }, YEAR)).toBe("tooYoung");
    expect(personalProblem({ ...me, birthYear: YEAR - 14 }, YEAR)).toBe("tooYoung");
    expect(personalProblem({ ...me, birthYear: YEAR - 15 }, YEAR)).toBeNull();
    expect(personalProblem({ ...me, birthYear: YEAR - 17 }, YEAR)).toBeNull();
    expect(personalProblem({ ...me, birthYear: 1800 }, YEAR)).toBe("birthYear");
    const child = { forWhom: "child" as const, birthYear: YEAR - 10, childEmail: null };
    expect(personalProblem({ ...child, childName: "Ida Berg" }, YEAR)).toBeNull();
    expect(personalProblem({ ...child, childName: null }, YEAR)).toBe("childName");
  });

  it("names a workspace by the first name, with Danish's apostrophe after s, x and z", () => {
    expect(firstName("  Anne Sofie Holm ")).toBe("Anne");
    expect(workspaceNameKey("Emma")).toBe("workspaceName");
    expect(workspaceNameKey("Lars")).toBe("workspaceNameSibilant");
    expect(workspaceNameKey("Max")).toBe("workspaceNameSibilant");
  });
});
