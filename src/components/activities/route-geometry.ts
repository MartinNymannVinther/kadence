/**
 * The route as points on a drawing: latitude and longitude projected flat
 * (equirectangular, longitude shortened by the cosine of the middle
 * latitude, which for a ride of a few dozen kilometres is true to a
 * fraction of a per cent), then scaled to fit `width` × at most
 * `maxHeight` without stretching either way. A sample without a fix is a
 * null, so the line breaks where the GPS did. Pure, so it is tested alone.
 */

export type RoutePoint = readonly [number, number] | null;

export function projectRoute(
  lat: readonly (number | null)[],
  lon: readonly (number | null)[],
  width: number,
  maxHeight: number,
  pad = 12,
): { points: RoutePoint[]; height: number } | null {
  const fixes: Array<[number, number] | null> = lat.map((la, i) => {
    const lo = lon[i];
    return typeof la === "number" && typeof lo === "number" ? [la, lo] : null;
  });
  const known = fixes.filter((f): f is [number, number] => f !== null);
  if (known.length < 2) return null;

  const lats = known.map((f) => f[0]);
  const lons = known.map((f) => f[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const shrink = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanX = Math.max((maxLon - minLon) * shrink, 1e-9);
  const spanY = Math.max(maxLat - minLat, 1e-9);

  const inner = Math.max(1, width - 2 * pad);
  const scale = Math.min(inner / spanX, Math.max(1, maxHeight - 2 * pad) / spanY);
  const height = Math.round(spanY * scale + 2 * pad);
  const offsetX = pad + (inner - spanX * scale) / 2;

  return {
    height,
    points: fixes.map((f) =>
      f === null
        ? null
        : ([offsetX + (f[1] - minLon) * shrink * scale, pad + (maxLat - f[0]) * scale] as const),
    ),
  };
}
