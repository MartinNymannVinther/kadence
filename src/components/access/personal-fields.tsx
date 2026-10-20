"use client";

import { useTranslations } from "next-intl";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { mayApplyForThemselves } from "@/core/access/age";
import type { ForWhom } from "@/core/access/personal";
import { todayInCopenhagen } from "@/core/dates";
import { ChoiceRadios } from "./choice-radios";

/** What the form holds for a personal workspace, as typed. */
export type PersonalDraft = {
  forWhom: ForWhom;
  birthYear: string;
  childName: string;
  childEmail: string;
};

export const EMPTY_PERSONAL: PersonalDraft = {
  forWhom: "me",
  birthYear: "",
  childName: "",
  childEmail: "",
};

/** The draft as the server's fields (src/core/access/personal.ts). */
export function personalPayload(draft: PersonalDraft) {
  return {
    forWhom: draft.forWhom,
    birthYear: Number(draft.birthYear),
    childName: draft.forWhom === "child" ? draft.childName : "",
    childEmail: draft.forWhom === "child" ? draft.childEmail : "",
  };
}

/**
 * Whether a person typed a year that makes them too young to apply for
 * themselves (src/core/access/age.ts): the form says so plainly and does
 * not send. The server asks again.
 */
export function tooYoung(draft: PersonalDraft): boolean {
  if (draft.forWhom !== "me" || !/^\d{4}$/.test(draft.birthYear)) return false;
  return !mayApplyForThemselves(Number(draft.birthYear), Number(todayInCopenhagen().slice(0, 4)));
}

/**
 * For whom a personal workspace is, and the rider's birth year: the
 * applicant's own, or a child's with the child's name and, if the parent
 * has it, the child's address. Used by the application and by the
 * owner's direct invitation (docs/adr/0080).
 */
export function PersonalFields({
  idPrefix,
  draft,
  onChange,
}: {
  idPrefix: string;
  draft: PersonalDraft;
  onChange: (draft: PersonalDraft) => void;
}) {
  const t = useTranslations("auth.apply");
  const set = (patch: Partial<PersonalDraft>) => onChange({ ...draft, ...patch });
  const child = draft.forWhom === "child";
  const year = (id: string, label: string) => (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        inputMode="numeric"
        pattern="\d{4}"
        required
        maxLength={4}
        value={draft.birthYear}
        onChange={(e) => set({ birthYear: e.target.value.trim() })}
        className="max-w-32"
      />
      <FieldDescription>{t("birthYearHint")}</FieldDescription>
    </Field>
  );

  return (
    <>
      <ChoiceRadios
        legend={t("forWhomLegend")}
        value={draft.forWhom}
        onChange={(forWhom) => set({ forWhom })}
        options={[
          { value: "me", label: t("forMe") },
          { value: "child", label: t("forChild") },
        ]}
      />
      {child ? (
        <>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-child-name`}>{t("childName")}</FieldLabel>
            <Input
              id={`${idPrefix}-child-name`}
              required
              maxLength={120}
              value={draft.childName}
              onChange={(e) => set({ childName: e.target.value })}
            />
          </Field>
          {year(`${idPrefix}-child-year`, t("childBirthYear"))}
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-child-email`}>{t("childEmail")}</FieldLabel>
            <Input
              id={`${idPrefix}-child-email`}
              type="email"
              value={draft.childEmail}
              onChange={(e) => set({ childEmail: e.target.value })}
            />
            <FieldDescription>{t("childEmailHint")}</FieldDescription>
          </Field>
        </>
      ) : (
        year(`${idPrefix}-year`, t("birthYear"))
      )}
      {tooYoung(draft) && (
        <p role="alert" className="border-border bg-warning-tint rounded-lg border p-3 text-2sm">
          {t("tooYoung")}
        </p>
      )}
    </>
  );
}
