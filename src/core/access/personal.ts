import { z } from "zod";
import { isBirthYear } from "@/modules/team/birth-year";
import { mayApplyForThemselves } from "./age";

/**
 * A personal workspace, as an application and its invitation describe it
 * (docs/adr/0080). One person's own training: the applicant's, or — for a
 * child under 15, who cannot apply alone (`age.ts`) — their child's, with
 * the parent as the workspace's owner. Pure apart from zod: the service,
 * the forms and the registration all ask the same questions here.
 */

export const WORKSPACE_KINDS = ["club", "personal"] as const;
export type WorkspaceKind = (typeof WORKSPACE_KINDS)[number];

export const FOR_WHOM = ["me", "child"] as const;
export type ForWhom = (typeof FOR_WHOM)[number];

/**
 * What a personal application holds beyond a club's. `birthYear` is the
 * rider's: the applicant's own for "me", the child's for "child". The
 * child's address is optional; with it the registration makes the link
 * the child joins by, as a coach's "Inviter rytter" does.
 */
export type PersonalSpec = {
  forWhom: ForWhom;
  birthYear: number;
  childName: string | null;
  childEmail: string | null;
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

/** The fields a form or the owner sends for a personal workspace. */
export const PersonalFields = z.object({
  forWhom: z.enum(FOR_WHOM),
  birthYear: z.coerce.number().int(),
  childName: optionalText(120),
  childEmail: z
    .union([z.email().max(320), z.literal("")])
    .optional()
    .nullable()
    .transform((v) => (v ? v.toLowerCase() : null)),
});

export type PersonalProblem = "birthYear" | "tooYoung" | "childName";

/**
 * What is wrong with a personal application, or null. The birth year is
 * the rider form's rule (birth-year.ts); a person under 15 cannot apply
 * for themselves; a child needs a name.
 */
export function personalProblem(spec: PersonalSpec, thisYear: number): PersonalProblem | null {
  if (!isBirthYear(spec.birthYear, thisYear)) return "birthYear";
  if (spec.forWhom === "me" && !mayApplyForThemselves(spec.birthYear, thisYear)) return "tooYoung";
  if (spec.forWhom === "child" && !spec.childName) return "childName";
  return null;
}

/** The columns of an application or invitation row that hold a personal workspace. */
export type PersonalColumns = {
  kind: string;
  birthYear: number | null;
  forWhom: string | null;
  childName: string | null;
  childEmail: string | null;
};

/** The personal workspace a row describes, or null for a club. */
export function personalSpecOf(row: PersonalColumns): PersonalSpec | null {
  if (row.kind !== "personal" || row.birthYear === null) return null;
  const forWhom: ForWhom = row.forWhom === "child" ? "child" : "me";
  return {
    forWhom,
    birthYear: row.birthYear,
    childName: forWhom === "child" ? row.childName : null,
    childEmail: forWhom === "child" ? row.childEmail : null,
  };
}

/** The columns to store for a club (`null`) or a personal workspace. */
export function personalColumns(spec: PersonalSpec | null): PersonalColumns {
  if (!spec)
    return { kind: "club", birthYear: null, forWhom: null, childName: null, childEmail: null };
  return {
    kind: "personal",
    birthYear: spec.birthYear,
    forWhom: spec.forWhom,
    childName: spec.forWhom === "child" ? spec.childName : null,
    childEmail: spec.forWhom === "child" ? spec.childEmail : null,
  };
}

/** The first word of a name, which is what a personal workspace is called by. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0]?.slice(0, 80) ?? "";
}

/**
 * Which message names a personal workspace. Danish puts only an
 * apostrophe after a name ending in s, x or z ("Lars' træning"), and an
 * s after any other ("Emmas træning"); the messages hold both forms.
 */
export function workspaceNameKey(first: string): "workspaceName" | "workspaceNameSibilant" {
  return /[sxz]$/i.test(first) ? "workspaceNameSibilant" : "workspaceName";
}

/** Whose first name a personal workspace is called by: the rider's. */
export function riderNameFor(spec: PersonalSpec, applicantName: string): string {
  return spec.forWhom === "child" && spec.childName ? spec.childName : applicantName;
}
