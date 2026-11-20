// Deterministic 60 Hz game simulation (Contract v1.2).
//
// This module has no rendering, no DOM and no GPU dependency: the browser and
// the headless CLI run exactly the same code, which is what makes the
// Test Contract evidence trustworthy.
import { TUNING, WORLD } from './config.js';
import { makeRng } from './rng.js';
import { BROOM, LIGHTNING, lightningHits } from './extra-spells.js';
import { ContractError } from './contract.js';
import {
  getMap,
  baseHeightAt,
  supportHeightAt,
  blockedByTerrain,
  blockedByObstacle,
  DEG,
} from './maps.js';

export const TICK_RATE = 60;
export const SECONDS_PER_TICK = 1 / 60;

const DT = SECONDS_PER_TICK;
const fuelUnits = (fuel) => Math.round(fuel * TICK_RATE);
export const lanternFuel = (lantern) => lantern.fuel_units / TICK_RATE;
const roundedFuel = (lantern) => Math.round(lanternFuel(lantern) * 10) / 10;

export function carryCapacity(world) {
  return Math.min(world.tuning.capacity_max, world.tuning.carry_capacity + 2 * world.player.successful_lights);
}

export function lanternGoal(world) {
  return Math.ceil(world.tuning.win_ratio * world.lanterns.length);
}

export function lightingCost(world, lantern) {
  return lantern.ever_lit ? world.tuning.relight_cost : world.tuning.lantern_cost;
}

export function lanternHasSafeZone(world, lantern) {
  return lantern.lit && lantern.fuel_units >= fuelUnits(world.tuning.low_fuel_threshold);
}

const isWeak = (world, lantern) => lantern.lit && !lanternHasSafeZone(world, lantern);

const round3 = (v) => {
  const x = Math.round((v + Number.EPSILON) * 1000) / 1000;
  return Object.is(x, -0) ? 0 : x;
};

function emit(world, name, data) {
  world.events.push({ type: 'event', tick: world.tick, name, data });
}

const shadeNum = (id) => Number.parseInt(String(id).replace(/\D/g, ''), 10) || 0;

/* ------------------------------------------------------------------ */
/* Construction                                                        */
/* ------------------------------------------------------------------ */

export function createWorld({ seed = 0, night = 1, scenario = null, tuning = TUNING, cfg = WORLD } = {}) {
  const map = getMap(night);
  const windCfg = map.wind;

  const world = {
    seed,
    tuning,
    cfg,
    map,
    night,
    rng: makeRng(seed),
    tick: 0, // steps taken, includes paused steps
    sim_tick: 0, // gameplay steps only
    state: 'playing', // playing | paused | won | lost
    end_reason: null,
    score: 0,
    duration_s: map.duration_s,
    player: {
      x: map.spawn.x,
      y: map.spawn.y,
      z: map.spawn.z,
      vx: 0,
      vy: 0,
      vz: 0,
      facing: map.spawn_facing,
      grounded: true,
      carried: 0,
      successful_lights: 0,
      flames: tuning.flames,
      invuln_until: 0,
      dash_until: 0,
      dash_ready_at: 0,
      dash_dx: 0,
      dash_dz: 1,
      pulse_ready_at: 0,
      charm_until: 0,
      launched: false,
      falling: false,
      falling_until: 0,
    },
    lanterns: map.lanterns.map((l) => ({
      id: l.id,
      x: l.x,
      y: l.y,
      z: l.z,
      lit: false,
      deposited: 0,
      fuel_units: 0,
      ever_lit: false,
      relit_count: 0,
    })),
    motes: [],
    shades: [],
    drifters: [],
    charms: map.charm_points.map((c) => ({
      id: c.id,
      x: c.x,
      y: c.y,
      z: c.z,
      available: true,
      respawn_at: 0,
    })),
    counters: { mote: 0, shade: 0, drifter: 0 },
    random_motes: true,
    random_shades: true,
    random_drifters: true,
    wind_enabled: true,
    wind: {
      active: false,
      dir_deg: 0,
      next_at: windCfg ? windCfg.first_tick : Number.POSITIVE_INFINITY,
      warned: false,
      speed: windCfg ? windCfg.speed : 0,
    },
    input: {
      move: [0, 0],
      cam_yaw_deg: 0,
      buttons: { jump: false, interact: false, pulse: false, dash: false, pause: false },
    },
    prevButtons: { jump: false, interact: false, pulse: false, dash: false, pause: false },
    frames: [],
    frameIndex: 0,
    events: [],
  };

  applyScenario(world, scenario);
  return world;
}

/** Emit the `night_start` event at tick 0 (the CLI and the browser call this). */
export function startNight(world) {
  world.events.push({ type: 'event', tick: 0, name: 'night_start', data: { night: world.night } });
}

/** Attach validated input frames (see src/sim/contract.js). */
export function setFrames(world, frames) {
  world.frames = frames ?? [];
  world.frameIndex = 0;
}

export function drainEvents(world) {
  if (world.events.length === 0) return [];
  const out = world.events;
  world.events = [];
  return out;
}

export function timeLeft(world) {
  return world.duration_s - world.sim_tick / TICK_RATE;
}

/* ------------------------------------------------------------------ */
/* Scenario construction (no events, no score - contract section D)    */
/* ------------------------------------------------------------------ */

