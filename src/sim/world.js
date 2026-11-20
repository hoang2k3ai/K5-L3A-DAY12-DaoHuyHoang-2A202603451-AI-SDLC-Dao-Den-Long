// Deterministic 60 Hz game simulation.
//
// This module has no rendering, no DOM and no GPU dependency: the browser and
// the headless CLI run exactly the same code, which is what makes the
// Test Contract evidence trustworthy.
import { TUNING, WORLD } from './config.js';
import { makeRng } from './rng.js';
import { ContractError } from './contract.js';

export const TICK_RATE = 60;
export const SECONDS_PER_TICK = 1 / 60;

const DT = SECONDS_PER_TICK;
const EPS = 1e-9;

const round3 = (v) => {
  const x = Math.round((v + Number.EPSILON) * 1000) / 1000;
  return Object.is(x, -0) ? 0 : x;
};

const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

function emit(world, tick, name, data) {
  world.events.push({ type: 'event', tick, name, data });
}

function defaultLanterns(tuning, cfg) {
  const n = tuning.lantern_count_night1;
  const list = [];
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    list.push({
      id: `L${i + 1}`,
      x: Math.cos(angle) * cfg.lantern_ring_radius,
      z: Math.sin(angle) * cfg.lantern_ring_radius,
      lit: false,
      deposited: 0,
    });
  }
  return list;
}

export function createWorld({ seed = 0, scenario = null, tuning = TUNING, cfg = WORLD } = {}) {
  const world = {
    seed,
    tuning,
    cfg,
    rng: makeRng(seed),
    tick: 0,
    state: 'playing',
    end_reason: null,
    score: 0,
    time_start_s: tuning.night1_duration_s,
    player: {
      x: 0,
      y: 0,
      z: 0,
      vy: 0,
      on_ground: true,
      carried: 0,
      flames: tuning.flames,
      invuln_until: 0,
      pulse_ready_at: 0,
    },
    lanterns: defaultLanterns(tuning, cfg),
    motes: [],
    shades: [],
    respawns: [],
    counters: { mote: 0, shade: 0 },
    random_motes: true,
    random_shades: true,
    input: { move: [0, 0], cam_yaw_deg: 0, buttons: { jump: false, interact: false, pulse: false } },
    prevButtons: { jump: false, interact: false, pulse: false },
    frames: [],
    frameIndex: 0,
    events: [],
  };

  applyScenario(world, scenario);
  return world;
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
  return world.time_start_s - world.tick / TICK_RATE;
}

/* ------------------------------------------------------------------ */
/* Scenario construction (no events, no score - contract section D)    */
/* ------------------------------------------------------------------ */

function applyScenario(world, rawScenario) {
  const sc = rawScenario ?? {};
  const t = world.tuning;
  const cfg = world.cfg;

  if (sc.player) {
    const p = world.player;
    if (sc.player.pos) {
      p.x = sc.player.pos[0];
      p.y = sc.player.pos[1];
      p.z = sc.player.pos[2];
    }
    if (sc.player.carried !== undefined) p.carried = sc.player.carried;
    if (sc.player.flames !== undefined) p.flames = sc.player.flames;
  }

  if (sc.random_motes !== undefined) world.random_motes = sc.random_motes;
  if (sc.random_shades !== undefined) world.random_shades = sc.random_shades;

  for (const patch of sc.lanterns ?? []) {
    const lantern = world.lanterns.find((l) => l.id === patch.id);
    if (!lantern) continue;
    if (patch.pos) {
      lantern.x = patch.pos[0];
      lantern.z = patch.pos[2];
    }
    if (patch.deposited !== undefined) lantern.deposited = patch.deposited;
    if (patch.lit !== undefined) lantern.lit = patch.lit;
    if (lantern.deposited >= t.lantern_cost) lantern.lit = true;
  }

  if (sc.motes) {
    for (const m of sc.motes) addMote(world, m[0], m[2]);
  } else if (world.random_motes) {
    for (let i = 0; i < cfg.mote_initial; i++) spawnMote(world);
  }

  if (sc.shades) {
    for (const s of sc.shades) addShade(world, s.pos[0], s.pos[2], s.id);
  } else if (world.random_shades) {
    for (let i = 0; i < cfg.shade_initial; i++) spawnShade(world, 0, { silent: true });
  }

  if (sc.time_left_s !== undefined) world.time_start_s = sc.time_left_s;
}

function nextMoteId(world) {
  let id;
  do {
    id = `M${++world.counters.mote}`;
  } while (world.motes.some((m) => m.id === id));
  return id;
}

function addMote(world, x, z) {
  const mote = { id: nextMoteId(world), x, z };
  world.motes.push(mote);
  return mote;
}

