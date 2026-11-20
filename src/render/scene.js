import * as THREE from 'three';
import { WORLD } from '../sim/config.js';

const WARM = 0xffb45e;
const VIOLET = 0xb98cff;

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
    color: 0xffd9a0,
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

  const light = new THREE.PointLight(WARM, 0, 26, 2);
  light.position.y = 3.9;
  group.add(light);

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
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

  const safeRing = new THREE.Mesh(
    new THREE.RingGeometry(3.92, 4.02, 56),
    new THREE.MeshBasicMaterial({ color: WARM, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  safeRing.rotation.x = -Math.PI / 2;
  safeRing.position.y = 0.03;
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
    new THREE.ConeGeometry(0.62, 0.4, 22, 1, true),
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
      map: glowTexture(),
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
    color: 0x1b1026,
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

export function createStage(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const nightColor = new THREE.Color(0x080a17);
  const warmColor = new THREE.Color(0x2a1d2e);
  scene.background = nightColor.clone();
  scene.fog = new THREE.FogExp2(nightColor.clone(), 0.014);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 8, -11);

  const hemi = new THREE.HemisphereLight(0x6a7fc0, 0x1a1424, 0.85);
  scene.add(hemi);

  const moonLight = new THREE.DirectionalLight(0xa9c0ff, 0.85);
  moonLight.position.set(28, 42, 18);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(2048, 2048);
  moonLight.shadow.camera.left = -36;
  moonLight.shadow.camera.right = 36;
  moonLight.shadow.camera.top = 36;
  moonLight.shadow.camera.bottom = -36;
  moonLight.shadow.camera.near = 1;
  moonLight.shadow.camera.far = 140;
  moonLight.shadow.bias = -0.0008;
  scene.add(moonLight);
  scene.add(moonLight.target);

  const warmLight = new THREE.PointLight(0xff9a4a, 0, 90, 2);
  warmLight.position.set(0, 16, 0);
  scene.add(warmLight);

  // --- island -------------------------------------------------------
  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(WORLD.island_radius, WORLD.island_radius + 1.6, 3.2, 72),
    new THREE.MeshStandardMaterial({ color: 0x36486a, roughness: 1 }),
  );
  island.position.y = -1.6;
  island.receiveShadow = true;
  scene.add(island);

  const meadow = new THREE.Mesh(
    new THREE.CircleGeometry(WORLD.island_radius, 72),
    new THREE.MeshStandardMaterial({ color: 0x3d5170, roughness: 1 }),
  );
  meadow.rotation.x = -Math.PI / 2;
  meadow.position.y = 0.01;
  meadow.receiveShadow = true;
  scene.add(meadow);

  const path = new THREE.Mesh(
    new THREE.RingGeometry(6.2, 8.4, 64),
    new THREE.MeshStandardMaterial({ color: 0x3d4c63, roughness: 1 }),
  );
  path.rotation.x = -Math.PI / 2;
  path.position.y = 0.02;
  path.receiveShadow = true;
  scene.add(path);

  const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x243049, roughness: 1 });
  const rockGeometry = new THREE.DodecahedronGeometry(0.6, 0);
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 6 + Math.random() * (WORLD.island_radius - 8);
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(Math.cos(angle) * radius, 0.1, Math.sin(angle) * radius);
    const scale = 0.5 + Math.random() * 1.1;
    rock.scale.set(scale, scale * (0.6 + Math.random() * 0.6), scale);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  }

  const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x2f5a52, roughness: 1 });
  const grassGeometry = new THREE.ConeGeometry(0.12, 0.7, 5);
  for (let i = 0; i < 90; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * (WORLD.island_radius - 3);
    const tuft = new THREE.Mesh(grassGeometry, grassMaterial);
    tuft.position.set(Math.cos(angle) * radius, 0.35, Math.sin(angle) * radius);
    tuft.rotation.y = Math.random() * Math.PI;
    tuft.scale.setScalar(0.6 + Math.random() * 0.9);
    scene.add(tuft);
  }

  // sea of clouds below the island
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0x1a2236, roughness: 1 });
  const cloudGeometry = new THREE.SphereGeometry(1, 10, 8);
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 36 + Math.random() * 26;
    const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
    cloud.position.set(Math.cos(angle) * radius, -9 + Math.random() * 5, Math.sin(angle) * radius);
    cloud.scale.set(4 + Math.random() * 5, 1.4 + Math.random() * 1.4, 4 + Math.random() * 5);
    scene.add(cloud);
  }

  // stars + moon
  const starPositions = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.85);
    const radius = 230;
    starPositions[i * 3] = Math.cos(theta) * Math.sin(phi) * radius;
    starPositions[i * 3 + 1] = Math.cos(phi) * radius + 10;
    starPositions[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * radius;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0xc6d6ff, size: 1.6, transparent: true, opacity: 0.8, fog: false }),
  );
  scene.add(stars);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(7, 24, 18),
    new THREE.MeshBasicMaterial({ color: 0xfff1cd, fog: false }),
  );
  moon.position.set(-95, 95, -150);
  scene.add(moon);
  const moonGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color: 0xdfe6ff,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  moonGlow.position.copy(moon.position);
  moonGlow.scale.setScalar(58);
  scene.add(moonGlow);

  // --- dynamic objects ---------------------------------------------
  const player = makePlayer();
  scene.add(player.group);

  const lanterns = new Map();
  const motes = new Map();
  const shades = new Map();

  const moteGeometry = new THREE.SphereGeometry(0.15, 12, 10);
  const moteMaterial = new THREE.MeshBasicMaterial({ color: 0xffe9ad });
  const moteGlowMaterial = new THREE.SpriteMaterial({
    map: glowTexture(),
    color: 0xffd27a,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  let firstFrame = true;
  let elapsed = 0;
  let lastPlayerX = 0;
  let lastPlayerZ = 0;
  let facing = 0;
  const cameraTarget = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const fogTarget = new THREE.Color();

  function syncLanterns(world) {
    for (const data of world.lanterns) {
      if (!lanterns.has(data.id)) {
        const built = makeLantern();
        built.group.position.set(data.x, 0, data.z);
        scene.add(built.group);
        lanterns.set(data.id, built);
      }
    }
  }

  function update(world, dt, view) {
    elapsed += dt;
    syncLanterns(world);

    const litCount = world.lanterns.filter((l) => l.lit).length;
    const ratio = world.lanterns.length ? litCount / world.lanterns.length : 0;

    for (const data of world.lanterns) {
      const built = lanterns.get(data.id);
      if (!built) continue;
      built.group.position.set(data.x, 0, data.z);
      const target = data.lit ? 1.7 : 0.04;
      built.bodyMaterial.emissiveIntensity += (target - built.bodyMaterial.emissiveIntensity) * Math.min(1, dt * 5);
      built.light.intensity += ((data.lit ? 46 : 0) - built.light.intensity) * Math.min(1, dt * 4);
      built.glow.material.opacity += ((data.lit ? 0.7 : 0.16) - built.glow.material.opacity) * Math.min(1, dt * 4);
      built.glow.scale.setScalar((data.lit ? 4.6 : 1.1) + Math.sin(elapsed * 1.7 + data.x) * (data.lit ? 0.25 : 0.05));
      built.safeRing.material.opacity += ((data.lit ? 0.16 : 0) - built.safeRing.material.opacity) * Math.min(1, dt * 3);
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
      mesh.group.position.set(data.x, 0.72 + bob, data.z);
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
      mesh.group.position.set(data.x, 1.05 + Math.sin(elapsed * 1.6 + mesh.phase) * 0.1, data.z);
      mesh.group.rotation.y += dt * (stunned ? 0.2 : 0.7);
      mesh.coreMaterial.emissiveIntensity += ((stunned ? 0.15 : 0.55) - mesh.coreMaterial.emissiveIntensity) * Math.min(1, dt * 5);
      mesh.coreMaterial.color.lerp(new THREE.Color(stunned ? 0x6b4a9e : 0x1b1026), Math.min(1, dt * 5));
      mesh.coreMaterial.opacity += ((stunned ? 0.55 : 0.92) - mesh.coreMaterial.opacity) * Math.min(1, dt * 5);
      mesh.stunRing.visible = stunned;
      if (stunned) mesh.stunRing.rotation.z += dt * 3;
    }
    for (const [id, mesh] of shades) {
      if (seenShades.has(id)) continue;
      scene.remove(mesh.group);
      shades.delete(id);
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
    player.light.intensity = 6 + p.carried * 1.4;
    lastPlayerX = p.x;
    lastPlayerZ = p.z;

    // camera
    cameraTarget.set(p.x, p.y + 1.25, p.z);
    const cosPitch = Math.cos(view.pitch);
    desiredCamera.set(
      cameraTarget.x - Math.sin(view.yaw) * view.dist * cosPitch,
      cameraTarget.y + Math.sin(view.pitch) * view.dist,
      cameraTarget.z - Math.cos(view.yaw) * view.dist * cosPitch,
    );
    desiredCamera.y = Math.max(desiredCamera.y, 1.1);
    if (firstFrame) {
      camera.position.copy(desiredCamera);
      firstFrame = false;
    } else {
      camera.position.lerp(desiredCamera, 1 - Math.exp(-10 * dt));
    }
    camera.lookAt(cameraTarget);

    // atmosphere shifts warmer with every lantern
    fogTarget.copy(nightColor).lerp(warmColor, ratio * 0.9);
    scene.fog.color.lerp(fogTarget, Math.min(1, dt * 1.5));
    scene.background.copy(scene.fog.color);
    scene.fog.density = 0.014 - ratio * 0.003;
    hemi.intensity = 0.8 + ratio * 0.45;
    warmLight.intensity = ratio * 34;
    warmLight.position.set(p.x * 0.3, 14, p.z * 0.3);
    stars.material.opacity = 0.8 - ratio * 0.45;
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

  return { update, render, resize, camera, domElement: renderer.domElement };
}
