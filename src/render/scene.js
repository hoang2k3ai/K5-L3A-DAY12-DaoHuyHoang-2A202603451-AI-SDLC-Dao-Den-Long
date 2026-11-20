// Three.js presentation layer for "Đảo Đèn Lồng".
//
// Rendering only: every rule that affects the outcome lives in src/sim/.
// The palette is fixed by the Phase 2 art direction (each channel of a rendered
// surface must stay within 10% of these base values).
import * as THREE from 'three';
import { WORLD } from '../sim/config.js';

export const PALETTE = Object.freeze({
  sky: 0x070a18,
  fog: 0x0d1226,
  sea: 0x111a30,
  ground: 0x40567c,
  groundSide: 0x2b3c5e,
  tier1: 0x384b6d,
  tier2: 0x44597e,
  bridge: 0x4a3b2e,
  ramp: 0x3d4f70,
  rock: 0x1d2740,
  grass: 0x35635e,
  path: 0x3d4c63,
  lanternWarm: 0xffb45e,
  lanternBody: 0xffd9a0,
  mote: 0xffe9ad,
  shadeCore: 0x1b1026,
  shadeGlow: 0xb98cff,
  drifter: 0x8fd3ff,
  charm: 0xffd166,
  wind: 0xa8c8ff,
  tower: 0x2b2233,
  moon: 0xfff1cd,
});

const WARM = PALETTE.lanternWarm;
const WARM_FOG = new THREE.Color(0x2a1d2e);
const VIOLET = PALETTE.shadeGlow;

/** Deterministic pseudo-random for decorative scatter (never used by the sim). */
function scatter(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function glowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 244, 210, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 200, 120, 0.65)');
  gradient.addColorStop(0.65, 'rgba(255, 150, 60, 0.18)');
  gradient.addColorStop(1, 'rgba(255, 120, 40, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const glowTex = typeof document === 'undefined' ? null : glowTexture();

function makeLantern() {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.15, 3.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.95 }),
  );
  pole.position.y = 1.6;
  pole.castShadow = true;
  group.add(pole);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.4, 0.18, 10),
    new THREE.MeshStandardMaterial({ color: 0x2a1d18, roughness: 1 }),
  );
  base.position.y = 3.15;
  group.add(base);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.lanternBody,
    emissive: 0xff9a3c,
    emissiveIntensity: 0.04,
    roughness: 0.5,
    transparent: true,
    opacity: 0.92,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.05, 0.82), bodyMaterial);
  body.position.y = 3.85;
  body.castShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.68, 0.5, 4),
    new THREE.MeshStandardMaterial({ color: 0x2b1d19, roughness: 0.9 }),
  );
  roof.position.y = 4.6;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);

  const light = new THREE.PointLight(WARM, 0, 30, 2);
  light.position.y = 3.9;
  group.add(light);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: WARM,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.position.y = 3.9;
  glow.scale.setScalar(1.2);
  group.add(glow);

  // Safe radius ring: matches TUNING.safe_radius (6 m).
  const safeRing = new THREE.Mesh(
    new THREE.RingGeometry(5.9, 6.02, 64),
    new THREE.MeshBasicMaterial({ color: WARM, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  safeRing.rotation.x = -Math.PI / 2;
  safeRing.position.y = 0.04;
  group.add(safeRing);

  return { group, bodyMaterial, light, glow, safeRing };
}

function makePlayer() {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const cloak = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.36, 0.55, 6, 14),
    new THREE.MeshStandardMaterial({ color: 0xf1e2c2, roughness: 0.9 }),
  );
  cloak.position.y = 0.78;
  cloak.castShadow = true;
  bodyGroup.add(cloak);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 18, 14),
    new THREE.MeshStandardMaterial({ color: 0xf8d9ae, roughness: 0.85 }),
  );
  head.position.y = 1.33;
  head.castShadow = true;
  bodyGroup.add(head);

  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 0.34, 22, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xe9d9ad, roughness: 0.95, side: THREE.DoubleSide }),
  );
  hat.position.y = 1.6;
  hat.castShadow = true;
  bodyGroup.add(hat);

  const lantern = new THREE.Group();
  lantern.position.set(0.44, 1.02, 0.1);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffe1a8, emissive: 0xffa64d, emissiveIntensity: 2.2 }),
  );
  lantern.add(bulb);
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: WARM,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  halo.scale.setScalar(0.9);
  lantern.add(halo);
  bodyGroup.add(lantern);

  const light = new THREE.PointLight(WARM, 7, 9, 2);
  light.position.set(0.44, 1.02, 0.1);
  bodyGroup.add(light);

  return { group, bodyGroup, lantern, light };
}