function spawnMote(world) {
  const cfg = world.cfg;
  const p = world.player;
  let x = 0;
  let z = 0;
  for (let attempt = 0; attempt < 60; attempt++) {
    const angle = world.rng() * Math.PI * 2;
    const radius = Math.sqrt(world.rng()) * (cfg.island_radius - 3);
    x = Math.cos(angle) * radius;
    z = Math.sin(angle) * radius;
    if (dist2(x, z, p.x, p.z) < 4) continue;
    if (world.motes.some((m) => dist2(x, z, m.x, m.z) < 2)) continue;
    break;
  }
  return addMote(world, x, z);
}

function nextShadeId(world) {
  let id;
  do {
    id = `S${++world.counters.shade}`;
  } while (world.shades.some((s) => s.id === id));
  return id;
}

function addShade(world, x, z, id) {
  const shade = {
    id: id ?? nextShadeId(world),
    x,
    z,
    state: 'chase',
    stun_until: 0,
  };
  pushOutOfSafe(world, shade);
  world.shades.push(shade);
  return shade;
}

function spawnShade(world, tick, { silent = false } = {}) {
  const cfg = world.cfg;
  const p = world.player;
  let x = 0;
  let z = 0;
  for (let attempt = 0; attempt < 40; attempt++) {
    const angle = world.rng() * Math.PI * 2;
    const radius = 20 + world.rng() * (cfg.island_radius - 23);
    x = Math.cos(angle) * radius;
    z = Math.sin(angle) * radius;
    if (dist2(x, z, p.x, p.z) < 18) continue;
    if (insideSafe(world, x, z)) continue;
    break;
  }
  const shade = addShade(world, x, z, undefined);
  if (!silent) emit(world, tick, 'shade_spawned', { id: shade.id });
  return shade;
}

function insideSafe(world, x, z) {
  const r = world.tuning.safe_radius;
  return world.lanterns.some((l) => l.lit && dist2(x, z, l.x, l.z) < r);
}

/** Shades cannot enter the safe radius around a lit lantern. */
function pushOutOfSafe(world, obj) {
  const r = world.tuning.safe_radius;
  for (let pass = 0; pass < 2; pass++) {
    for (const lantern of world.lanterns) {
      if (!lantern.lit) continue;
      const d = dist2(obj.x, obj.z, lantern.x, lantern.z);
      if (d < r) {
        const dx = d < EPS ? 1 : (obj.x - lantern.x) / d;
        const dz = d < EPS ? 0 : (obj.z - lantern.z) / d;
        obj.x = lantern.x + dx * r;
        obj.z = lantern.z + dz * r;
      }
    }
  }
}

function clampToIsland(world, obj) {
  const maxR = world.cfg.island_radius - 1;
  const d = Math.hypot(obj.x, obj.z);
  if (d > maxR) {
    obj.x = (obj.x / d) * maxR;
    obj.z = (obj.z / d) * maxR;
  }
}

/* ------------------------------------------------------------------ */
/* One simulation step                                                 */
/* ------------------------------------------------------------------ */

export function stepWorld(world, liveInput = null) {
  if (world.state !== 'playing') return;

  applyFrames(world);
  if (liveInput) applyLiveInput(world, liveInput);
  const edges = readEdges(world);

  world.tick += 1;
  const tick = world.tick;
  const t = world.tuning;
  const p = world.player;

  if (edges.pulse) doPulse(world, tick);
  if (world.state !== 'playing') return;

  movePlayer(world, tick, edges);
  if (world.state !== 'playing') return;

  pickUpMotes(world, tick);
  respawnMotes(world, tick);

  tryInteract(world, tick, edges);
  if (world.state !== 'playing') return;

  updateShades(world, tick);
  spawnShades(world, tick);
  resolveHits(world, tick);
  if (world.state !== 'playing') return;

  if (timeLeft(world) <= 0) {
    lose(world, tick, 'dawn');
  } else if (p.flames <= 0) {
    lose(world, tick, 'no_flames');
  } else if (world.lanterns.every((l) => l.lit)) {
    win(world, tick);
  }
}

function applyFrames(world) {
  while (world.frameIndex < world.frames.length) {
    const frame = world.frames[world.frameIndex];
    if (frame.tick > world.tick) break;
    world.frameIndex++;
    if (frame.tick < world.tick) continue;
    if (frame.move !== undefined) world.input.move = [frame.move[0], frame.move[1]];
    if (frame.cam_yaw_deg !== undefined) world.input.cam_yaw_deg = frame.cam_yaw_deg;
    for (const key of ['jump', 'interact', 'pulse']) {
      if (frame[key] !== undefined) world.input.buttons[key] = frame[key];
    }
  }
}