function applyScenario(world, rawScenario) {
  const sc = rawScenario ?? {};
  const map = world.map;
  const p = world.player;

  if (sc.player) {
    if (sc.player.pos) {
      p.x = sc.player.pos[0];
      p.y = sc.player.pos[1];
      p.z = sc.player.pos[2];
      const support = supportHeightAt(map, p.x, p.z, p.y);
      p.grounded = support !== null && Math.abs(p.y - support) < 1e-6;
    }
    if (sc.player.carried !== undefined) p.carried = sc.player.carried;
    if (sc.player.successful_lights !== undefined) p.successful_lights = sc.player.successful_lights;
    if (sc.player.flames !== undefined) p.flames = sc.player.flames;
    if (sc.player.invuln_ticks !== undefined) p.invuln_until = sc.player.invuln_ticks;
    if (sc.player.dash_cd_ticks !== undefined) p.dash_ready_at = sc.player.dash_cd_ticks;
    if (sc.player.pulse_cd_ticks !== undefined) p.pulse_ready_at = sc.player.pulse_cd_ticks;
    if (sc.player.charm_ticks !== undefined) p.charm_until = sc.player.charm_ticks;
  }

  if (sc.random_motes !== undefined) world.random_motes = sc.random_motes;
  if (sc.random_shades !== undefined) world.random_shades = sc.random_shades;
  if (sc.random_drifters !== undefined) world.random_drifters = sc.random_drifters;
  if (sc.wind_enabled !== undefined) world.wind_enabled = sc.wind_enabled;

  for (const patch of sc.lanterns ?? []) {
    const lantern = world.lanterns.find((l) => l.id === patch.id);
    if (!lantern) continue;
    if (patch.pos) {
      lantern.x = patch.pos[0];
      lantern.y = patch.pos[1];
      lantern.z = patch.pos[2];
    }
    if (patch.deposited !== undefined) lantern.deposited = patch.deposited;
    if (patch.ever_lit !== undefined) lantern.ever_lit = patch.ever_lit;
    lantern.lit = patch.lit ?? (lantern.lit || lantern.deposited >= lightingCost(world, lantern));
    if (lantern.lit) {
      lantern.ever_lit = true;
      lantern.fuel_units = fuelUnits(patch.fuel ?? world.tuning.fuel_max);
    }
  }

  if (sc.motes) {
    for (const m of sc.motes) addMote(world, m[0], m[1] ?? 0, m[2], 'random', null);
  } else if (world.random_motes) {
    spawnInitialMotes(world);
  }

  if (sc.shades) {
    world.shades = [];
    for (const s of sc.shades) {
      const baseY = baseHeightAt(map, s.pos[0], s.pos[2]) ?? s.pos[1] ?? 0;
      const d = Math.hypot(p.x - s.pos[0], p.z - s.pos[2]);
      const state = s.state ?? (d <= WORLD.shade_detect_m ? 'chase' : 'wander');
      const shade = {
        id: s.id ?? nextShadeId(world),
        x: s.pos[0],
        z: s.pos[2],
        baseY,
        state,
        state_until: 0,
        wander_dx: 1,
        wander_dz: 0,
        wander_until: 0,
        stun_push_left: 0,
        push_dx: 1,
        push_dz: 0,
        recoil_left: 0,
        recoil_dx: 1,
        recoil_dz: 0,
        safe_push_until: 0,
        target_lantern_id: s.target_lantern_id ?? null,
        drain_ticks: 0,
      };
      if (s.state_ticks_left !== undefined) {
        shade.state_until = s.state_ticks_left;
        if (state === 'stunned') shade.stun_push_left = Math.min(WORLD.pulse_push_ticks, s.state_ticks_left);
      }
      if (state === 'recoil') shade.recoil_left = s.state_ticks_left ?? WORLD.shade_recoil_ticks;
      world.shades.push(shade);
    }
  }

  if (sc.drifters) {
    world.drifters = sc.drifters.map((d, i) => ({
      id: d.id ?? `D${i + 1}`,
      x: d.pos[0],
      z: d.pos[2],
      y: d.pos[1],
      state: d.state ?? 'idle',
      state_until: d.state_ticks_left ?? 0,
      stolen: d.stolen ?? 0,
      steal_done: (d.stolen ?? 0) > 0,
      wander_dx: 1,
      wander_dz: 0,
      wander_until: 0,
      remove_at: 0,
    }));
  }

  if (sc.charms) {
    world.charms = sc.charms.map((c, i) => ({
      id: c.id ?? `C${i + 1}`,
      x: c.pos[0],
      y: c.pos[1] ?? baseHeightAt(map, c.pos[0], c.pos[2]) ?? 0,
      z: c.pos[2],
      available: c.available ?? true,
      respawn_at: c.respawn_s !== undefined ? Math.round(c.respawn_s * TICK_RATE) : 0,
    }));
  }

  if (sc.time_left_s !== undefined) world.duration_s = sc.time_left_s;
}

function nextMoteId(world) {
  return `M${++world.counters.mote}`;
}

function addMote(world, x, y, z, kind, ttlUntil) {
  const mote = { id: nextMoteId(world), x, y, z, kind, ttl_until: ttlUntil };
  world.motes.push(mote);
  return mote;
}

