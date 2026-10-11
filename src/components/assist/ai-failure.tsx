import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AiFailure as Failure } from "@/modules/ai/wire";

/**
 * Why the AI did not answer, in plain words, with the way to fix it where
 * there is one: no model (Indstillinger → AI), or a team that has not let
 * the AI read riders' data (Indstillinger → Holdet). Everything else in
 * Kadence goes on working either way.
 */
export function AiFailureText({ error }: { error: Failure | string }) {
  const t = useTranslations("assist.errors");
  if (error === "noModel")
    return (
      <p className="text-2sm leading-relaxed">
        {t("noModel")}{" "}
        <Link
          href="/settings/ai"
          className="focus-ring text-primary font-medium underline-offset-4 hover:underline"
        >
          {t("noModelLink")}
        </Link>
      </p>
    );
  if (error === "notAllowed")
    return (
      <p className="text-2sm leading-relaxed">
        {t("notAllowed")}{" "}
        <Link
          href="/settings/team"
          className="focus-ring text-primary font-medium underline-offset-4 hover:underline"
        >
          {t("notAllowedLink")}
        </Link>
      </p>
    );
  const known = [
    "rateLimited",
    "budget",
    "unreachable",
    "badAnswer",
    "notFound",
    "invalid",
    "unauthorized",
    "unreadable",
  ];
  return (
    <p className="text-2sm leading-relaxed">
      {t(known.includes(error) ? (error as "rateLimited") : "generic")}
    </p>
  );
}
