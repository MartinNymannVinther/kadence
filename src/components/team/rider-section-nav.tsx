import { useTranslations } from "next-intl";
import { SectionNav } from "@/components/common/section-nav";

/**
 * The parts of a rider's page for the coach, as a row under the title
 * (docs/adr/0077): the week and wellbeing, the form where there is one,
 * goals, records, the upload, and the profile with the thresholds. The
 * ids are the page's own section ids.
 */
export function RiderSectionNav({ hasForm }: { hasForm: boolean }) {
  const t = useTranslations("riders.sections");
  const common = useTranslations("common");
  return (
    <SectionNav
      label={common("sectionNav")}
      items={[
        { id: "rider-week", label: t("week") },
        ...(hasForm ? [{ id: "rider-form", label: t("form") }] : []),
        { id: "rider-goals", label: t("goals") },
        { id: "rider-records", label: t("records") },
        { id: "rider-upload", label: t("upload") },
        { id: "rider-profile", label: t("profile") },
      ]}
    />
  );
}
