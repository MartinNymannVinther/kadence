"use client";

import { createContext, useContext } from "react";

/**
 * How many new rides one person may have kept in an hour on this
 * installation (`UPLOAD_FILES_PER_HOUR`, ADR 0019). The server holds the
 * limit; the upload's "Hent fra enheden" takes this many in one go so it
 * never sends more than the server keeps. Given by the app layout, which
 * reads the installation's setting; 60 when nothing gives it.
 */
const UploadLimit = createContext(60);

export function UploadLimitProvider({
  perHour,
  children,
}: {
  perHour: number;
  children: React.ReactNode;
}) {
  return <UploadLimit.Provider value={perHour}>{children}</UploadLimit.Provider>;
}

export function useUploadLimit(): number {
  return useContext(UploadLimit);
}