function makeShade() {
  const group = new THREE.Group();
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.shadeCore,
    emissive: 0x2c0f42,
    emissiveIntensity: 0.5,
    roughness: 0.55,
    transparent: true,
    opacity: 0.92,
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), coreMaterial);
  core.castShadow = true;
  group.add(core);

  const wispMaterial = new THREE.MeshBasicMaterial({ color: 0x2a1338, transparent: true, opacity: 0.55 });
  for (let i = 0; i < 3; i++) {
    const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), wispMaterial);
    const angle = (i / 3) * Math.PI * 2;
    wisp.position.set(Math.cos(angle) * 0.45, -0.1 + i * 0.08, Math.sin(angle) * 0.45);
    group.add(wisp);
  }

  const eyeMaterial = new THREE.MeshBasicMaterial({ color: VIOLET });
  for (const x of [-0.16, 0.16]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), eyeMaterial);
    eye.position.set(x, 0.12, 0.46);
    group.add(eye);
  }

  const stunRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.035, 8, 32),
    new THREE.MeshBasicMaterial({ color: VIOLET, transparent: true, opacity: 0.75, depthWrite: false }),
  );
  stunRing.rotation.x = Math.PI / 2;
  stunRing.visible = false;
  group.add(stunRing);

  return { group, coreMaterial, stunRing, core };
}

function makeDrifter() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: PALETTE.drifter,
    emissive: PALETTE.drifter,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.75,
    roughness: 0.6,
  });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.8, 7), material);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const wings = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), material);
    wing.position.set(side * 0.45, 0.05, 0);
    wing.rotation.z = side * 0.35;
    group.add(wing);
    wings.push(wing);
  }

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: PALETTE.drifter,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.scale.setScalar(1.6);
  group.add(glow);

  return { group, wings, material };
}

function makeCharm() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: PALETTE.charm,
    emissive: 0xffa53c,
    emissiveIntensity: 1.2,
    roughness: 0.35,
  });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), material);
  group.add(core);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.02, 8, 40),
    new THREE.MeshBasicMaterial({ color: PALETTE.charm, transparent: true, opacity: 0.6, depthWrite: false }),
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: PALETTE.charm,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.scale.setScalar(2.2);
  group.add(glow);

  return { group, core, ring };
}

function makePad(pad) {
  const group = new THREE.Group();
  group.position.set(pad.x, pad.y + 0.05, pad.z);

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(pad.r, pad.r, 0.16, 24),
    new THREE.MeshStandardMaterial({ color: 0x2c3c5c, emissive: 0x2b6cff, emissiveIntensity: 0.35, roughness: 0.6 }),
  );
  group.add(disc);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(pad.r * 0.82, 0.06, 8, 36),
    new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.85 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  group.add(ring);

  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.7, 4),
    new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.8 }),
  );
  arrow.position.y = 0.75;
  arrow.rotation.x = Math.PI;
  group.add(arrow);

  return group;
}

