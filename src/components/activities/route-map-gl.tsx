"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import type { MapVersions } from "@/core/map/paths";
import { DARK, LIGHT, mapSources, mapStyle, routeBounds, routeLines } from "./map-style";
import { RouteMap } from "./route-map";

const HEIGHT = 360;
const ROUTE = { light: "#4a6b53", dark: "#7fa588" };
const HERE = "#c08a63";
/** The pause symbols on the map: the same three as on the curves. */
const STOP_SYMBOL = { soda: "🥤", coffee: "☕", lunch: "🍽️" } as const;

export type MapStop = { lat: number; lon: number; kind: string; label: string };

let protocolAdded = false;

/**
 * The route on a map that Kadence serves itself (ADR 0023, 0099):
 * OpenStreetMap data from /api/map/tiles (Denmark and the training camps
 * in detail) over /api/map/world (everywhere, coarsely), drawn by
 * MapLibre in the browser — no tile, and so no position, is fetched from
 * anyone else. The dot follows the curves being read, as on the plain
 * drawing. Scrolling the page passes over the map; zooming takes two
 * fingers or a modifier key. Without WebGL, or if the map fails, the
 * plain drawing stands in.
 */
export function RouteMapGl({
  map: files,
  lat,
  lon,
  at,
  km,
  stops = [],
}: {
  map: MapVersions;
  lat: (number | null)[];
  lon: (number | null)[];
  at: number | null;
  km: string;
  stops?: MapStop[];
}) {
  const t = useTranslations("activities.route");
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [failed, setFailed] = useState(false);
  const lines = useMemo(() => routeLines(lat, lon), [lat, lon]);
  const { detail, world } = files;

  useEffect(() => {
    const element = container.current;
    const bounds = routeBounds(lines);
    if (!element || !bounds) return;
    let cancelled = false;
    let map: MapLibreMap | null = null;
    (async () => {
      const [maplibregl, { Protocol }] = await Promise.all([
        import("maplibre-gl"),
        import("pmtiles"),
      ]);
      if (cancelled) return;
      if (!protocolAdded) {
        // The worker is served by Kadence itself (scripts/copy-maplibre-worker.ts).
        maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        maplibregl.addProtocol("pmtiles", new Protocol().tile);
        protocolAdded = true;
      }
      const colour = dark ? ROUTE.dark : ROUTE.light;
      const created = new maplibregl.Map({
        container: element,
        style: mapStyle(mapSources(window.location.origin, { detail, world }), dark ? DARK : LIGHT),
        bounds,
        fitBoundsOptions: { padding: 28 },
        maxZoom: 16,
        cooperativeGestures: true,
        attributionControl: { compact: true },
        locale: {
          "CooperativeGesturesHandler.WindowsHelpText": t("gestureWindows"),
          "CooperativeGesturesHandler.MacHelpText": t("gestureMac"),
          "CooperativeGesturesHandler.MobileHelpText": t("gestureMobile"),
          "NavigationControl.ZoomIn": t("zoomIn"),
          "NavigationControl.ZoomOut": t("zoomOut"),
        },
      });
      map = created;
      mapRef.current = created;
      created.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      created.on("error", (event) => {
        // A tile that fails is a gap; a style or WebGL failure is no map.
        if (!created.isStyleLoaded()) setFailed(true);
        else console.warn("map:", event.error?.message);
      });
      created.on("load", () => {
        const map = created;
        const start = lines[0]![0]!;
        const finish = lines.at(-1)!.at(-1)!;
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "MultiLineString", coordinates: lines },
          },
        });
        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": dark ? "#1b1a18" : "#ffffff", "line-width": 7 },
        });
        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": colour, "line-width": 3.5 },
        });
        map.addSource("ends", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: { end: "finish" },
                geometry: { type: "Point", coordinates: finish },
              },
              {
                type: "Feature",
                properties: { end: "start" },
                geometry: { type: "Point", coordinates: start },
              },
            ],
          },
        });
        map.addLayer({
          id: "ends",
          type: "circle",
          source: "ends",
          paint: {
            "circle-radius": 6,
            "circle-color": ["match", ["get", "end"], "start", colour, "#ffffff"],
            "circle-stroke-color": ["match", ["get", "end"], "start", "#ffffff", "#24221e"],
            "circle-stroke-width": 2.5,
          },
        });
        for (const stop of stops) {
          const element = document.createElement("div");
          element.textContent = STOP_SYMBOL[stop.kind as keyof typeof STOP_SYMBOL] ?? "•";
          element.title = stop.label;
          element.setAttribute("aria-label", stop.label);
          element.className =
            "flex size-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-sm shadow-sm";
          new maplibregl.Marker({ element }).setLngLat([stop.lon, stop.lat]).addTo(map);
        }
        map.addSource("here", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "here",
          type: "circle",
          source: "here",
          paint: {
            "circle-radius": 7,
            "circle-color": HERE,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2.5,
          },
        });
      });
    })().catch(() => setFailed(true));
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, [lines, dark, t, stops, detail, world]);

  useEffect(() => {
    const source = mapRef.current?.getSource("here") as GeoJSONSource | undefined;
    if (!source) return;
    const point = at === null ? null : nearestFix(lat, lon, at);
    source.setData({
      type: "FeatureCollection",
      features: point
        ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: point } }]
        : [],
    });
  }, [at, lat, lon]);

  if (failed) return <RouteMap lat={lat} lon={lon} at={at} km={km} />;
  return (
    <div
      ref={container}
      role="img"
      aria-label={t("mapLabel", { km })}
      className="border-border bg-card w-full overflow-hidden rounded-lg border"
      style={{ height: HEIGHT }}
    />
  );
}

/** The position at `index`, or the nearest one before it with a fix, as [lon, lat]. */
function nearestFix(
  lat: readonly (number | null)[],
  lon: readonly (number | null)[],
  index: number,
): [number, number] | null {
  for (let i = Math.min(index, lat.length - 1); i >= 0; i--) {
    const la = lat[i];
    const lo = lon[i];
    if (typeof la === "number" && typeof lo === "number") return [lo, la];
  }
  return null;
}
