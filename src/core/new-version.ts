/**
 * Whether the server now runs another build than the page was served by.
 * A page left open across a deploy calls server functions the new build
 * does not know, and Next answers with "Failed to find Server Action";
 * the person only sees that something went wrong. Comparing the build's
 * time, which every build sets (`KADENCE_BUILT_AT`), says so before they
 * press save. Without a build time on either side (development) nothing
 * is said. Pure.
 */
export function isNewBuild(pageBuiltAt: string, serverBuiltAt: unknown): boolean {
  return (
    pageBuiltAt.length > 0 &&
    typeof serverBuiltAt === "string" &&
    serverBuiltAt.length > 0 &&
    serverBuiltAt !== pageBuiltAt
  );
}
