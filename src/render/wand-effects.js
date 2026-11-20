import * as THREE from 'three';
import { LIGHTNING } from '../sim/extra-spells.js';

const colors = { pulse: 0x83fff3, dash: 0x92b7ff, kindle: 0xffb568, motes: 0xffde83, guide: 0x90e8da };

export function createWandEffects(scene) {
  const effects = [];
  const origin = new THREE.Vector3();
  const point = new THREE.Vector3();
  const ringGeometry = new THREE.RingGeometry(0.87, 1, 48);
  const hilt = new THREE.Vector3();
  let gesture = 0;

  function spell(type, player, targets, reducedMotion) {
    if (reducedMotion) return;
    gesture = 0.38;
    player.tip.getWorldPosition(origin);
    if (type === 'pulse' || type === 'dash') {
      const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({
        color: colors[type], transparent: true, opacity: 0.8, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      player.group.getWorldPosition(hilt);
      ring.position.copy(hilt).y += 0.18;
      ring.rotation.x = -Math.PI / 2;
      scene.add(ring);
      effects.push({ ring, object: ring, max: type === 'pulse' ? 5 : 1.8, age: 0, lifetime: 0.55 });
      if (type === 'pulse') return;
    }
    for (const target of targets) {
      const end = new THREE.Vector3(target.x, target.y, target.z);
      const curve = new THREE.QuadraticBezierCurve3(origin.clone(),
        origin.clone().lerp(end, 0.5).add(new THREE.Vector3(0, type === 'guide' ? 4.5 : 1.4, 0)), end);
      const positions = new THREE.BufferAttribute(new Float32Array(36 * 3), 3);
      const geometry = new THREE.BufferGeometry().setAttribute('position', positions);
      const object = new THREE.Points(geometry, new THREE.PointsMaterial({
        color: colors[type], size: type === 'guide' ? 0.18 : 0.11,
        transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      object.frustumCulled = false;
      scene.add(object);
      effects.push({ object, positions, curve, age: 0, lifetime: type === 'guide' ? 1.65 : 0.9 });
    }
  }

  function clear() {
    gesture = 0;
    while (effects.length) remove(effects.pop());
  }

  function lightning(cast, wandTip, reducedMotion) {
    if (reducedMotion) return;
    gesture = 0.38;
    const vertices = [];
    const start = new THREE.Vector3(cast.x, cast.y + 0.9, cast.z);
    wandTip.getWorldPosition(point);
    if (start.distanceToSquared(point) < 4) start.copy(point);
    for (let branch = -2; branch <= 2; branch++) {
      const angle = cast.facing + branch * LIGHTNING.halfAngle / 2;
      let prev = start;
      for (let i = 1; i <= 12; i++) {
        const t = i / 12;
        const distance = LIGHTNING.range * t;
        const jitter = i === 12 ? 0 : 0.24 * Math.sin(i * 5.3 + branch * 4.7) * Math.sin(Math.PI * t);
        const next = new THREE.Vector3(
          cast.x + Math.sin(angle) * distance + Math.cos(angle) * jitter,
          start.y + (i === 12 ? 0 : 0.23 * Math.sin(i * 7 + branch)),
          cast.z + Math.cos(angle) * distance - Math.sin(angle) * jitter,
        );
        vertices.push(...prev.toArray(), ...next.toArray());
        prev = next;
      }
    }
    const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const object = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
      color: 0xc5edff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    scene.add(object);
    effects.push({ object, age: 0, lifetime: 0.42 });
  }

  function remove(effect) {
    scene.remove(effect.object);
    effect.object.material.dispose();
    if (!effect.ring) effect.object.geometry.dispose();
  }

  function update(dt) {
    gesture = Math.max(0, gesture - dt);
    for (let i = effects.length - 1; i >= 0; i--) {
      const effect = effects[i];
      effect.age += dt;
      const t = effect.age / effect.lifetime;
      if (t >= 1) {
        remove(effect);
        effects.splice(i, 1);
        continue;
      }
      effect.object.material.opacity = Math.min(0.92, (1 - t) * 2);
      if (effect.ring) {
        effect.ring.scale.setScalar(Math.max(0.2, t * effect.max));
      } else if (effect.positions) {
        for (let j = 0; j < effect.positions.count; j++) {
          const travel = THREE.MathUtils.clamp(t * 1.5 - j / 80, 0, 1);
          effect.curve.getPoint(travel, point);
          const curl = Math.sin(j * 0.83 + t * 9) * 0.18;
          effect.positions.setXYZ(j, point.x + curl, point.y + Math.cos(j * 1.2 + t * 8) * 0.14, point.z - curl);
        }
        effect.positions.needsUpdate = true;
      }
    }
    return gesture / 0.38;
  }

  return { spell, lightning, update, clear };
}
