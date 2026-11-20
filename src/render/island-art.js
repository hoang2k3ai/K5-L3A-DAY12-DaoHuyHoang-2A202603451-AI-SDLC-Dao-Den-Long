import * as THREE from 'three';
import { mulberry32 } from '../sim/rng.js';

const mesh = (parent, geometry, material, x = 0, y = 0, z = 0) => {
  const part = new THREE.Mesh(geometry, material);
  part.position.set(x, y, z);
  parent.add(part);
  return part;
};
const fabric = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.88 });

export function groundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const random = mulberry32(73);
  ctx.fillStyle = '#c8d4d1';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = i % 3 ? '#456d681e' : '#fff1c32a';
    ctx.beginPath();
    ctx.ellipse(random() * 256, random() * 256, 1 + random() * 6, 0.5 + random() * 2, random() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 9);
  texture.anisotropy = 4;
  return texture;
}

export function makeKeeper() {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);
  const silk = fabric(0x307b78);
  const lining = fabric(0x174b55);
  const gold = fabric(0xdbac65);
  const skin = fabric(0xc98d68);
  const hair = fabric(0x201923);
  const dark = fabric(0x172d37);
  const coat = mesh(bodyGroup, new THREE.LatheGeometry([
    [0, -0.4], [0.35, -0.4], [0.29, -0.16], [0.24, 0.18], [0.28, 0.32], [0.12, 0.41], [0, 0.41],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 16), silk, 0, 0.84);
  coat.scale.z = 0.71;
  coat.castShadow = true;
  const sash = mesh(bodyGroup, new THREE.CylinderGeometry(0.256, 0.264, 0.105, 18), gold, 0, 0.77);
  sash.scale.z = 0.73;
  const scarf = mesh(bodyGroup, new THREE.BoxGeometry(0.21, 0.65, 0.07), fabric(0xb94337), 0.10, 1.0, -0.19);
  scarf.rotation.z = -0.28;
  const head = mesh(bodyGroup, new THREE.SphereGeometry(0.216, 16, 12), skin, 0, 1.42, 0.035);
  head.scale.set(0.95, 1.09, 0.92);
  mesh(bodyGroup, new THREE.SphereGeometry(0.222, 16, 12), hair, 0, 1.46, -0.049);
  for (const x of [-0.071, 0.071]) {
    mesh(bodyGroup, new THREE.SphereGeometry(0.018, 8, 5), dark, x, 1.455, 0.215);
  }
  const hat = mesh(bodyGroup, new THREE.ConeGeometry(0.43, 0.25, 28), fabric(0xd7b16f), 0, 1.67);
  hat.rotation.z = -0.11;
  hat.castShadow = true;
  const rim = mesh(hat, new THREE.TorusGeometry(0.42, 0.016, 6, 32), gold, 0, -0.115);
  rim.rotation.x = Math.PI / 2;
  const legs = [-0.13, 0.13].map((x) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.54, 0);
    bodyGroup.add(leg);
    mesh(leg, new THREE.CapsuleGeometry(0.085, 0.25, 4, 8), dark, 0, -0.205);
    mesh(leg, new THREE.BoxGeometry(0.17, 0.115, 0.27), fabric(0x593e31), 0, -0.42, 0.049);
    return leg;
  });
  const arm = new THREE.Group();
  arm.position.set(-0.25, 1.12, 0);
  arm.rotation.z = -0.48;
  bodyGroup.add(arm);
  mesh(arm, new THREE.CapsuleGeometry(0.09, 0.22, 4, 8), lining, 0, -0.16);
  mesh(arm, new THREE.SphereGeometry(0.079, 10, 8), skin, 0, -0.32);
  const wand = mesh(arm, new THREE.CylinderGeometry(0.022, 0.039, 0.49, 8), fabric(0x704535), 0, -0.33, 0.26);
  wand.rotation.x = Math.PI / 2;
  const tip = mesh(arm, new THREE.OctahedronGeometry(0.067), new THREE.MeshBasicMaterial({ color: 0xb7f5ef }), 0, -0.33, 0.53);
  const sleeve = mesh(bodyGroup, new THREE.CapsuleGeometry(0.095, 0.24, 4, 8), silk, 0.3, 0.94, 0.08);
  sleeve.rotation.z = 0.32;
  const lantern = new THREE.Group();
  lantern.position.set(0.41, 0.79, 0.17);
  bodyGroup.add(lantern);
  mesh(lantern, new THREE.SphereGeometry(0.125, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xffd295, emissive: 0xff963c, emissiveIntensity: 1.6 }));
  for (const y of [-0.10, 0.1]) mesh(lantern, new THREE.CylinderGeometry(0.082, 0.082, 0.032, 12), gold, 0, y);
  const light = new THREE.PointLight(0xffb45e, 9, 10, 2);
  light.position.copy(lantern.position);
  bodyGroup.add(light);
  const broom = new THREE.Group();
  broom.position.set(0, 0.48, 0);
  broom.visible = false;
  bodyGroup.add(broom);
  const handle = mesh(broom, new THREE.CylinderGeometry(0.033, 0.043, 2.05, 9), fabric(0x8e5739), 0, 0, 0.18);
  handle.rotation.x = Math.PI / 2;
  const straw = mesh(broom, new THREE.CylinderGeometry(0.065, 0.225, 0.75, 13), fabric(0xc9974e), 0, 0, -0.82);
  straw.rotation.x = Math.PI / 2;
  const tie = mesh(broom, new THREE.CylinderGeometry(0.102, 0.102, 0.08, 12), gold, 0, 0, -0.55);
  tie.rotation.x = Math.PI / 2;
  return { group, bodyGroup, lantern, light, legs, scarf, arm, tip, broom };
}