function applyLiveInput(world, input) {
  if (input.move) world.input.move = [input.move[0], input.move[1]];
  if (input.cam_yaw_deg !== undefined) world.input.cam_yaw_deg = input.cam_yaw_deg;
  for (const key of ['jump', 'interact', 'pulse']) {
    if (input[key] !== undefined) world.input.buttons[key] = Boolean(input[key]);
  }
}

function readEdges(world) {
  const buttons = world.input.buttons;
  const edges = {
    jump: buttons.jump && !world.prevButtons.jump,
    interact: buttons.interact && !world.prevButtons.interact,
    pulse: buttons.pulse && !world.prevButtons.pulse,
  };
  world.prevButtons = { ...buttons };
  return edges;
}

function movePlayer(world, tick, edges) {
  const t = world.tuning;
  const cfg = world.cfg;
  const p = world.player;

  const move = world.input.move;
  let mx = move[0];
  let mz = move[1];
  const length = Math.hypot(mx, mz);
  if (length > 1) {
    mx /= length;
    mz /= length;
  }
  const theta = (world.input.cam_yaw_deg * Math.PI) / 180;
  const worldX = mx * Math.cos(theta) + mz * Math.sin(theta);
  const worldZ = -mx * Math.sin(theta) + mz * Math.cos(theta);
  p.x += worldX * t.player_speed * DT;
  p.z += worldZ * t.player_speed * DT;

  if (edges.jump && p.on_ground) {
    p.vy = cfg.jump_speed;
    p.on_ground = false;
  }
  p.vy -= cfg.gravity * DT;
  p.y += p.vy * DT;
  if (p.y <= 0) {
    p.y = 0;
    p.vy = 0;
    p.on_ground = true;
  }

  const radial = Math.hypot(p.x, p.z);
  if (radial > cfg.island_radius) {
    if (t.fall_enabled) {
      p.flames -= 1;
      emit(world, tick, 'player_hit', { by: 'fall', flames: p.flames, dropped: 0 });
      p.x = 0;
      p.z = 0;
      p.y = 0;
      p.vy = 0;
      p.on_ground = true;
      p.invuln_until = tick + Math.round(cfg.respawn_invuln_s * TICK_RATE);
      if (p.flames <= 0) lose(world, tick, 'no_flames');
    } else {
      const k = cfg.island_radius / radial;
      p.x *= k;
      p.z *= k;
    }
  }
}

function pickUpMotes(world, tick) {
  const t = world.tuning;
  const p = world.player;
  for (let i = world.motes.length - 1; i >= 0 && p.carried < t.carry_capacity; i--) {
    const mote = world.motes[i];
    if (dist2(p.x, p.z, mote.x, mote.z) <= t.pickup_radius) {
      world.motes.splice(i, 1);
      p.carried += 1;
      world.score += t.score.per_mote;
      emit(world, tick, 'mote_picked', { carried: p.carried });
      if (world.random_motes) {
        world.respawns.push({ at: tick + Math.round(world.cfg.mote_respawn_s * TICK_RATE) });
      }
    }
  }
}

function respawnMotes(world, tick) {
  if (world.respawns.length === 0) return;
  const due = world.respawns.filter((r) => r.at <= tick);
  if (due.length === 0) return;
  world.respawns = world.respawns.filter((r) => r.at > tick);
  for (let i = 0; i < due.length; i++) spawnMote(world);
}

function tryInteract(world, tick, edges) {
  if (!edges.interact) return;
  const t = world.tuning;
  const p = world.player;
  if (p.carried <= 0) return;

  let target = null;
  let bestDistance = Infinity;
  for (const lantern of world.lanterns) {
    if (lantern.lit) continue;
    const d = dist2(p.x, p.z, lantern.x, lantern.z);
    if (d <= t.interact_radius && d < bestDistance) {
      bestDistance = d;
      target = lantern;
    }
  }
  if (!target) return;

  const amount = Math.min(p.carried, t.lantern_cost - target.deposited);
  if (amount <= 0) return;

  p.carried -= amount;
  target.deposited += amount;
  emit(world, tick, 'deposit', {
    lantern_id: target.id,
    amount,
    deposited: target.deposited,
  });

  if (!target.lit && target.deposited >= t.lantern_cost) {
    target.lit = true;
    world.score += t.score.per_lantern;
    emit(world, tick, 'lantern_lit', { lantern_id: target.id });
  }

  if (world.lanterns.every((l) => l.lit)) win(world, tick);
}

