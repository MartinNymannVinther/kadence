import { useTranslations } from "next-intl";
import type { TeamPhoto } from "@/modules/teams/types";

/**
 * A team's photograph from Wikimedia Commons, served by Kadence from its
 * own copy (ADR 0072), with the credit its licence asks for: who took
 * it and under what licence, linked to the file's page on Commons.
 */
export function TeamPhotoFigure({
  id,
  name,
  photo,
}: {
  id: string;
  name: string;
  photo: TeamPhoto;
}) {
  const t = useTranslations("guides.teams");
  return (
    <figure className="flex flex-col gap-1">
      {/* The copy is Kadence's own file, not a remote image; next/image would add nothing. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/teams/photo/${id}`}
        alt={t("photoAlt", { name })}
        width={photo.width}
        height={photo.height || undefined}
        loading="lazy"
        className="border-border max-h-44 w-auto max-w-full rounded-lg border object-cover"
      />
      <figcaption className="text-meta text-2xs">
        {t("photoCredit", {
          artist: photo.artist || t("photoUnknownArtist"),
          licence: photo.licence,
        })}{" "}
        <a
          href={photo.pageUrl}
          target="_blank"
          rel="noopener noreferrer license"
          className="focus-ring text-primary hover:underline"
        >
          Wikimedia Commons
        </a>
      </figcaption>
    </figure>
  );
}
