// Standard maps for the three nights (TICKET-02, Part 2).
//
// All angles are degrees measured from +X, counter-clockwise seen from above,
// on the XZ plane. Heights are metres, Y up. These numbers are fixed by the
// ticket: do not tune them.
import { TUNING, WORLD } from './config.js';

export const DEG = Math.PI / 180;

const round6 = (v) => Math.round(v * 1e6) / 1e6;

const pt = (r, deg, y = 0) => ({
  x: round6(r * Math.cos(deg * DEG)),
  y,
  z: round6(r * Math.sin(deg * DEG)),
});

/** `count` points on a circle, starting at `startDeg`, stepping evenly. */
function ring(count, r, startDeg = 0, y = 0, step = 360 / count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(pt(r, startDeg + i * step, y));
  return out;
}

function shifted(points, dx, dz = 0) {
  return points.map((p) => ({ x: round6(p.x + dx), y: p.y, z: round6(p.z + dz) }));
}

/** Pad direction is the unit vector from the pad to the target centre. */
function pad(x, y, z, targetX, targetZ, vy, horizontal) {
  const dx = targetX - x;
  const dz = targetZ - z;
  const len = Math.hypot(dx, dz);
  return {
    x,
    y,
    z,
    r: 1,
    vy,
    horizontal,
    dx: dx / len,
    dz: dz / len,
  };
}

/* ------------------------------------------------------------------ */
/* Night 1 - Dao Ben                                                   */
/* ------------------------------------------------------------------ */

const night1 = {
  night: 1,
  name: 'Đảo Bến',
  duration_s: TUNING.night1_duration_s,
  spawn: { x: 0, y: 0, z: 0 },
  spawn_facing: 0, // looking towards +Z
  terrain: { kind: 'circle', cx: 0, cz: 0, r: 40, y: 0 },
  obstacles: [],
  pads: [],
  lanterns: [
    { id: 'L1', x: 0, y: 0, z: 25 },
    { id: 'L2', x: 23.8, y: 0, z: 7.7 },
    { id: 'L3', x: 14.7, y: 0, z: -20.2 },
    { id: 'L4', x: -14.7, y: 0, z: -20.2 },
    { id: 'L5', x: -23.8, y: 0, z: 7.7 },
  ],
  mote_points: [...ring(8, 12, 0), ...ring(16, 33, 0, 0, 22.5)],
  shade_points: ring(12, 37, 15, 0, 30),
  drifter_points: [],
  charm_points: [],
  shade: { first_tick: 300, first_count: 2, interval_ticks: 480, max: 6, min_spawn_dist: 15 },
  drifter: null,
  wind: null,
  shade_speed: TUNING.shade_speed,
};

/* ------------------------------------------------------------------ */
/* Night 2 - Dao Cau                                                   */
/* ------------------------------------------------------------------ */

const motePerIsland = [...ring(4, 10, 0), ...ring(8, 22, 0, 0, 45)];
const shadePerIsland = ring(8, 26, 22.5, 0, 45);

const night2 = {
  night: 2,
  name: 'Đảo Cau',
  duration_s: TUNING.night2_duration_s,
  spawn: { x: 0, y: 0, z: 0 },
  spawn_facing: 0,
  terrain: {
    kind: 'islands',
    circles: [
      { cx: 0, cz: 0, r: 28, y: 0 },
      { cx: 70, cz: 0, r: 28, y: 0 },
    ],
    bridge: { x0: 26, x1: 44, z0: -2, z1: 2, y: 0 },
  },
  obstacles: [],
  pads: [
    pad(20, 0, 18, 70, 0, 14, 24),
    pad(50, 0, -18, 0, 0, 14, 24),
  ],
  lanterns: [
    { id: 'L1', x: 0, y: 0, z: 20 },
    { id: 'L2', x: 17, y: 0, z: -10 },
    { id: 'L3', x: -17, y: 0, z: -10 },
    { id: 'L4', x: 70, y: 0, z: 20 },
    { id: 'L5', x: 87, y: 0, z: -10 },
    { id: 'L6', x: 53, y: 0, z: -10 },
  ],
  mote_points: [...motePerIsland, ...shifted(motePerIsland, 70)],
  shade_points: [...shadePerIsland, ...shifted(shadePerIsland, 70)],
  drifter_points: [...shadePerIsland, ...shifted(shadePerIsland, 70)],
  charm_points: [{ id: 'C1', x: 35, y: 0, z: 0 }],
  shade: { first_tick: 300, first_count: 2, interval_ticks: 420, max: 8, min_spawn_dist: 15 },
  drifter: {
    first_tick: WORLD.drifter_spawn_first_tick,
    interval_ticks: WORLD.drifter_spawn_interval,
    max: WORLD.drifter_max,
  },
  wind: null,
  shade_speed: TUNING.shade_speed,
};

/* ------------------------------------------------------------------ */
/* Night 3 - Dao Chuong                                                */
/* ------------------------------------------------------------------ */

