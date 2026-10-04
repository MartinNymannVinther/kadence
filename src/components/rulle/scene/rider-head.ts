import * as THREE from "three";

/**
 * The rider's head (`RiderFigure`): a long road helmet with dark vents
 * along its top, over the head, and sunglasses wrapped round the face.
 * Built about the head's middle, facing -z; the figure places it and tips
 * it with the body.
 */
export function riderHead(materials: {
  skin: THREE.Material;
  helmet: THREE.Material;
  dark: THREE.Material;
  lens: THREE.Material;
}): THREE.Group {
  const head = new THREE.Group();
  const face = new THREE.Mesh(new THREE.IcosahedronGeometry(0.105, 1), materials.skin);
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.125, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2),
    materials.helmet,
  );
  shell.scale.set(1, 0.85, 1.32);
  shell.position.set(0, 0.025, 0.02);
  head.add(face, shell);
  // The vents: their tops just show along the shell, where it is highest.
  for (const x of [-0.045, 0, 0.045]) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.012, 0.11), materials.dark);
    vent.position.set(x, 0.122 - Math.abs(x) * 0.5, 0.02);
    head.add(vent);
  }
  const glasses = new THREE.Mesh(
    new THREE.CylinderGeometry(0.112, 0.112, 0.036, 12, 1, true, Math.PI - 1.05, 2.1),
    materials.lens,
  );
  glasses.position.set(0, -0.005, 0);
  head.add(glasses);
  return head;
}
