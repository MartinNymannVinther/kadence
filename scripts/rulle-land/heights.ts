import type { LandFile } from "@/modules/rulle/route/land";
import { get } from "./fetch";
import { decodePng, terrarium, type Image } from "./png";
import type { Box } from "./shapes";

/**
 * The ground's heights over the land's box (ADR 0035), from Mapzen's
 * terrain tiles (Terrarium encoding; in Denmark from SRTM and EU-DEM, the
 * sea from bathymetry): sampled every `STEP` metres, bilinear between the
 * tiles' pixels, in decimetres.
 */

const STEP = 40; // metres between heights
const ZOOM = 13;
const RAD = Math.PI / 180;

export async function heightsOver(
  box: Box,
  toLatLon: (x: number, y: number) => { lat: number; lon: number },
): Promise<LandFile["heights"]> {
  const sw = toLatLon(box.minX, box.minY);
  const ne = toLatLon(box.maxX, box.maxY);
  const tileX = (lon: number) => ((lon + 180) / 360) * 2 ** ZOOM;
  const tileY = (lat: number) =>
    ((1 - Math.log(Math.tan(lat * RAD) + 1 / Math.cos(lat * RAD)) / Math.PI) / 2) * 2 ** ZOOM;
  const tiles = new Map<string, Image>();
  for (let tx = Math.floor(tileX(sw.lon)); tx <= Math.floor(tileX(ne.lon)); tx++)
    for (let ty = Math.floor(tileY(ne.lat)); ty <= Math.floor(tileY(sw.lat)); ty++) {
      const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${ZOOM}/${tx}/${ty}.png`;
      tiles.set(`${tx}/${ty}`, decodePng(new Uint8Array(await (await get(url)).arrayBuffer())));
    }
  const pixel = (px: number, py: number) => {
    const tile = tiles.get(`${Math.floor(px / 256)}/${Math.floor(py / 256)}`)!;
    return terrarium(tile, Math.floor(px) % 256, Math.floor(py) % 256);
  };
  const heightAt = (lat: number, lon: number) => {
    const px = tileX(lon) * 256 - 0.5;
    const py = tileY(lat) * 256 - 0.5;
    const x0 = Math.floor(px);
    const y0 = Math.floor(py);
    const u = px - x0;
    const v = py - y0;
    return (
      pixel(x0, y0) * (1 - u) * (1 - v) +
      pixel(x0 + 1, y0) * u * (1 - v) +
      pixel(x0, y0 + 1) * (1 - u) * v +
      pixel(x0 + 1, y0 + 1) * u * v
    );
  };
  const cols = Math.ceil((box.maxX - box.minX) / STEP) + 1;
  const rows = Math.ceil((box.maxY - box.minY) / STEP) + 1;
  const dm = new Int16Array(cols * rows);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const { lat, lon } = toLatLon(box.minX + i * STEP, box.minY + j * STEP);
      dm[j * cols + i] = Math.round(Math.max(-3000, Math.min(3000, heightAt(lat, lon))) * 10);
    }
  return {
    x0: Math.round(box.minX),
    y0: Math.round(box.minY),
    step: STEP,
    cols,
    rows,
    dm: Buffer.from(dm.buffer).toString("base64"),
  };
}