const night3 = {
  night: 3,
  name: 'Đảo Chuông',
  duration_s: TUNING.night3_duration_s,
  spawn: { x: 0, y: 0, z: 0 },
  spawn_facing: 0,
  terrain: {
    kind: 'tiers',
    radius: 45,
    tier1: { r0: 12, r1: 24, y: 3, half: 'z>0' },
    tier2: { r: 8, y: 6 },
    ramps: [
      { angle: 30, width: 3, r0: 24, r1: 30, y0: 0, y1: 3 },
      { angle: 150, width: 3, r0: 24, r1: 30, y0: 0, y1: 3 },
    ],
    tower: { r: 2, height: 8 },
  },
  obstacles: [{ kind: 'cylinder', cx: 0, cz: 0, r: 2, baseY: 6 }],
  pads: [pad(0, 3, 13, 0, 0, 12, 8)],
  lanterns: [
    { id: 'L1', x: 0, y: 6, z: 6 },
    { id: 'L2', x: 18, y: 3, z: 10 },
    { id: 'L3', x: -18, y: 3, z: 10 },
    { id: 'L4', x: 35, y: 0, z: -10 },
    { id: 'L5', x: -35, y: 0, z: -10 },
    { id: 'L6', x: 20, y: 0, z: -35 },
    { id: 'L7', x: -20, y: 0, z: -35 },
  ],
  mote_points: [
    ...ring(18, 34, 0, 0, 20),
    ...ring(8, 18, 20, 3, 20),
    ...ring(4, 5, 45, 6, 90),
  ],
  shade_points: ring(16, 43, 0, 0, 22.5),
  drifter_points: ring(16, 43, 0, 0, 22.5),
  charm_points: [
    { id: 'C1', x: 30, y: 0, z: 25 },
    { id: 'C2', x: -30, y: 0, z: 25 },
  ],
  shade: { first_tick: 300, first_count: 2, interval_ticks: 360, max: 10, min_spawn_dist: 15 },
  drifter: {
    first_tick: WORLD.drifter_spawn_first_tick,
    interval_ticks: WORLD.drifter_spawn_interval,
    max: WORLD.drifter_max,
  },
  wind: {
    first_tick: 1800,
    interval_ticks: 1800,
    duration_ticks: 300,
    warn_ticks: 120,
    speed: WORLD.wind_push_speed,
  },
  shade_speed: WORLD.shade_speed_night3,
};

export const MAPS = Object.freeze({ 1: night1, 2: night2, 3: night3 });

export function getMap(night) {
  const map = MAPS[night];
  if (!map) throw new Error(`unknown night ${night}`);
  return map;
}

/** Heights of every walkable surface that covers (x, z). Empty = void. */
export function surfaceHeightsAt(map, x, z) {
  const t = map.terrain;
  if (t.kind === 'circle') {
    return Math.hypot(x - t.cx, z - t.cz) <= t.r ? [t.y] : [];
  }
  if (t.kind === 'islands') {
    const out = [];
    for (const c of t.circles) {
      if (Math.hypot(x - c.cx, z - c.cz) <= c.r) out.push(c.y);
    }
    const b = t.bridge;
    if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) out.push(b.y);
    return out;
  }
  if (t.kind === 'tiers') {
    const out = [];
    const r = Math.hypot(x, z);
    if (r <= t.radius) out.push(0);
    if (z > 0 && r >= t.tier1.r0 && r <= t.tier1.r1) out.push(t.tier1.y);
    if (r <= t.tier2.r) out.push(t.tier2.y);
    for (const ramp of t.ramps) {
      const ca = Math.cos(ramp.angle * DEG);
      const sa = Math.sin(ramp.angle * DEG);
      const along = x * ca + z * sa;
      const perp = Math.abs(-x * sa + z * ca);
      if (along >= ramp.r0 && along <= ramp.r1 && perp <= ramp.width / 2) {
        const k = (ramp.r1 - along) / (ramp.r1 - ramp.r0);
        out.push(ramp.y0 + (ramp.y1 - ramp.y0) * k);
      }
    }
    return out;
  }
  return [];
}

/** Highest surface at (x, z), or null over the void. */
export function baseHeightAt(map, x, z) {
  const hs = surfaceHeightsAt(map, x, z);
  if (hs.length === 0) return null;
  let best = hs[0];
  for (const h of hs) if (h > best) best = h;
  return best;
}

/** Surface the player can stand on at height y (allows a small step up). */
export function supportHeightAt(map, x, z, y, tolerance = WORLD.step_tolerance) {
  const hs = surfaceHeightsAt(map, x, z);
  let best = null;
  for (const h of hs) {
    if (h <= y + tolerance && (best === null || h > best)) best = h;
  }
  return best;
}

/**
 * Vertical walls on Night 3: the raised tier-1 terrace is solid from y=0 to
 * y=3, so a player at ground level cannot walk through its rim. The ramps cut
 * openings in the outer rim. Tier 2 floats (it is the bell-tower platform), so
 * it has no wall underneath.
 */
export function blockedByTerrain(map, x, z, y) {
  const t = map.terrain;
  if (t.kind !== 'tiers') return false;
  if (y >= t.tier1.y - WORLD.step_tolerance) return false;
  if (z <= 0) return false;
  const r = Math.hypot(x, z);
  if (Math.abs(r - t.tier1.r0) < 0.5) return true;
  if (Math.abs(r - t.tier1.r1) < 0.5) {
    for (const ramp of t.ramps) {
      const ca = Math.cos(ramp.angle * DEG);
      const sa = Math.sin(ramp.angle * DEG);
      const perp = Math.abs(-x * sa + z * ca);
      if (perp <= ramp.width / 2) return false;
    }
    return true;
  }
  return false;
}

/** Solid props such as the bell tower. */
export function blockedByObstacle(map, x, z, y) {
  for (const o of map.obstacles ?? []) {
    if (o.kind !== 'cylinder') continue;
    if (y < o.baseY - WORLD.step_tolerance) continue;
    if (Math.hypot(x - o.cx, z - o.cz) < o.r + WORLD.player_radius) return true;
  }
  return false;
}
