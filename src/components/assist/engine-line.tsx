import { useTranslations } from "next-intl";

/** Who answered, under a proposal that does not wear the ProposalFrame: the model by name. */
export function EngineLine({ engine }: { engine: string }) {
  const t = useTranslations("assist");
  return <p className="text-meta text-2xs">{t("byModel", { engine })}</p>;
}
