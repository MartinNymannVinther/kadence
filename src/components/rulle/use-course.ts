"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  buildCourse,
  bundledRoute,
  DEFAULT_ROUTE,
  flatCourse,
  readLand,
  readRouteGpx,
  RouteError,
  ROUTE_LIMITS,
  ROUTES,
  type BundledRoute,
  type Course,
  type Land,
  type RouteErrorCode,
} from "@/modules/rulle";

/**
 * The route to ride: one of those that come with Kadence (ADR 0035),
 * fetched as the ordinary GPX file it is and read through the same import
 * as a rider's own (`readRouteGpx`, `buildCourse`), together with the real
 * land round it; or a GPX the rider picks, which is read here in the
 * browser and sent nowhere, and ridden through land made up from it. The
 * route chosen last is remembered on this device.
 *
 * Without Rulle's world (docs/adr/0057) there is nothing to choose and
 * nothing to fetch: the session is ridden on a flat road made in memory.
 */

export type CourseState =
  | { status: "loading" }
  | { status: "ready"; course: Course; own: boolean; land: Land | null }
  | { status: "error"; code: RouteErrorCode | "fetch"; own: boolean };

const REMEMBERED = "kadence.rulle.route";
const CHANGED = "kadence:rulle-route";

function read(xml: string, own: boolean, land: unknown = null): CourseState {
  try {
    const course = buildCourse(readRouteGpx(xml));
    // Land that does not fit the course is no land: the ride makes its own.
    return { status: "ready", course, own, land: land === null ? null : readLand(land, course) };
  } catch (error) {
    return { status: "error", code: error instanceof RouteError ? error.code : "corrupt", own };
  }
}

/** The land's file, or nothing: without it the route is ridden all the same. */
async function fetchLand(file: string | undefined): Promise<unknown> {
  if (!file) return null;
  try {
    const response = await fetch(file);
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

async function fetchBundled(route: BundledRoute): Promise<CourseState> {
  try {
    const [response, land] = await Promise.all([fetch(route.file), fetchLand(route.land)]);
    if (!response.ok) throw new Error(String(response.status));
    return read(await response.text(), false, land);
  } catch {
    return { status: "error", code: "fetch", own: false };
  }
}

/** Chosen on this page: what counts when the browser will not remember it. */
let chosenHere: string | null = null;

function rememberedKey(): string {
  if (chosenHere) return chosenHere;
  try {
    return bundledRoute(window.localStorage.getItem(REMEMBERED)).key;
  } catch {
    return DEFAULT_ROUTE;
  }
}

function subscribe(listener: () => void): () => void {
  window.addEventListener(CHANGED, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener("storage", listener);
  };
}

export function useCourse(world = true) {
  const key = useSyncExternalStore(subscribe, rememberedKey, () => DEFAULT_ROUTE);
  const route = bundledRoute(key);
  const [state, setState] = useState<CourseState>(() =>
    world
      ? { status: "loading" }
      : { status: "ready", course: flatCourse(), own: false, land: null },
  );
  // Asked again for the same route: back from the rider's own file to it.
  const [asked, setAsked] = useState(0);

  useEffect(() => {
    if (!world) return;
    let current = true;
    void fetchBundled(route).then((next) => {
      if (current) setState(next);
    });
    return () => {
      current = false;
    };
  }, [route, asked, world]);

  /** One of the routes that come with Kadence, instead of the one there is. */
  const chooseRoute = useCallback((next: string) => {
    chosenHere = bundledRoute(next).key;
    try {
      window.localStorage.setItem(REMEMBERED, chosenHere);
    } catch {
      // Not remembered, then: chosen all the same, for this page.
    }
    setState({ status: "loading" });
    setAsked((n) => n + 1);
    window.dispatchEvent(new Event(CHANGED));
  }, []);

  const loadFile = useCallback(async (file: File) => {
    if (file.size > ROUTE_LIMITS.maxChars) {
      setState({ status: "error", code: "too_large", own: true });
      return;
    }
    setState(read(await file.text(), true));
  }, []);

  return { state, route, routes: ROUTES, chooseRoute, loadFile };
}
