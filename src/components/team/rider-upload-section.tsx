import { useTranslations } from "next-intl";
import { FitUpload } from "@/components/activities/fit-upload";

/** A coach's upload of a rider's ride on the rider's page. */
export function RiderUploadSection({ riderId }: { riderId: string }) {
  const t = useTranslations("riders.sections");
  return (
    <section aria-labelledby="rider-upload" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="rider-upload" className="text-lg font-semibold">
          {t("upload")}
        </h2>
        <p className="text-meta text-2sm">{t("uploadBody")}</p>
      </div>
      <FitUpload riderId={riderId} compact />
    </section>
  );
}