export function createStage(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.55;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const nightColor = new THREE.Color(PALETTE.sky);
  scene.background = nightColor.clone();
  scene.fog = new THREE.FogExp2(PALETTE.fog, 0.008);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 700);
  camera.position.set(0, 10, -14);

  const ambient = new THREE.AmbientLight(0x40507a, 0.55);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0x7a90d0, 0x1a1424, 1.25);
  scene.add(hemi);

  const moonLight = new THREE.DirectionalLight(0xb4c8ff, 1.2);
  moonLight.position.set(40, 60, 24);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(2048, 2048);
  moonLight.shadow.camera.left = -60;
  moonLight.shadow.camera.right = 60;
  moonLight.shadow.camera.top = 60;
  moonLight.shadow.camera.bottom = -60;
  moonLight.shadow.camera.near = 1;
  moonLight.shadow.camera.far = 220;
  moonLight.shadow.bias = -0.0008;
  scene.add(moonLight);
  scene.add(moonLight.target);

  const warmLight = new THREE.PointLight(0xff9a4a, 0, 120, 2);
  warmLight.position.set(0, 20, 0);
  scene.add(warmLight);

  /* ---------------- static sky ---------------- */
  const starPositions = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.85);
    const radius = 320;
    starPositions[i * 3] = Math.cos(theta) * Math.sin(phi) * radius;
    starPositions[i * 3 + 1] = Math.cos(phi) * radius + 20;
    starPositions[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * radius;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0xc6d6ff, size: 2, transparent: true, opacity: 0.8, fog: false }),
  );
  scene.add(stars);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(9, 24, 18),
    new THREE.MeshBasicMaterial({ color: 0xfff1cd, fog: false }),
  );
  moon.position.set(-140, 150, -230);
  scene.add(moon);
  const moonGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xdfe6ff,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  moonGlow.position.copy(moon.position);
  moonGlow.scale.setScalar(80);
  scene.add(moonGlow);

  // Sea of clouds below every island.
  const cloudGroup = new THREE.Group();
  scene.add(cloudGroup);
  {
    const cloudMaterial = new THREE.MeshStandardMaterial({ color: PALETTE.sea, roughness: 1 });
    const cloudGeometry = new THREE.SphereGeometry(1, 10, 8);
    const rng = mulberry32(1234);
    for (let i = 0; i < 70; i++) {
      const angle = rng() * Math.PI * 2;
      const radius = 70 + rng() * 80;
      const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
      cloud.position.set(Math.cos(angle) * radius, -12 + rng() * 6, Math.sin(angle) * radius);
      cloud.scale.set(6 + rng() * 8, 1.6 + rng() * 1.8, 6 + rng() * 8);
      cloudGroup.add(cloud);
    }
  }

  /* ---------------- terrain ---------------- */
  const terrain = new THREE.Group();
  scene.add(terrain);

  const materials = {
    ground: new THREE.MeshStandardMaterial({ color: PALETTE.ground, roughness: 1 }),
    side: new THREE.MeshStandardMaterial({ color: PALETTE.groundSide, roughness: 1 }),
    tier1: new THREE.MeshStandardMaterial({ color: PALETTE.tier1, roughness: 1 }),
    tier2: new THREE.MeshStandardMaterial({ color: PALETTE.tier2, roughness: 1 }),
    bridge: new THREE.MeshStandardMaterial({ color: PALETTE.bridge, roughness: 1 }),
    ramp: new THREE.MeshStandardMaterial({ color: PALETTE.ramp, roughness: 1 }),
    rock: new THREE.MeshStandardMaterial({ color: PALETTE.rock, roughness: 1 }),
    grass: new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 1 }),
    path: new THREE.MeshStandardMaterial({ color: PALETTE.path, roughness: 1 }),
  };

  function clearTerrain() {
    while (terrain.children.length) {
      const child = terrain.children.pop();
      child.traverse?.((node) => {
        if (node.geometry) node.geometry.dispose();
      });
      terrain.remove(child);
    }
  }

  function addDisc(cx, cz, r, y, material) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.8, 2.4, 72), material);
    mesh.position.set(cx, y - 1.2, cz);
    mesh.receiveShadow = true;
    terrain.add(mesh);

    const top = new THREE.Mesh(new THREE.CircleGeometry(r, 72), material === materials.ground ? materials.ground : material);
    top.rotation.x = -Math.PI / 2;
    top.position.set(cx, y + 0.01, cz);
    top.receiveShadow = true;
    terrain.add(top);
  }

  function beam(a, b, width, material) {
    const from = new THREE.Vector3(a.x, a.y, a.z);
    const to = new THREE.Vector3(b.x, b.y, b.z);
    const dir = new THREE.Vector3().subVectors(to, from);
    const length = dir.length();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.34, length), material);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize());
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    return mesh;
  }

  function addArcWall(radius, y0, y1, material, { fromDeg = 0, toDeg = 360, skipAngles = [], skipHalfWidth = 0 } = {}) {
    const segments = Math.max(8, Math.round(((toDeg - fromDeg) / 360) * 96));
    const step = (toDeg - fromDeg) / segments;
    for (let i = 0; i < segments; i++) {
      const mid = fromDeg + i * step + step / 2;
      if (skipAngles.some((a) => Math.abs(((mid - a + 540) % 360) - 180) < skipHalfWidth)) continue;
      const arc = ((step * Math.PI) / 180) * radius;
      const box = new THREE.Mesh(new THREE.BoxGeometry(arc * 1.02, y1 - y0, 0.6), material);
      const a = (mid * Math.PI) / 180;
      box.position.set(Math.cos(a) * radius, (y0 + y1) / 2, Math.sin(a) * radius);
      box.rotation.y = -a + Math.PI / 2;
      box.castShadow = true;
      box.receiveShadow = true;
      terrain.add(box);
    }
  }

  function scatter(rng, count, minR, maxR, make) {
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const radius = minR + rng() * (maxR - minR);
      const obj = make(rng);
      obj.position.set(Math.cos(angle) * radius, obj.position.y, Math.sin(angle) * radius);
      obj.rotation.y = rng() * Math.PI;
      terrain.add(obj);
    }
  }

  function addDecor(radius) {
    const rng = mulberry32(77 + radius);
    const rockGeometry = new THREE.DodecahedronGeometry(0.6, 0);
    scatter(rng, Math.round(radius * 0.75), 5, radius - 3, () => {
      const rock = new THREE.Mesh(rockGeometry, materials.rock);
      const scale = 0.5 + rng() * 1.1;
      rock.scale.set(scale, scale * (0.6 + rng() * 0.6), scale);
      rock.position.y = 0.1;
      rock.castShadow = true;
      rock.receiveShadow = true;
      return rock;
    });

    const grassGeometry = new THREE.ConeGeometry(0.12, 0.7, 5);
    scatter(rng, Math.round(radius * 2.2), 2, radius - 1, () => {
      const tuft = new THREE.Mesh(grassGeometry, materials.grass);
      tuft.position.y = 0.35;
      tuft.scale.setScalar(0.6 + rng() * 0.9);
      return tuft;
    });
  }

  function buildCircle(map) {
    const t = map.terrain;
    addDisc(t.cx, t.cz, t.r, t.y, materials.ground);
    addDecor(t.r);
    const path = new THREE.Mesh(new THREE.RingGeometry(6.2, 8.4, 64), materials.path);
    path.rotation.x = -Math.PI / 2;
    path.position.set(t.cx, t.y + 0.03, t.cz);
    path.receiveShadow = true;
    terrain.add(path);
  }

  function buildIslands(map) {
    const t = map.terrain;
    for (const circle of t.circles) {
      addDisc(circle.cx, circle.cz, circle.r, circle.y, materials.ground);
      addDecor(circle.r);
    }
    const b = t.bridge;
    const midZ = (b.z0 + b.z1) / 2;
    const bridge = beam(
      { x: b.x0, y: b.y - 0.18, z: midZ },
      { x: b.x1, y: b.y - 0.18, z: midZ },
      b.z1 - b.z0,
      materials.bridge,
    );
    terrain.add(bridge);
    // Rope rails, purely decorative.
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, b.x1 - b.x0, 6),
        new THREE.MeshStandardMaterial({ color: 0x6b543c, roughness: 0.9 }),
      );
      rail.rotation.z = Math.PI / 2;
      rail.position.set((b.x0 + b.x1) / 2, b.y + 0.9, midZ + side * ((b.z1 - b.z0) / 2 - 0.2));
      terrain.add(rail);
    }
  }

  function buildTiers(map) {
    const t = map.terrain;
    addDisc(0, 0, t.radius, 0, materials.ground);
    addDecor(t.radius);

    // Tier 1: half annulus on z > 0 with a raised rim and two ramp openings.
    const t1 = t.tier1;
    const half = new THREE.Mesh(
      new THREE.RingGeometry(t1.r0, t1.r1, 72, 1, Math.PI, Math.PI),
      materials.tier1,
    );
    half.rotation.x = -Math.PI / 2;
    half.position.y = t1.y + 0.01;
    half.receiveShadow = true;
    terrain.add(half);

    const innerTop = new THREE.Mesh(
      new THREE.RingGeometry(t1.r0 - 0.9, t1.r0, 72, 1, Math.PI, Math.PI),
      materials.side,
    );
    innerTop.rotation.x = -Math.PI / 2;
    innerTop.position.y = t1.y;
    terrain.add(innerTop);

    addArcWall(t1.r0, 0, t1.y, materials.side, { fromDeg: 0, toDeg: 180 });
    addArcWall(t1.r1, 0, t1.y, materials.side, { fromDeg: 0, toDeg: 180, skipAngles: [30, 150], skipHalfWidth: 9 });

    // Ramps: walkable beams from the ground to the terrace.
    for (const ramp of t.ramps) {
      const a = (ramp.angle * Math.PI) / 180;
      const near = { x: Math.cos(a) * ramp.r0, y: ramp.y0, z: Math.sin(a) * ramp.r0 };
      const far = { x: Math.cos(a) * ramp.r1, y: ramp.y1, z: Math.sin(a) * ramp.r1 };
      const rampMesh = beam(near, far, ramp.width, materials.ramp);
      rampMesh.position.y += 0.12;
      terrain.add(rampMesh);
    }

    // Tier 2: the floating bell-tower platform.
    const t2 = t.tier2;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(t2.r, t2.r - 0.6, 0.8, 56), materials.tier2);
    disc.position.y = t2.y - 0.4;
    disc.castShadow = true;
    disc.receiveShadow = true;
    terrain.add(disc);

    // Bell tower.
    const tower = t.tower;
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(tower.r, tower.r * 1.1, tower.height, 24),
      new THREE.MeshStandardMaterial({ color: 0x6b5238, emissive: 0x241708, emissiveIntensity: 0.5, roughness: 0.9 }),
    );
    shaft.position.y = t2.y + tower.height / 2;
    shaft.castShadow = true;
    terrain.add(shaft);

    const bellRoof = new THREE.Mesh(
      new THREE.ConeGeometry(tower.r * 1.5, 1.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x2b1d19, roughness: 0.9 }),
    );
    bellRoof.position.y = t2.y + tower.height + 0.8;
    bellRoof.castShadow = true;
    terrain.add(bellRoof);

    const bell = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xc9a24a, emissive: 0x6b4a10, emissiveIntensity: 0.4, metalness: 0.7, roughness: 0.4 }),
    );
    bell.rotation.x = Math.PI;
    bell.position.y = t2.y + tower.height - 1.2;
    terrain.add(bell);
  }

  /* ---------------- dynamic objects ---------------- */
  const player = makePlayer();
  scene.add(player.group);

  const lanterns = new Map();
  const motes = new Map();
  const shades = new Map();
  const drifters = new Map();
  const charms = new Map();
  const pads = [];

  const moteGeometry = new THREE.SphereGeometry(0.15, 12, 10);
  const moteMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.mote });
  const moteGlowMaterial = new THREE.SpriteMaterial({
    map: glowTex,
    color: 0xffd27a,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // A single point cloud carries the windblown leaves.
  const windCount = 260;
  const windPositions = new Float32Array(windCount * 3);
  const windGeo = new THREE.BufferGeometry();
  windGeo.setAttribute('position', new THREE.BufferAttribute(windPositions, 3));
  const leafCanvas = document.createElement('canvas');
  leafCanvas.width = leafCanvas.height = 32;
  const leaf = leafCanvas.getContext('2d');
  leaf.fillStyle = '#fff';
  leaf.beginPath();
  leaf.moveTo(3, 26);
  leaf.quadraticCurveTo(5, 6, 29, 5);
  leaf.quadraticCurveTo(27, 27, 3, 26);
  leaf.fill();
  const windPoints = new THREE.Points(
    windGeo,
    new THREE.PointsMaterial({
      color: 0xc8b77a,
      map: new THREE.CanvasTexture(leafCanvas),
      size: 0.42,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  windPoints.frustumCulled = false;
  windPoints.visible = false;
  scene.add(windPoints);
  const windRng = mulberry32(4242);
  const windSeed = new Float32Array(windCount * 3);
  for (let i = 0; i < windCount; i++) {
    windSeed[i * 3] = (windRng() - 0.5) * 70;
    windSeed[i * 3 + 1] = 0.4 + windRng() * 7;
    windSeed[i * 3 + 2] = (windRng() - 0.5) * 70;
  }

  let night = 0;
  let firstFrame = true;
  let elapsed = 0;
  let lastPlayerX = 0;
  let lastPlayerZ = 0;
  let facing = 0;
  let windPhase = 0;
  const cameraTarget = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const fogTarget = new THREE.Color();

  function resetDynamic() {
    for (const map of [lanterns, motes, shades, drifters, charms]) {
      for (const [, built] of map) {
        scene.remove(built.group ?? built);
      }
      map.clear();
    }
    for (const pad of pads) scene.remove(pad);
    pads.length = 0;
  }

  function setNight(map) {
    if (night === map.night) return;
    night = map.night;
    clearTerrain();
    resetDynamic();
    if (map.terrain.kind === 'circle') buildCircle(map);
    else if (map.terrain.kind === 'islands') buildIslands(map);
    else buildTiers(map);
    for (const pad of map.pads) {
      const mesh = makePad(pad);
      scene.add(mesh);
      pads.push(mesh);
    }
    firstFrame = true;
  }

  function syncLanterns(world) {
    for (const data of world.lanterns) {
      let built = lanterns.get(data.id);
      if (!built) {
        built = makeLantern();
        scene.add(built.group);
        lanterns.set(data.id, built);
      }
      built.group.position.set(data.x, data.y, data.z);
    }
  }

  function update(world, dt, view) {
    elapsed += dt;
    if (world.map) setNight(world.map);
    syncLanterns(world);

    const litCount = world.lanterns.filter((l) => l.lit).length;
    const ratio = world.lanterns.length ? litCount / world.lanterns.length : 0;

    for (const data of world.lanterns) {
      const built = lanterns.get(data.id);
      if (!built) continue;
      const target = data.lit ? 1.7 : 0.04;
      built.bodyMaterial.emissiveIntensity += (target - built.bodyMaterial.emissiveIntensity) * Math.min(1, dt * 5);
      built.light.intensity += ((data.lit ? 52 : 0) - built.light.intensity) * Math.min(1, dt * 4);
      built.glow.material.opacity += ((data.lit ? 0.7 : 0.16) - built.glow.material.opacity) * Math.min(1, dt * 4);
      built.glow.scale.setScalar((data.lit ? 4.6 : 1.1) + Math.sin(elapsed * 1.7 + data.x) * (data.lit ? 0.25 : 0.05));
      built.safeRing.material.opacity += ((data.lit ? 0.18 : 0) - built.safeRing.material.opacity) * Math.min(1, dt * 3);
    }

    // motes
    const seenMotes = new Set();
    for (const data of world.motes) {
      seenMotes.add(data.id);
      let mesh = motes.get(data.id);
      if (!mesh) {
        const group = new THREE.Group();
        const core = new THREE.Mesh(moteGeometry, moteMaterial);
        const glow = new THREE.Sprite(moteGlowMaterial);
        glow.scale.setScalar(1.05);
        group.add(core, glow);
        scene.add(group);
        mesh = { group, glow, phase: Math.random() * Math.PI * 2 };
        motes.set(data.id, mesh);
      }
      const bob = Math.sin(elapsed * 2.1 + mesh.phase) * 0.12;
      mesh.group.position.set(data.x, data.y + 0.72 + bob, data.z);
      mesh.group.rotation.y += dt * 0.8;
    }
    for (const [id, mesh] of motes) {
      if (seenMotes.has(id)) continue;
      scene.remove(mesh.group);
      motes.delete(id);
    }

    // shades
    const seenShades = new Set();
    for (const data of world.shades) {
      seenShades.add(data.id);
      let mesh = shades.get(data.id);
      if (!mesh) {
        const built = makeShade();
        scene.add(built.group);
        mesh = { ...built, phase: Math.random() * Math.PI * 2 };
        shades.set(data.id, mesh);
      }
      const stunned = data.state === 'stunned';
      const spawning = data.state === 'spawning';
      const opacity = spawning ? 0.45 : 1;
      mesh.group.scale.setScalar(spawning ? 0.6 + 0.4 * (1 - data.state_ticks_left / 30) : 1);
      mesh.group.position.set(data.x, data.baseY + 1.05 + Math.sin(elapsed * 1.6 + mesh.phase) * 0.1, data.z);
      mesh.group.rotation.y += dt * (stunned ? 0.2 : 0.7);
      mesh.coreMaterial.emissiveIntensity += ((stunned ? 0.15 : 0.55) - mesh.coreMaterial.emissiveIntensity) * Math.min(1, dt * 5);
      mesh.coreMaterial.opacity += ((stunned ? 0.55 : 0.92) * opacity - mesh.coreMaterial.opacity) * Math.min(1, dt * 5);
      mesh.stunRing.visible = stunned;
      if (stunned) mesh.stunRing.rotation.z += dt * 3;
    }
    for (const [id, mesh] of shades) {
      if (seenShades.has(id)) continue;
      scene.remove(mesh.group);
      shades.delete(id);
    }

    // drifters
    const seenDrifters = new Set();
    for (const data of world.drifters) {
      seenDrifters.add(data.id);
      let mesh = drifters.get(data.id);
      if (!mesh) {
        const built = makeDrifter();
        scene.add(built.group);
        mesh = { ...built, phase: Math.random() * Math.PI * 2 };
        drifters.set(data.id, mesh);
      }
      const hover = Math.sin(elapsed * 3 + mesh.phase) * 0.25;
      mesh.group.position.set(data.x, data.y + hover, data.z);
      mesh.group.rotation.y = Math.atan2(world.player.x - data.x, world.player.z - data.z);
      mesh.group.rotation.z = Math.sin(elapsed * 6 + mesh.phase) * 0.12;
      for (const [i, wing] of mesh.wings.entries()) {
        wing.rotation.z = (i === 0 ? 1 : -1) * (0.35 + Math.sin(elapsed * 9 + mesh.phase) * 0.35);
      }
      mesh.material.opacity = data.state === 'chase' ? 0.95 : 0.7;
    }
    for (const [id, mesh] of drifters) {
      if (seenDrifters.has(id)) continue;
      scene.remove(mesh.group);
      drifters.delete(id);
    }

    // charms
    for (const data of world.charms) {
      let mesh = charms.get(data.id);
      if (!mesh) {
        mesh = makeCharm();
        scene.add(mesh.group);
        charms.set(data.id, mesh);
      }
      mesh.group.visible = data.available;
      mesh.group.position.set(data.x, data.y + 1.1 + Math.sin(elapsed * 2.4 + data.x) * 0.15, data.z);
      mesh.core.rotation.y += dt * 1.4;
      mesh.ring.rotation.z += dt * 0.9;
    }

    // jump pads pulse
    for (const pad of pads) {
      pad.children[1].material.opacity = 0.55 + Math.sin(elapsed * 3) * 0.25;
    }

    // player
    const p = world.player;
    player.group.position.set(p.x, p.y, p.z);
    const dx = p.x - lastPlayerX;
    const dz = p.z - lastPlayerZ;
    const speed = Math.hypot(dx, dz) / Math.max(dt, 1e-4);
    if (speed > 0.4) {
      const target = Math.atan2(dx, dz);
      let delta = target - facing;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      facing += delta * Math.min(1, dt * 10);
    }
    player.group.rotation.y = facing;
    const bob = speed > 0.4 ? Math.abs(Math.sin(elapsed * 9)) * 0.07 : Math.sin(elapsed * 2) * 0.015;
    player.bodyGroup.position.y = bob;
    player.lantern.rotation.z = Math.sin(elapsed * 3.2) * 0.18;
    const charmActive = world.player.charm_until > world.sim_tick;
    player.light.intensity = 6 + p.carried * 0.9 + (charmActive ? 6 : 0);
    player.light.color.setHex(charmActive ? PALETTE.charm : PALETTE.lanternWarm);
    lastPlayerX = p.x;
    lastPlayerZ = p.z;

    // Show leaves during the warning and the gust.
    const windOn = world.wind.active || world.wind.warned;
    windPoints.material.opacity += ((windOn ? 0.55 : 0) - windPoints.material.opacity) * Math.min(1, dt * 3);
    windPoints.visible = windPoints.material.opacity > 0.01;
    if (windOn) {
      windPhase += dt * (world.wind.active ? 26 : 10);
      const a = (world.wind.dir_deg * Math.PI) / 180;
      for (let i = 0; i < windCount; i++) {
        const travel = ((windPhase + i * 3.7) % 60) - 30;
        windPositions[i * 3] = p.x + Math.cos(a) * travel + windSeed[i * 3] * 0.35;
        windPositions[i * 3 + 1] = p.y + windSeed[i * 3 + 1];
        windPositions[i * 3 + 2] = p.z + Math.sin(a) * travel + windSeed[i * 3 + 2] * 0.35;
      }
      windGeo.attributes.position.needsUpdate = true;
    }

    // camera
    cameraTarget.set(p.x, p.y + 1.25, p.z);
    const cosPitch = Math.cos(view.pitch);
    desiredCamera.set(
      cameraTarget.x - Math.sin(view.yaw) * view.dist * cosPitch,
      cameraTarget.y + Math.sin(view.pitch) * view.dist,
      cameraTarget.z - Math.cos(view.yaw) * view.dist * cosPitch,
    );
    desiredCamera.y = Math.max(desiredCamera.y, p.y + 1.1);
    if (firstFrame) {
      camera.position.copy(desiredCamera);
      firstFrame = false;
    } else {
      camera.position.lerp(desiredCamera, 1 - Math.exp(-10 * dt));
    }
    camera.lookAt(cameraTarget);

    // atmosphere shifts warmer with every lantern
    const warmColor = new THREE.Color(0x2a1d2e);
    fogTarget.copy(nightColor).lerp(warmColor, ratio * 0.9);
    scene.fog.color.lerp(fogTarget, Math.min(1, dt * 1.5));
    scene.background.copy(scene.fog.color);
    scene.fog.density = 0.008 - ratio * 0.0018;
    ambient.intensity = 0.15 + 0.55 * ratio;
    hemi.intensity = 0.8;
    warmLight.intensity = ratio * 40;
    warmLight.position.set(p.x * 0.3, 18, p.z * 0.3);
    stars.material.opacity = 0.8 - ratio * 0.45;
    moonLight.position.set(p.x + 40, 60, p.z + 24);
    moonLight.target.position.set(p.x, 0, p.z);
  }

  function render() {
    renderer.render(scene, camera);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener('resize', resize);

  return { update, render, resize, camera, setNight, domElement: renderer.domElement };
}

// Small deterministic PRNG for decorative scattering (never used by the sim).
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ISLAND_RADIUS = WORLD.mote_initial; // kept for backwards-compatible imports
