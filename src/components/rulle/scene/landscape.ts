import * as THREE from "three";
import { courseAt, structuresOn, type City, type Course, type Land } from "@/modules/rulle";
import { Bridges } from "./bridges";
import { inPaddocks } from "./farmyard";
import { Ground } from "./ground";
import { castShadows, freeze } from "./props";
import { buildRoad } from "./road";
import { Roadside } from "./roadside";
import { Scenery } from "./scenery";
import { Terrain } from "./terrain";

/**
 * The land a ride runs through (ADR 0033, 0035–0037), put together once:
 * the ground — the real land round a route that comes with Kadence, or
 * land made from the route — its terrain built in chunks round the eye,
 * the woods, farms and towns on it, what stands by the road, the road
 * itself and its bridges. All of it is placed once; only the rotors turn
 * and what runs over the bridges runs.
 */
export class Landscape {
  readonly ground: Ground;
  readonly group = new THREE.Group();
  private readonly terrain: Terrain;
  private readonly scenery: Scenery;
  private readonly roadside: Roadside;
  private readonly bridges: Bridges;
  private road: THREE.Group | null = null;
  private frames = 0;

  constructor(
    private readonly course: Course,
    options: { land: Land | null; city: City | null; light: boolean; shaded: boolean },
    /** What the lakes, the streams and the sea are drawn in. */
    water: THREE.Material,
  ) {
    const { land, city, light, shaded } = options;
    // The bridges the road is on, and what passes over and under it (ADR 0037).
    const found = structuresOn(course, land?.structures ?? []);
    this.ground = new Ground(course, land, city, found.decks);
    const onDeck = (along: number) => this.ground.onDeck(along);
    // No tree in a field with cows in it, nor in the water.
    const fields = inPaddocks(course, this.ground);
    this.scenery = new Scenery(this.ground, light ? 0.5 : 1, fields, water);
    this.terrain = new Terrain(
      this.ground,
      (key, cx, cz, added) => {
        if (added) this.scenery.add(key, cx, cz);
        else this.scenery.remove(key);
      },
      water,
      shaded,
    );
    this.roadside = new Roadside(
      course,
      light ? 0.5 : 1,
      (x, z) => fields(x, z) || this.ground.wet(x, z),
      city !== null,
      onDeck,
    );
    this.bridges = new Bridges(course, this.ground, found);
    if (shaded) castShadows(this.bridges.group);
    this.terrain.group.matrixAutoUpdate = false;
    this.scenery.group.matrixAutoUpdate = false;
    freeze(this.roadside.group);
    freeze(this.bridges.group);
    this.group.matrixAutoUpdate = false;
    this.group.add(this.terrain.group, this.scenery.group, this.roadside.group, this.bridges.group);
    const start = courseAt(course, 0);
    this.terrain.fill(start.x, -start.y);
  }

  /** The road itself, laid once race day knows where its cobbles are (ADR 0036). */
  layRoad(cobbled: (along: number) => boolean, shaded: boolean): void {
    const city = this.ground.city !== null;
    const road = buildRoad(this.course, city, cobbled, (along) => this.ground.onDeck(along));
    if (shaded)
      road.traverse((child) => {
        if (child instanceof THREE.Mesh) child.receiveShadow = true;
      });
    this.group.add(freeze(road));
    this.road = road;
  }

  /** Makes room round a place: no tree and nothing by the road within `r` metres of it (a café). */
  clearAround(x: number, z: number, r: number): void {
    this.scenery.clearAround(x, z, r);
    this.roadside.clearAround(x, z, r);
  }

  /** On by `seconds` round the eye: the rotors, what runs over the bridges, the land built ahead. */
  frame(eye: THREE.Vector3, seconds: number): void {
    this.scenery.animate(seconds);
    this.bridges.frame(eye, seconds);
    this.terrain.update(eye.x, eye.z, 1);
    if (this.frames++ % 20 === 0) this.roadside.update(eye);
  }

  dispose(): void {
    this.terrain.dispose();
    this.scenery.dispose();
    this.roadside.dispose();
    this.road?.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
    this.bridges.dispose();
  }
}
