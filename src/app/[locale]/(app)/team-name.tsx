/** The club's logo, when it has one (ADR 0048), and the team's name. */
export function TeamName({ organization, logo }: { organization: string; logo: string | null }) {
  return (
    <>
      {logo ? (
        // The image is the club's own, served behind its login; next/image
        // would fetch it without the session and get nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="size-4 shrink-0 rounded-sm object-contain" />
      ) : null}
      <span className="truncate">{organization}</span>
    </>
  );
}