function doPulse(world, tick) {
  const t = world.tuning;
  const p = world.player;
  if (tick < p.pulse_ready_at) return;
  if (p.flames < t.pulse_cost) return;

  p.flames -= t.pulse_cost;
  p.pulse_ready_at = tick + Math.round(t.pulse_cooldown_s * TICK_RATE);

  const stunned = [];
  for (const shade of world.shades) {
    const d = dist2(p.x, p.z, shade.x, shade.z);
    if (d > t.pulse_radius) continue;
    shade.state = 'stunned';
    shade.stun_until = tick + Math.round(t.pulse_stun_s * TICK_RATE);
    let dx = shade.x - p.x;
    let dz = shade.z - p.z;
    const len = Math.hypot(dx, dz);
    if (len < EPS) {
      dx = 1;
      dz = 0;
    } else {
      dx /= len;
      dz /= len;
    }
    shade.x += dx * t.pulse_push_m;
    shade.z += dz * t.pulse_push_m;
    pushOutOfSafe(world, shade);
    clampToIsland(world, shade);
    world.score += t.score.per_stun;
    stunned.push(shade.id);
  }

  emit(world, tick, 'pulse', { stunned_ids: stunned });
  if (p.flames <= 0) lose(world, tick, 'no_flames');
}

function updateShades(world, tick) {
  const t = world.tuning;
  const p = world.player;
  for (const shade of world.shades) {
    if (shade.state === 'stunned') {
      if (tick >= shade.stun_until) shade.state = 'chase';
      continue;
    }
    const dx = p.x - shade.x;
    const dz = p.z - shade.z;
    const d = Math.hypot(dx, dz);
    if (d > EPS) {
      shade.x += (dx / d) * t.shade_speed * DT;
      shade.z += (dz / d) * t.shade_speed * DT;
    }
    pushOutOfSafe(world, shade);
    clampToIsland(world, shade);
  }
}

function spawnShades(world, tick) {
  if (!world.random_shades) return;
  const every = Math.round(world.cfg.shade_spawn_every_s * TICK_RATE);
  if (tick % every !== 0) return;
  if (world.shades.length >= world.cfg.shade_max) return;
  spawnShade(world, tick);
}

function resolveHits(world, tick) {
  const t = world.tuning;
  const p = world.player;
  if (tick < p.invuln_until) return;

  for (const shade of world.shades) {
    if (shade.state === 'stunned') continue;
    if (dist2(p.x, p.z, shade.x, shade.z) > t.shade_hit_radius) continue;

    p.flames -= 1;
    const dropped = Math.min(p.carried, Math.floor(p.carried * t.hit_drop_ratio));
    p.carried -= dropped;
    p.invuln_until = tick + Math.round(t.invuln_s * TICK_RATE);

    let dx = p.x - shade.x;
    let dz = p.z - shade.z;
    const len = Math.hypot(dx, dz);
    if (len < EPS) {
      dx = 1;
      dz = 0;
    } else {
      dx /= len;
      dz /= len;
    }
    p.x += dx * 2.5;
    p.z += dz * 2.5;

    emit(world, tick, 'player_hit', { by: 'shade', flames: p.flames, dropped });
    if (p.flames <= 0) lose(world, tick, 'no_flames');
    return;
  }
}

function win(world, tick) {
  if (world.state !== 'playing') return;
  const t = world.tuning;
  const remaining = Math.max(0, timeLeft(world));
  world.score +=
    Math.floor(remaining) * t.score.per_second_left +
    Math.max(0, world.player.flames) * t.score.per_flame_left;
  world.state = 'won';
  world.end_reason = 'all_lit';
  emit(world, tick, 'game_over', { result: 'won', reason: 'all_lit' });
}

function lose(world, tick, reason) {
  if (world.state !== 'playing') return;
  world.state = 'lost';
  world.end_reason = reason;
  emit(world, tick, 'game_over', { result: 'lost', reason });
}

/* ------------------------------------------------------------------ */
/* Serialisation                                                       */
/* ------------------------------------------------------------------ */

export function snapshot(world) {
  const p = world.player;
  return {
    type: 'snapshot',
    tick: world.tick,
    sim_tick: world.tick,
    state: world.state,
    time_left_s: round3(timeLeft(world)),
    score: world.score,
    player: {
      pos: [round3(p.x), round3(p.y), round3(p.z)],
      flames: p.flames,
      carried: p.carried,
    },
    lanterns: world.lanterns.map((l) => ({
      id: l.id,
      pos: [round3(l.x), 0, round3(l.z)],
      lit: l.lit,
      deposited: l.deposited,
    })),
    shades: world.shades.map((s) => ({
      id: s.id,
      pos: [round3(s.x), 1, round3(s.z)],
      state: s.state,
    })),
    motes: world.motes.map((m) => ({ id: m.id, pos: [round3(m.x), 0, round3(m.z)] })),
    motes_active: world.motes.length,
  };
}

export function endLine(world) {
  return { type: 'end', ticks: world.tick, state: world.state, score: world.score };
}

export { ContractError };
