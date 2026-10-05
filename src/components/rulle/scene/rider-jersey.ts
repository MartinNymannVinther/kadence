import * as THREE from "three";
import { placeBetween, tapered } from "./body-shapes";
import type { Kit } from "./kits";
import type { KitMaterials } from "./rider-materials";

/** How much broader the torso is at the shoulders than at the hips, its half-width there and its half-depth. */
const TAPER = 0.25;
const WIDE = 0.15;
const DEEP = 0.115;
/** Of the torso's length from the hips, where a two-tone jersey's lower colour ends. */
const LOWER = 0.5;
/** A hair over the jersey, where something runs round it. */
const OVER = 0.004;

/**
 * The jersey on the rider's body (`RiderFigure`): the torso, broader at
 * the shoulders; on a two-tone jersey its lower half in the other colour,
 * following the torso's taper; the band across it, and a thin stripe
 * either side where the kit has them. Placed from the hips to the
 * shoulders every frame.
 */
export class Jersey {
  readonly meshes: THREE.Mesh[];
  private readonly torso: THREE.Mesh;
  private readonly lower: THREE.Mesh | null;
  private readonly band: THREE.Mesh;
  private readonly edges: THREE.Mesh[];
  /** Half the band's width, as a share of the torso's length. */
  private readonly half: number;

  constructor(kit: Kit, m: KitMaterials, unit: THREE.BufferGeometry) {
    this.torso = new THREE.Mesh(tapered(1 + TAPER), m.jersey);
    this.lower = kit.lower ? new THREE.Mesh(tapered(1 + TAPER * LOWER), m.lower) : null;
    this.band = new THREE.Mesh(unit, m.band);
    this.edges = kit.bandEdges ? [0, 1].map(() => new THREE.Mesh(unit, m.band)) : [];
    this.half = (kit.bandWidth ?? 0.1) / 2;
    this.band.visible = this.half > 0;
    this.meshes = [this.torso, ...(this.lower ? [this.lower] : []), this.band, ...this.edges];
  }

  place(hips: THREE.Vector3, shoulders: THREE.Vector3): void {
    const at = (f: number) => hips.clone().lerp(shoulders, f);
    placeBetween(this.torso, hips, shoulders, WIDE, DEEP);
    if (this.lower) placeBetween(this.lower, hips, at(LOWER), WIDE + OVER, DEEP + OVER);
    // The band a hair wider than the jersey where it runs round it, and a thin stripe either side.
    const { half } = this;
    placeBetween(this.band, at(0.55 - half), at(0.55 + half), 0.177, 0.136);
    this.edges.forEach((edge, i) => {
      const from = i ? 0.55 + half + 0.02 : 0.55 - half - 0.032;
      placeBetween(edge, at(from), at(from + 0.012), 0.177, 0.138);
    });
  }
}