export function makeInkWraith() {
  const group = new THREE.Group();
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0x24213c, emissive: 0x2c145c, emissiveIntensity: 0.55, roughness: 0.82,
    transparent: true, opacity: 0.92, side: THREE.DoubleSide,
  });
  const cape = new THREE.CylinderGeometry(0.29, 0.53, 1.31, 18, 4, true);
  const vertices = cape.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const y = vertices.getY(i);
    const x = vertices.getX(i);
    const z = vertices.getZ(i);
    const angle = Math.atan2(z, x);
    const hem = 0.5 - y / 1.31;
    vertices.setXYZ(i, x * (1 + hem * 0.16 * Math.cos(7 * angle)),
      y + hem ** 4 * (0.22 * Math.sin(5 * angle) + 0.12 * Math.cos(8 * angle)), z);
  }
  cape.computeVertexNormals();
  const core = mesh(group, cape, coreMaterial, 0, -0.07);
  core.castShadow = true;
  const hood = mesh(group, new THREE.SphereGeometry(0.33, 16, 12), coreMaterial, 0, 0.52);
  hood.scale.set(1.01, 1.11, 0.91);
  const mask = mesh(group, new THREE.SphereGeometry(0.24, 14, 10), fabric(0x654577), 0, 0.51, 0.246);
  mask.scale.set(0.86, 1.12, 0.26);
  const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x7a3cff, toneMapped: false });
  const eyeMaterial = outlineMaterial.clone();
  const edge = mesh(group, new THREE.TorusGeometry(0.22, 0.013, 5, 22), outlineMaterial, 0, 0.51, 0.278);
  edge.scale.y = 1.22;
  for (const x of [-0.088, 0.088]) {
    const eye = mesh(group, new THREE.SphereGeometry(0.047, 10, 6), eyeMaterial, x, 0.54, 0.308);
    eye.scale.set(1.45, 0.48, 0.55);
    const veil = mesh(group, new THREE.ConeGeometry(0.19, 0.86, 8, 1, true), coreMaterial, x * 5.2, 0.02, -0.025);
    veil.rotation.z = x > 0 ? 2.72 : -2.72;
  }
  const stunRing = mesh(group, new THREE.TorusGeometry(0.76, 0.024, 6, 28),
    new THREE.MeshBasicMaterial({ color: 0x7a3cff, transparent: true, opacity: 0.75 }), 0, -0.45);
  stunRing.rotation.x = Math.PI / 2;
  stunRing.visible = false;
  return { group, core, coreMaterial, eyeMaterial, outlineMaterial, stunRing };
}

