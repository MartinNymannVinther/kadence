"use client";

import { createContext, useContext } from "react";

/**
 * Who is reading a session's explanation (ADR 0095): the rider whose own
 * calendar it is, or a coach, or someone else. The words say "Du kørte"
 * to the rider and "Rytteren kørte" to anybody else, and the hint about a
 * threshold set too low links to where this reader can propose one —
 * their own settings, or the rider's page for a coach. Only words and a
 * link follow from it; what anybody may read is still the database's to
 * decide.
 */
export type DeviationViewer = { ownRiderId: string | null; isCoach: boolean } | null;

const DeviationViewerContext = createContext<DeviationViewer>(null);

export function DeviationViewerProvider({
  viewer,
  children,
}: {
  viewer: DeviationViewer;
  children: React.ReactNode;
}) {
  return <DeviationViewerContext value={viewer}>{children}</DeviationViewerContext>;
}

export function useDeviationViewer(): DeviationViewer {
  return useContext(DeviationViewerContext);
}