function shuffleInPlace(list, rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function spawnInitialMotes(world) {
  const points = shuffleInPlace([...world.map.mote_points], world.rng);
  const count = Math.min(WORLD.mote_initial, points.length);
  for (let i = 0; i < count; i++) {
    addMote(world, points[i].x, points[i].y, points[i].z, 'random', null);
  }
}

function nextShadeId(world) {
  return `S${++world.counters.shade}`;
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

function applyFrames(world, stepTick) {
  while (world.frameIndex < world.frames.length) {
    const frame = world.frames[world.frameIndex];
    if (frame.tick > stepTick) break;
    world.frameIndex++;
    if (frame.move !== undefined) world.input.move = [frame.move[0], frame.move[1]];
    if (frame.cam_yaw_deg !== undefined) world.input.cam_yaw_deg = frame.cam_yaw_deg;
    for (const key of ['jump', 'interact', 'pulse', 'dash', 'pause']) {
      if (frame[key] !== undefined) world.input.buttons[key] = frame[key];
    }
  }
}

function applyLiveInput(world, input) {
  if (input.move) world.input.move = [input.move[0], input.move[1]];
  if (input.cam_yaw_deg !== undefined) world.input.cam_yaw_deg = input.cam_yaw_deg;
  for (const key of ['jump', 'interact', 'pulse', 'dash', 'pause']) {
    if (input[key] !== undefined) world.input.buttons[key] = Boolean(input[key]);
  }
}

function readEdges(world) {
  const buttons = world.input.buttons;
  const edges = {
    jump: buttons.jump && !world.prevButtons.jump,
    interact: buttons.interact && !world.prevButtons.interact,
    pulse: buttons.pulse && !world.prevButtons.pulse,
    dash: buttons.dash && !world.prevButtons.dash,
    pause: buttons.pause && !world.prevButtons.pause,
  };
  world.prevButtons = { ...buttons };
  return edges;
}

function worldMove(world) {
  const move = world.input.move;
  let mx = move[0];
  let mz = move[1];
  const length = Math.hypot(mx, mz);
  if (length > 1) {
    mx /= length;
    mz /= length;
  }
  const theta = (world.input.cam_yaw_deg * Math.PI) / 180;
  return {
    wx: mx * Math.cos(theta) + mz * Math.sin(theta),
    wz: -mx * Math.sin(theta) + mz * Math.cos(theta),
  };
}

/* ------------------------------------------------------------------ */
/* Per-tick systems                                                    */
/* ------------------------------------------------------------------ */

function updateWind(world, now) {
  const cfg = world.map.wind;
  const w = world.wind;
  if (!cfg || !world.wind_enabled) {
    w.active = false;
    return;
  }
  if (!w.warned && now >= w.next_at - cfg.warn_ticks) {
    w.dir_deg = round3(world.rng() * 360);
    w.warned = true;
  }
  if (now >= w.next_at && now < w.next_at + cfg.duration_ticks) {
    w.active = true;
  } else if (now >= w.next_at + cfg.duration_ticks) {
    w.active = false;
    w.next_at += cfg.interval_ticks;
    w.warned = false;
  } else {
    w.active = false;
  }
}

function expireTimers(world, now) {
  if (world.motes.some((m) => m.ttl_until !== null)) {
    world.motes = world.motes.filter((m) => m.ttl_until === null || now < m.ttl_until);
  }
  for (const c of world.charms) {
    if (!c.available && now >= c.respawn_at) c.available = true;
  }
}

function movePlayer(world, now, edges) {
  const p = world.player;

  if (p.falling) {
    p.vy -= WORLD.gravity * DT;
    p.y += p.vy * DT;
    if (now >= p.falling_until) respawnPlayer(world, now);
    return;
  }

  const charmActive = now < p.charm_until;
  if (edges.dash && !p.broom_mounted && now >= p.dash_until) {
    const ready = charmActive || now >= p.dash_ready_at;
    if (ready) startDash(world, now);
  }
  const dashing = now < p.dash_until;

  if (dashing) {
    p.vx = p.dash_dx * TUNING.dash_speed;
    p.vz = p.dash_dz * TUNING.dash_speed;
  } else if (!p.launched) {
    const { wx, wz } = worldMove(world);
    const speed = charmActive ? WORLD.charm_speed : TUNING.player_speed;
    p.vx = wx * speed;
    p.vz = wz * speed;
    if (wx !== 0 || wz !== 0) p.facing = Math.atan2(wx, wz);
  }

  if (world.wind.active) {
    p.vx += Math.cos(world.wind.dir_deg * DEG) * world.wind.speed;
    p.vz += Math.sin(world.wind.dir_deg * DEG) * world.wind.speed;
  }

  const nx = p.x + p.vx * DT;
  const nz = p.z + p.vz * DT;
  if (canStand(world, nx, nz, p.y)) {
    p.x = nx;
    p.z = nz;
  } else if (canStand(world, nx, p.z, p.y)) {
    p.x = nx;
    p.vx = 0;
    p.vz = 0;
  } else if (canStand(world, p.x, nz, p.y)) {
    p.z = nz;
    p.vx = 0;
    p.vz = 0;
  } else {
    p.vx = 0;
    p.vz = 0;
  }

  let support = supportHeightAt(world.map, p.x, p.z, p.y);
  if (support !== null && support > p.y && support <= p.y + WORLD.step_tolerance) {
    p.y = support;
    p.vy = 0;
    p.grounded = true;
  }

  const flying = now < (p.broom_until ?? 0);
  if (edges.jump && p.grounded && !dashing && !flying) {
    p.vy = WORLD.jump_speed;
    p.grounded = false;
  }

  if (flying) {
    p.vy = Math.min(BROOM.riseSpeed, Math.max(0, (p.broom_ceiling - p.y) / DT));
    p.y += p.vy * DT;
    p.grounded = false;
  } else if (dashing) {
    p.vy = 0;
  } else {
    p.vy -= WORLD.gravity * DT;
    p.y += p.vy * DT;
  }

  support = supportHeightAt(world.map, p.x, p.z, p.y);
  if (support === null) {
    p.grounded = false;
  } else if (!flying && p.y <= support && p.vy <= 0) {
    p.y = support;
    p.vy = 0;
    p.grounded = true;
    p.launched = false;
    p.broom_mounted = false;
  } else {
    p.grounded = false;
  }

  checkJumpPads(world);

  if (p.y < WORLD.fall_y) triggerFall(world, now);
}

function canStand(world, x, z, y) {
  if (blockedByTerrain(world.map, x, z, y)) return false;
  if (blockedByObstacle(world.map, x, z, y)) return false;
  if (!world.tuning.fall_enabled && supportHeightAt(world.map, x, z, y) === null) return false;
  return true;
}

function mountBroom(world, now) {
  const p = world.player;
  if (!p.grounded || p.falling || now < p.dash_until || now < (p.broom_ready_at ?? 0)) return;
  p.broom_mounted = true;
  p.broom_until = now + BROOM.duration;
  p.broom_ready_at = now + BROOM.cooldown;
  p.broom_ceiling = p.y + BROOM.height;
  emit(world, 'broom', {});
}

function castLightning(world, now) {
  const p = world.player;
  if (p.falling || p.carried < LIGHTNING.cost || now < (p.lightning_ready_at ?? 0)) return;
  p.carried -= LIGHTNING.cost;
  p.lightning_ready_at = now + LIGHTNING.cooldown;
  const stunned_ids = [];
  for (const shade of world.shades) {
    if (!lightningHits(p, shade)) continue;
    shade.state = 'stunned';
    shade.target_lantern_id = null;
    shade.state_until = Math.max(shade.state_until, now + LIGHTNING.stun);
    shade.stun_push_left = 0;
    stunned_ids.push(shade.id);
  }
  emit(world, 'lightning', { x: p.x, y: p.y, z: p.z, facing: p.facing, stunned_ids });
}

function startDash(world, now) {
  const p = world.player;
  const { wx, wz } = worldMove(world);
  let dx = wx;
  let dz = wz;
  if (Math.hypot(dx, dz) < 1e-9) {
    dx = Math.sin(p.facing);
    dz = Math.cos(p.facing);
  } else {
    const len = Math.hypot(dx, dz);
    dx /= len;
    dz /= len;
  }
  p.dash_dx = dx;
  p.dash_dz = dz;
  p.dash_until = now + WORLD.dash_ticks;
  p.dash_ready_at = now + WORLD.dash_cooldown_ticks;
  p.vy = 0;
  emit(world, 'dash', {});
}

function checkJumpPads(world) {
  const p = world.player;
  if (!p.grounded || p.falling) return;
  for (const pad of world.map.pads) {
    if (Math.abs(p.y - pad.y) > 0.4) continue;
    if (Math.hypot(p.x - pad.x, p.z - pad.z) > pad.r) continue;
    p.vy = pad.vy;
    p.vx = pad.dx * pad.horizontal;
    p.vz = pad.dz * pad.horizontal;
    p.launched = true;
    p.grounded = false;
    break;
  }
}

function triggerFall(world, now) {
  const p = world.player;
  if (p.falling) return;
  p.flames -= 1;
  p.broom_mounted = false;
  p.broom_until = 0;
  const lost = p.carried;
  p.carried = 0;
  emit(world, 'player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
  p.falling = true;
  p.falling_until = now + WORLD.fall_wait_ticks;
  p.vx = 0;
  p.vz = 0;
}

function respawnPlayer(world, now) {
  const p = world.player;
  const spawn = world.map.spawn;
  p.x = spawn.x;
  p.y = spawn.y;
  p.z = spawn.z;
  p.vx = 0;
  p.vy = 0;
  p.vz = 0;
  p.grounded = true;
  p.launched = false;
  p.falling = false;
  p.falling_until = 0;
  p.invuln_until = now + WORLD.invuln_ticks;
}

function canPick(world, x, y, z) {
  const p = world.player;
  return (
    Math.hypot(p.x - x, p.z - z) <= world.tuning.pickup_radius &&
    Math.abs(p.y - y) <= 1.5
  );
}

function pickUp(world, now) {
  const p = world.player;
  if (p.falling) return;

  const capacity = carryCapacity(world);
  for (let i = 0; i < world.motes.length && p.carried < capacity; ) {
    const m = world.motes[i];
    if (!canPick(world, m.x, m.y, m.z)) {
      i++;
      continue;
    }
    world.motes.splice(i, 1);
    p.carried += 1;
    emit(world, 'mote_picked', { carried: p.carried });
  }

  for (const c of world.charms) {
    if (!c.available) continue;
    if (!canPick(world, c.x, c.y, c.z)) continue;
    c.available = false;
    c.respawn_at = now + WORLD.charm_respawn_ticks;
    p.charm_until = now + WORLD.charm_duration_ticks;
    emit(world, 'charm_picked', {
      charm_id: c.id,
      charm_ticks: WORLD.charm_duration_ticks,
    });
  }
}

function nearestLantern(world, x, z, accepts, maxDistance = Infinity) {
  let target = null;
  let best = Infinity;
  // Map lanterns are stored in id order, preserving the smaller id on ties.
  for (const lantern of world.lanterns) {
    if (!accepts(lantern)) continue;
    const distance = Math.hypot(x - lantern.x, z - lantern.z);
    if (distance <= maxDistance && distance < best) {
      best = distance;
      target = lantern;
    }
  }
  return target;
}

export function interactionLantern(world) {
  const { x, z } = world.player;
  return nearestLantern(world, x, z, (l) => l.lit
    ? l.fuel_units < fuelUnits(world.tuning.fuel_max)
    : l.deposited < lightingCost(world, l), world.tuning.interact_radius);
}

function interact(world, edges) {
  if (!edges.interact) return;
  const p = world.player;
  if (p.falling || p.carried <= 0) return;

  const target = interactionLantern(world);
  if (!target) return;

  const tuning = world.tuning;
  const max = fuelUnits(tuning.fuel_max);
  const perMote = fuelUnits(tuning.fuel_per_mote);
  const cost = lightingCost(world, target);
  const needed = target.lit ? Math.ceil((max - target.fuel_units) / perMote) : cost - target.deposited;
  const amount = Math.min(p.carried, needed);

  p.carried -= amount;
  world.score += amount * tuning.score.per_mote;
  if (target.lit) {
    target.fuel_units = Math.min(max, target.fuel_units + perMote * amount);
    emit(world, 'refuel', { lantern_id: target.id, amount, fuel: roundedFuel(target) });
    return;
  }

  target.deposited += amount;
  emit(world, 'deposit', {
    lantern_id: target.id,
    amount,
    deposited: target.deposited,
  });

  if (target.deposited >= cost) {
    const relight = target.ever_lit;
    target.lit = true;
    target.ever_lit = true;
    target.fuel_units = max;
    target.relit_count += Number(relight);
    p.successful_lights += 1;
    world.score += relight ? tuning.score.per_relight : tuning.score.per_lantern;
    emit(world, 'lantern_lit', { lantern_id: target.id, relight });
  }
}

function drainTarget(world, shade) {
  const target = world.lanterns.find((l) => l.id === shade.target_lantern_id);
  if (target && isWeak(world, target) &&
      Math.hypot(target.x - shade.x, target.z - shade.z) <= WORLD.shade_drain_radius) return target;
  return null;
}

function spendFuel(world) {
  const reports = [];
  for (const shade of world.shades) {
    if (shade.state !== 'drain') continue;
    const target = drainTarget(world, shade);
    if (!target) continue;
    // Accumulate all drains before changing any lantern's lit state.
    target.fuel_units -= world.tuning.drain_per_s;
    shade.drain_ticks += 1;
    if (shade.drain_ticks % TICK_RATE === 0) reports.push({ shade, target });
  }

  for (const lantern of world.lanterns) {
    if (lantern.lit) lantern.fuel_units = Math.max(0, lantern.fuel_units - world.tuning.fuel_decay_per_s);
  }
  for (const { shade, target } of reports) {
    emit(world, 'fuel_drain', { lantern_id: target.id, shade_id: shade.id, fuel: roundedFuel(target) });
  }
  for (const lantern of world.lanterns) {
    if (!lantern.lit || lantern.fuel_units > 0) continue;
    lantern.lit = false;
    lantern.deposited = 0;
    emit(world, 'lantern_out', { lantern_id: lantern.id });
  }
}

function updateSafeZones(world, now) {
  for (const s of world.shades) {
    for (const l of world.lanterns) {
      if (!lanternHasSafeZone(world, l)) continue;
      const dx = s.x - l.x;
      const dz = s.z - l.z;
      const d = Math.hypot(dx, dz);
      if (d >= world.tuning.safe_radius) continue;
      const nx = d < 1e-9 ? 1 : dx / d;
      const nz = d < 1e-9 ? 0 : dz / d;
      // Expel in a single tick: a snapshot must never show a shade inside.
      s.x = l.x + nx * world.tuning.safe_radius;
      s.z = l.z + nz * world.tuning.safe_radius;
      s.safe_push_until = now + 30;
    }
  }
}

function doPulse(world, now, edges) {
  if (!edges.pulse) return;
  const p = world.player;
  if (p.falling) return;
  if (p.carried < world.tuning.pulse_cost) return;
  if (now < p.pulse_ready_at) return;

  p.carried -= world.tuning.pulse_cost;
  p.pulse_ready_at = now + Math.round(world.tuning.pulse_cooldown_s * TICK_RATE);

  const cx = p.x;
  const cy = p.y + 0.8;
  const cz = p.z;
  const stunned = [];

  for (const s of world.shades) {
    const sy = s.baseY + 1;
    const d = Math.hypot(s.x - cx, sy - cy, s.z - cz);
    if (d > world.tuning.pulse_radius) continue;
    const wasDraining = s.state === 'drain';
    s.state = 'stunned';
    s.target_lantern_id = null;
    s.state_until = now + WORLD.pulse_stun_ticks;
    s.stun_push_left = WORLD.pulse_push_ticks;
    let dx = s.x - cx;
    let dz = s.z - cz;
    const len = Math.hypot(dx, dz);
    if (len < 1e-9) {
      dx = 1;
      dz = 0;
    } else {
      dx /= len;
      dz /= len;
    }
    s.push_dx = dx;
    s.push_dz = dz;
    world.score += wasDraining ? world.tuning.score.per_drain_stun : world.tuning.score.per_stun;
    stunned.push(s.id);
  }

  for (const drifter of world.drifters) {
    const d = Math.hypot(drifter.x - cx, drifter.y - cy, drifter.z - cz);
    if (d > world.tuning.pulse_radius) continue;
    if (drifter.state === 'chase') {
      drifter.state = 'flee';
      drifter.state_until = now + WORLD.drifter_flee_ticks;
      drifter.steal_done = true;
    } else if (drifter.state === 'flee' && drifter.stolen > 0) {
      dropStolenMotes(world, drifter, now);
    }
  }

  emit(world, 'pulse', { stunned_ids: stunned });
}

function moveShadeEntity(world, s, dx, dz) {
  const nx = s.x + dx;
  const nz = s.z + dz;
  const h = supportHeightAt(world.map, nx, nz, s.baseY);
  if (h === null) return;
  if (Math.abs(h - s.baseY) > WORLD.step_tolerance) return;
  if (insideAnySafe(world, nx, nz)) return;
  s.x = nx;
  s.z = nz;
  s.baseY = h;
}

function updateShades(world, now, wanderOnly = false) {
  for (const s of world.shades) {
    if (s.state === 'spawning') {
      if (now >= s.state_until) {
        s.state = 'wander';
        s.state_until = 0;
        s.wander_until = 0;
      }
      continue;
    }

    if (s.state === 'stunned') {
      if (s.stun_push_left > 0) {
        s.x += s.push_dx * WORLD.pulse_push_step;
        s.z += s.push_dz * WORLD.pulse_push_step;
        s.stun_push_left -= 1;
      }
      if (now >= s.state_until) {
        s.state = 'wander';
        s.state_until = 0;
      }
      continue;
    }

    if (s.state === 'recoil') {
      s.x += s.recoil_dx * (WORLD.shade_recoil_m / WORLD.shade_recoil_ticks);
      s.z += s.recoil_dz * (WORLD.shade_recoil_m / WORLD.shade_recoil_ticks);
      s.recoil_left -= 1;
      if (s.recoil_left <= 0) s.state = 'wander';
      continue;
    }

    const d = Math.hypot(world.player.x - s.x, world.player.z - s.z);
    if (s.state === 'drain') {
      if (!drainTarget(world, s)) s.state = 'wander';
      else if (d <= WORLD.shade_drain_interrupt_radius) s.state = 'chase';
      if (s.state !== 'drain') s.target_lantern_id = null;
      continue;
    }
    if (!wanderOnly && s.state === 'wander' && d <= WORLD.shade_detect_m) s.state = 'chase';
    else if (s.state === 'chase' && d > WORLD.shade_give_up_m) s.state = 'wander';

    if (s.state === 'chase') {
      if (d > 1e-9) {
        const speed = world.map.shade_speed;
        moveShadeEntity(world, s, ((world.player.x - s.x) / d) * speed * DT, ((world.player.z - s.z) / d) * speed * DT);
      }
    } else {
      const weak = nearestLantern(world, s.x, s.z, (l) => isWeak(world, l));
      const target = weak ?? nearestLantern(world, s.x, s.z, (l) => !l.lit);
      if (target) {
        const dx = target.x - s.x;
        const dz = target.z - s.z;
        const distance = Math.hypot(dx, dz);
        if (distance > 0 && (!weak || distance > WORLD.shade_drain_radius)) {
          const travel = Math.min(distance, WORLD.shade_wander_speed * DT);
          moveShadeEntity(world, s, dx / distance * travel, dz / distance * travel);
        }
        if (weak && Math.hypot(target.x - s.x, target.z - s.z) <= WORLD.shade_drain_radius) {
          s.state = 'drain';
          s.target_lantern_id = target.id;
          s.drain_ticks = 0;
        }
        continue;
      }
      if (now >= s.wander_until) {
        const a = world.rng() * Math.PI * 2;
        s.wander_dx = Math.cos(a);
        s.wander_dz = Math.sin(a);
        s.wander_until = now + 120;
      }
      moveShadeEntity(
        world,
        s,
        s.wander_dx * WORLD.shade_wander_speed * DT,
        s.wander_dz * WORLD.shade_wander_speed * DT,
      );
    }
  }
}

export function stepBenchmark(world) {
  world.tick++;
  updateShades(world, ++world.sim_tick, true);
}

function updateDrifters(world, now) {
  const p = world.player;
  for (const drifter of world.drifters) {
    if (drifter.state === 'removed') continue;

    const d = Math.hypot(p.x - drifter.x, p.z - drifter.z);

    if (drifter.state === 'idle' || drifter.state === 'chase') {
      drifter.state = p.carried >= WORLD.drifter_detect_carried && d <= WORLD.drifter_detect_m
        ? 'chase'
        : 'idle';
    }

    if (drifter.state === 'idle') {
      if (now >= drifter.wander_until) {
        const a = world.rng() * Math.PI * 2;
        drifter.wander_dx = Math.cos(a);
        drifter.wander_dz = Math.sin(a);
        drifter.wander_until = now + 120;
      }
      drifter.x += drifter.wander_dx * WORLD.drifter_idle_speed * DT;
      drifter.z += drifter.wander_dz * WORLD.drifter_idle_speed * DT;
    } else if (drifter.state === 'chase' && d > 1e-9) {
      const travel = Math.min(d, WORLD.drifter_speed * DT);
      drifter.x += ((p.x - drifter.x) / d) * travel;
      drifter.z += ((p.z - drifter.z) / d) * travel;
    } else if (drifter.state === 'flee') {
      const dx = d > 1e-9 ? (drifter.x - p.x) / d : drifter.wander_dx;
      const dz = d > 1e-9 ? (drifter.z - p.z) / d : drifter.wander_dz;
      drifter.x += dx * WORLD.drifter_speed * DT;
      drifter.z += dz * WORLD.drifter_speed * DT;
      if (now >= drifter.state_until) {
        drifter.state = 'removed';
        drifter.remove_at = now;
      }
    }
  }

  world.drifters = world.drifters.filter(
    (d) => !(d.state === 'removed' && d.remove_at > 0 && now >= d.remove_at),
  );
}

function insideAnySafe(world, x, z) {
  for (const l of world.lanterns) {
    if (!lanternHasSafeZone(world, l)) continue;
    if (Math.hypot(x - l.x, z - l.z) < world.tuning.safe_radius) return true;
  }
  return false;
}

function dropMoteAround(world, now, cx, cz, cy) {
  const angle = world.rng() * Math.PI * 2;
  const radius = WORLD.mote_drop_min + world.rng() * (WORLD.mote_drop_max - WORLD.mote_drop_min);
  const x = cx + Math.cos(angle) * radius;
  const z = cz + Math.sin(angle) * radius;
  const y = supportHeightAt(world.map, x, z, cy) ?? cy;
  addMote(world, x, y, z, 'dropped', now + WORLD.mote_drop_ttl_ticks);
}

function dropStolenMotes(world, drifter, now) {
  const amount = drifter.stolen;
  if (amount <= 0) return;
  for (let i = 0; i < amount; i++) dropMoteAround(world, now, drifter.x, drifter.z, drifter.y);
  drifter.stolen = 0;
  drifter.state = 'removed';
  drifter.remove_at = now + WORLD.drifter_remove_ticks;
  emit(world, 'drifter_drop', { drifter_id: drifter.id, amount });
}

function resolveContacts(world, now) {
  const p = world.player;
  if (p.falling) return;

  const drifters = [...world.drifters].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  for (const drifter of drifters) {
    if (drifter.state !== 'chase' || drifter.steal_done) continue;
    if (Math.hypot(p.x - drifter.x, p.z - drifter.z) > WORLD.drifter_steal_radius) continue;
    const amount = Math.min(WORLD.drifter_steal_max, p.carried);
    if (amount <= 0) continue;
    p.carried -= amount;
    drifter.stolen += amount;
    drifter.steal_done = true;
    drifter.state = 'flee';
    drifter.state_until = now + WORLD.drifter_flee_ticks;
    emit(world, 'drifter_steal', {
      drifter_id: drifter.id,
      amount,
      carried: p.carried,
    });
  }

  if (now < p.invuln_until) return;

  const sorted = [...world.shades].sort((a, b) => shadeNum(a.id) - shadeNum(b.id));
  for (const s of sorted) {
    if (s.state === 'drain' || now < s.safe_push_until) continue;
    if (s.state === 'spawning' || s.state === 'stunned' || s.state === 'recoil') continue;
    if (insideAnySafe(world, s.x, s.z)) continue;
    if (Math.hypot(p.x - s.x, p.z - s.z) > world.tuning.shade_hit_radius) continue;
    if (Math.abs(p.y - s.baseY) > WORLD.shade_height_tolerance) continue;

    p.flames -= 1;
    const dropped = Math.floor(p.carried / 2);
    p.carried -= dropped;
    for (let i = 0; i < dropped; i++) dropMoteAround(world, now, p.x, p.z, p.y);
    p.invuln_until = now + WORLD.invuln_ticks;

    let dx = s.x - p.x;
    let dz = s.z - p.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-9) {
      dx = 1;
      dz = 0;
    } else {
      dx /= len;
      dz /= len;
    }
    s.state = 'recoil';
    s.recoil_left = WORLD.shade_recoil_ticks;
    s.recoil_dx = dx;
    s.recoil_dz = dz;

    emit(world, 'player_hit', { by: 'shade', flames: p.flames, dropped });
    return; // at most one flame lost per tick
  }
}

function spawnShade(world, now) {
  const cfg = world.map.shade;
  if (world.shades.length >= cfg.max) return;
  const p = world.player;
  const valid = world.map.shade_points.filter(
    (pt) => Math.hypot(pt.x - p.x, pt.z - p.z) >= cfg.min_spawn_dist,
  );
  if (valid.length === 0) return;
  const pt = valid[Math.floor(world.rng() * valid.length)];
  const baseY = baseHeightAt(world.map, pt.x, pt.z) ?? pt.y;
  const shade = {
    id: nextShadeId(world),
    x: pt.x,
    z: pt.z,
    baseY,
    state: 'spawning',
    state_until: now + WORLD.shade_spawn_fade_ticks,
    wander_dx: 1,
    wander_dz: 0,
    wander_until: 0,
    stun_push_left: 0,
    push_dx: 1,
    push_dz: 0,
    recoil_left: 0,
    recoil_dx: 1,
    recoil_dz: 0,
    safe_push_until: 0,
    target_lantern_id: null,
    drain_ticks: 0,
  };
  world.shades.push(shade);
  emit(world, 'shade_spawned', { id: shade.id });
}

function spawnDrifter(world, now) {
  const cfg = world.map.drifter;
  if (!cfg) return;
  if (world.drifters.length >= cfg.max) return;
  const points = world.map.drifter_points;
  const pt = points[Math.floor(world.rng() * points.length)];
  let id;
  do {
    id = `D${++world.counters.drifter}`;
  } while (world.drifters.some((d) => d.id === id));
  const drifter = {
    id,
    x: pt.x,
    z: pt.z,
    y: (baseHeightAt(world.map, pt.x, pt.z) ?? 0) + 1.5,
    state: 'idle',
    state_until: 0,
    stolen: 0,
    steal_done: false,
    wander_dx: 1,
    wander_dz: 0,
    wander_until: 0,
    remove_at: 0,
  };
  world.drifters.push(drifter);
}

function spawnScheduled(world, now) {
  if (world.random_motes && now > 0 && now % WORLD.mote_spawn_interval === 0) {
    if (world.motes.length < WORLD.mote_cap) {
      const empty = world.map.mote_points.filter(
        (pt) =>
          !world.motes.some(
            (m) => Math.hypot(m.x - pt.x, m.z - pt.z) < 0.5 && Math.abs(m.y - pt.y) < 0.5,
          ),
      );
      if (empty.length > 0) {
        const pt = empty[Math.floor(world.rng() * empty.length)];
        addMote(world, pt.x, pt.y, pt.z, 'random', null);
      }
    }
  }

  if (world.random_shades) {
    const cfg = world.map.shade;
    if (now === cfg.first_tick) {
      for (let i = 0; i < cfg.first_count; i++) spawnShade(world, now);
    } else if (now > cfg.first_tick && (now - cfg.first_tick) % cfg.interval_ticks === 0) {
      spawnShade(world, now);
    }
  }

  if (world.random_drifters && world.map.drifter) {
    const cfg = world.map.drifter;
    if (now >= cfg.first_tick && (now - cfg.first_tick) % cfg.interval_ticks === 0) {
      spawnDrifter(world, now);
    }
  }
}

function win(world, lit) {
  const score = world.tuning.score;
  for (const lantern of lit) world.score += score.per_dawn_lantern + Math.floor(lanternFuel(lantern));
  world.score += world.player.flames * score.per_flame_left;
  world.state = 'won';
  world.end_reason = 'dawn_survived';
  emit(world, 'game_over', { result: 'won', reason: world.end_reason });
}

function lose(world, reason) {
  if (world.state !== 'playing') return;
  world.state = 'lost';
  world.end_reason = reason;
  emit(world, 'game_over', { result: 'lost', reason });
}

function checkEnd(world) {
  const p = world.player;
  if (p.flames <= 0) {
    lose(world, 'no_flames');
    return;
  }
  if (timeLeft(world) > 0) return;
  const lit = world.lanterns.filter((l) => l.lit);
  if (lit.length >= lanternGoal(world)) win(world, lit);
  else lose(world, 'dawn');
}

/* ------------------------------------------------------------------ */
/* One simulation step                                                 */
/* ------------------------------------------------------------------ */

export function stepWorld(world, liveInput = null) {
  if (world.state === 'won' || world.state === 'lost') return;

  const stepTick = world.tick;
  world.tick += 1;

  applyFrames(world, stepTick);
  if (liveInput) applyLiveInput(world, liveInput);
  const edges = readEdges(world);

  if (edges.pause) {
    if (world.state === 'playing') {
      world.state = 'paused';
      emit(world, 'paused', {});
      return;
    }
    if (world.state === 'paused') {
      world.state = 'playing';
      emit(world, 'resumed', {});
    }
  }
  if (world.state !== 'playing') return;

  world.sim_tick += 1;
  const now = world.sim_tick;

  updateWind(world, now);
  expireTimers(world, now);
  spendFuel(world);

  if (liveInput?.broom && world.player.flames > 0) mountBroom(world, now);
  movePlayer(world, now, edges);
  if (world.player.flames > 0) {
    pickUp(world, now);
    interact(world, edges);
  }
  updateSafeZones(world, now);
  if (world.player.flames > 0) doPulse(world, now, edges);
  if (liveInput?.lightning && world.player.flames > 0) castLightning(world, now);
  updateShades(world, now);
  updateSafeZones(world, now); // enforce the boundary after every shade move
  updateDrifters(world, now);
  if (world.player.flames > 0) resolveContacts(world, now);

  spawnScheduled(world, now);
  checkEnd(world);
}

/* ------------------------------------------------------------------ */
/* Serialisation                                                       */
/* ------------------------------------------------------------------ */

function shadeTicksLeft(shade, now) {
  if (shade.state === 'recoil') return Math.max(0, shade.recoil_left);
  if (shade.state === 'spawning' || shade.state === 'stunned') {
    return Math.max(0, shade.state_until - now);
  }
  return 0;
}

export function snapshot(world) {
  const p = world.player;
  const now = world.sim_tick;
  const charmActive = now < p.charm_until;

  return {
    type: 'snapshot',
    tick: world.tick,
    sim_tick: world.sim_tick,
    night: world.night,
    state: world.state,
    time_left_s: round3(timeLeft(world)),
    score: world.score,
    wind: {
      active: world.wind.active,
      dir_deg: round3(world.wind.dir_deg),
    },
    player: {
      pos: [round3(p.x), round3(p.y), round3(p.z)],
      vel: [round3(p.vx), round3(p.vy), round3(p.vz)],
      flames: p.flames,
      carried: p.carried,
      capacity: carryCapacity(world),
      grounded: p.grounded,
      invuln: round3(Math.max(0, (p.invuln_until - now) / TICK_RATE)),
      dash_cd_s: round3(charmActive ? 0 : Math.max(0, (p.dash_ready_at - now) / TICK_RATE)),
      pulse_cd_s: round3(Math.max(0, (p.pulse_ready_at - now) / TICK_RATE)),
      charm_s: round3(Math.max(0, (p.charm_until - now) / TICK_RATE)),
    },
    lanterns: world.lanterns.map((l) => ({
      id: l.id,
      pos: [round3(l.x), round3(l.y), round3(l.z)],
      lit: l.lit,
      deposited: l.deposited,
      fuel: roundedFuel(l),
      ever_lit: l.ever_lit,
      relit_count: l.relit_count,
    })),
    shades: world.shades.map((s) => ({
      id: s.id,
      pos: [round3(s.x), round3(s.baseY + 1), round3(s.z)],
      state: s.state,
      state_ticks_left: shadeTicksLeft(s, now),
    })),
    motes: world.motes.map((m) => ({
      id: m.id,
      pos: [round3(m.x), round3(m.y), round3(m.z)],
      kind: m.kind,
      ttl_s: m.ttl_until === null ? null : round3(Math.max(0, (m.ttl_until - now) / TICK_RATE)),
    })),
    motes_active: world.motes.length,
    drifters: world.drifters.map((d) => ({
      id: d.id,
      pos: [round3(d.x), round3(d.y), round3(d.z)],
      state: d.state,
      stolen: d.stolen,
    })),
    charms: world.charms.map((c) => ({
      id: c.id,
      available: c.available,
      respawn_s: c.available ? 0 : round3(Math.max(0, (c.respawn_at - now) / TICK_RATE)),
    })),
  };
}

export function endLine(world) {
  return { type: 'end', ticks: world.tick, state: world.state, score: world.score };
}

export { ContractError };
