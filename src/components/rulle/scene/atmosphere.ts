import * as THREE from "three";
import { hash } from "./noise";
import { PALETTE } from "./palette";
import { cloud } from "./props";
import { RIPPLE, waterMaterial } from "./water";

/**
 * Light and air: a low autumn sun from the south-west and the sky's cool
 * light from above; a dome of sky that pales into haze at the horizon,
 * warmest low toward the sun, and the same haze as fog, so the land fades
 * into it rather than ending; water where the land dips below the sea,
 * the sun glinting on it; a few slow clouds. Where the device can afford
 * it, the sun casts soft shadows round the rider.
 */

/** Toward the sun: the south-west, and not high. */
const SUN = new THREE.Vector3(-0.55, 0.62, 0.56).normalize();
/** Metres either side of the rider the sun's shadows are drawn. */
const SHADOWED = 14;
/** The sea's facets: its normals lean a little every this many metres. */
const SEA_CELL = 100;

export class Atmosphere {
  readonly group = new THREE.Group();
  /** The water the lakes and streams are drawn in too. */
  readonly water = waterMaterial();
  private readonly sun: THREE.DirectionalLight;
  private readonly dome: THREE.Mesh;
  private readonly sea: THREE.Mesh;
  private readonly clouds: THREE.Mesh[] = [];
  private readonly disposables: { dispose: () => void }[] = [];
  private placed = false;

  constructor(scene: THREE.Scene) {
    const haze = new THREE.Color(PALETTE.haze);
    scene.background = haze;
    scene.fog = new THREE.Fog(haze, 320, 2250);

    const hemi = new THREE.HemisphereLight(PALETTE.hemiSky, PALETTE.hemiGround, 2.1);
    this.sun = new THREE.DirectionalLight(PALETTE.sun, 2.4);
    this.sun.position.copy(SUN);
    this.group.add(hemi, this.sun, this.sun.target);

    const domeGeometry = new THREE.SphereGeometry(2800, 48, 24);
    const top = new THREE.Color(PALETTE.skyTop);
    const glow = new THREE.Color(PALETTE.sunGlow);
    const toward = new THREE.Vector2(SUN.x, SUN.z).normalize();
    const colors: number[] = [];
    const positions = domeGeometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      const up = Math.max(0, positions.getY(i) / 2800);
      const c = haze.clone().lerp(top, Math.min(1, Math.pow(up, 0.55) * 1.1));
      // Warmer low in the sky toward the sun.
      const way = new THREE.Vector2(positions.getX(i), positions.getZ(i)).normalize();
      const warm = Math.pow(Math.max(0, way.dot(toward)), 3) * Math.pow(1 - up, 2.2) * 0.6;
      c.lerp(glow, warm);
      colors.push(c.r, c.g, c.b);
    }
    domeGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const domeMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
    this.dome = new THREE.Mesh(domeGeometry, domeMaterial);
    this.dome.renderOrder = -1;
    this.group.add(this.dome);

    const seaGeometry = new THREE.PlaneGeometry(7000, 7000, 7000 / SEA_CELL, 7000 / SEA_CELL);
    seaGeometry.rotateX(-Math.PI / 2);
    this.sea = new THREE.Mesh(seaGeometry, this.water);
    this.ripple();
    this.sea.position.y = -0.1;
    this.sea.receiveShadow = true;
    this.group.add(this.sea);

    const cloudMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
      emissive: new THREE.Color(PALETTE.cloud).multiplyScalar(0.35),
    });
    for (let k = 0; k < 9; k++) {
      const mesh = new THREE.Mesh(cloud(k + 1), cloudMaterial);
      const angle = hash(k, 0, 7) * Math.PI * 2;
      const distance = 700 + hash(k, 1, 7) * 900;
      mesh.position.set(
        Math.cos(angle) * distance,
        260 + hash(k, 2, 7) * 140,
        Math.sin(angle) * distance,
      );
      mesh.rotation.y = hash(k, 3, 7) * Math.PI;
      this.clouds.push(mesh);
      this.group.add(mesh);
      this.disposables.push(mesh.geometry);
    }
    this.disposables.push(domeGeometry, domeMaterial, seaGeometry, this.water, cloudMaterial);
    scene.add(this.group);
  }

  /** The sun's soft shadows, in a square round the rider (`light`). */
  castShadows(): void {
    const { sun } = this;
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const camera = sun.shadow.camera;
    camera.left = -SHADOWED;
    camera.right = SHADOWED;
    camera.top = SHADOWED;
    camera.bottom = -SHADOWED;
    camera.near = 1;
    camera.far = 140;
    camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.04;
    sun.shadow.radius = 3;
  }

  /** Where the sun's shadows are drawn: round the rider, the light coming the same way. */
  light(at: THREE.Vector3): void {
    this.sun.target.position.copy(at);
    this.sun.position.copy(at).addScaledVector(SUN, 70);
  }

  /** The sky and the sea keep their distance; the clouds drift east on the westerly. */
  follow(camera: THREE.Vector3, seconds: number): void {
    if (!this.placed) {
      // The clouds were laid out around nowhere in particular; now around the rider.
      for (const c of this.clouds) c.position.add(new THREE.Vector3(camera.x, 0, camera.z));
      this.placed = true;
    }
    this.dome.position.set(camera.x, 0, camera.z);
    // In whole facets, the facets' lean where they are: the glint stays on the water.
    const x = Math.round(camera.x / SEA_CELL) * SEA_CELL;
    const z = Math.round(camera.z / SEA_CELL) * SEA_CELL;
    if (x !== this.sea.position.x || z !== this.sea.position.z) {
      this.sea.position.x = x;
      this.sea.position.z = z;
      this.ripple();
    }
    for (const c of this.clouds) {
      c.position.x += seconds * 2.5;
      const dx = c.position.x - camera.x;
      const dz = c.position.z - camera.z;
      // A cloud that drifted too far comes round again on the other side.
      if (Math.hypot(dx, dz) > 1800) {
        c.position.x = camera.x - dx * 0.9;
        c.position.z = camera.z - dz * 0.9;
      }
    }
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }

  /** The sea's normals leaning a little, by where each corner is in the world. */
  private ripple(): void {
    const geometry = this.sea.geometry;
    const normals = geometry.getAttribute("normal") as THREE.BufferAttribute;
    const corners = geometry.getAttribute("position");
    const { x: ox, z: oz } = this.sea.position;
    for (let i = 0; i < normals.count; i++) {
      const x = Math.round(corners.getX(i) + ox);
      const z = Math.round(corners.getZ(i) + oz);
      const nx = (hash(x, z, 401) - 0.5) * 2 * RIPPLE;
      const nz = (hash(x, z, 402) - 0.5) * 2 * RIPPLE;
      const len = Math.hypot(nx, 1, nz);
      normals.setXYZ(i, nx / len, 1 / len, nz / len);
    }
    normals.needsUpdate = true;
  }
}