export function decorateIsland(parent, map) {
  const random = mulberry32(734 + map.night);
  const wood = fabric(0x6b5041);
  const foliage = fabric(0x235751);
  const stone = fabric(0x667686);
  const lantern = new THREE.MeshStandardMaterial({ color: 0xcb8b63, emissive: 0xff713e, emissiveIntensity: 0.64 });
  const districts = map.terrain.circles ?? [{ cx: 0, cz: 0, r: map.terrain.r ?? map.terrain.radius }];
  const trunk = new THREE.CylinderGeometry(0.10, 0.22, 3.9, 7);
  const leaf = new THREE.ConeGeometry(1.18, 2.1, 7);
  const slab = new THREE.CylinderGeometry(0.63, 0.72, 0.12, 6);
  const distantRock = new THREE.IcosahedronGeometry(1, 1);
  const distantStone = fabric(0x253447);
  for (let i = 0; i < 24; i++) {
    const angle = i * Math.PI * 2 / 24;
    const rad = 82 + random() * 35;
    const hill = mesh(parent, distantRock, distantStone,
      Math.cos(angle) * rad + (map.night === 2 ? 35 : 0), -13, Math.sin(angle) * rad);
    hill.scale.set(9 + random() * 12, 13 + random() * 24, 6 + random() * 9);
    hill.rotation.z = (random() - 0.5) * 0.7;
  }
  for (const { cx, cz, r } of districts) {
    for (let i = 0; i < 15; i++) {
      const angle = (i + random() * 0.5) * Math.PI * 2 / 15;
      const distance = r - 2.4 - random() * 3.2;
      const x = cx + Math.cos(angle) * distance;
      const z = cz + Math.sin(angle) * distance;
      const scale = 0.65 + random() * 0.75;
      const tree = new THREE.Group();
      tree.position.set(x, 0, z);
      tree.scale.setScalar(scale);
      tree.rotation.z = (random() - 0.5) * 0.3;
      parent.add(tree);
      mesh(tree, trunk, wood, 0, 1.95);
      mesh(tree, leaf, foliage, 0, 3.4);
      mesh(tree, leaf, foliage, -0.18, 4.36).scale.setScalar(0.79);
      const branch = mesh(tree, leaf, foliage, i % 2 ? 0.78 : -0.78, 3.15, 0.12);
      branch.scale.setScalar(0.55);
      branch.rotation.z = i % 2 ? -0.55 : 0.55;
    }
  }
  for (const lamp of map.lanterns) {
    for (let i = -2; i <= 2; i++) {
      mesh(parent, slab, stone, lamp.x + i * 1.28, lamp.y + 0.025, lamp.z - 2.7).rotation.y = random();
    }
    for (const side of [-1, 1]) {
      const x = lamp.x + 1.72 * side;
      mesh(parent, trunk, wood, x, lamp.y + 1.12, lamp.z + 0.4).scale.set(0.46, 0.57, 0.46);
      mesh(parent, new THREE.SphereGeometry(0.225, 10, 8), lantern, x, lamp.y + 1.9, lamp.z + 0.39).scale.y = 1.3;
    }
    // A small tiled canopy frames each oil lantern without changing collision.
    const roof = new THREE.Group();
    roof.position.set(lamp.x, lamp.y + 4.72, lamp.z + 0.35);
    parent.add(roof);
    const tile = fabric(0x60424a);
    const beam = new THREE.BoxGeometry(2.9, 0.11, 0.12);
    for (const side of [-1, 1]) {
      const pitch = mesh(roof, new THREE.BoxGeometry(2.9, 0.10, 0.77), tile, 0, 0.25, side * 0.34);
      pitch.rotation.x = side * 0.37;
      mesh(roof, beam, wood, 0, 0.10, side * 0.68);
    }
    mesh(roof, beam, wood, 0, 0.41, 0);
  }
}
