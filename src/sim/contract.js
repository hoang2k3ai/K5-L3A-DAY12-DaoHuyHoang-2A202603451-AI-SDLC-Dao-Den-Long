// Validation for the two JSON inputs of Test Contract v1.2.
// Any malformed file must make the headless run exit with code 2.
import { TUNING } from './config.js';

export class ContractError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ContractError';
  }
}

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isInt = (v) => Number.isInteger(v);

const SHADE_STATES = ['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain'];
const DRIFTER_STATES = ['idle', 'chase', 'flee', 'removed'];

function fail(where, msg) {
  throw new ContractError(`${where}: ${msg}`);
}

function checkVec3(where, v) {
  if (!Array.isArray(v) || v.length !== 3 || !v.every(isNum)) {
    fail(where, 'phải là mảng 3 số [x, y, z]');
  }
}

function checkTicks(where, v) {
  if (!isNum(v) || v < 0) fail(where, 'phải là số >= 0');
}

/** Parse + validate a scenario object (section D of the contract). */
export function parseScenario(raw) {
  if (raw === undefined || raw === null) return null;
  if (!isObject(raw)) fail('scenario', 'phải là object JSON');

  const out = {};

  if (raw.player !== undefined) {
    const p = raw.player;
    if (!isObject(p)) fail('scenario.player', 'phải là object');
    const player = {};
    if (p.pos !== undefined) {
      checkVec3('scenario.player.pos', p.pos);
      player.pos = p.pos;
    }
    if (p.carried !== undefined) {
      if (!isNum(p.carried) || p.carried < 0) fail('scenario.player.carried', 'phải là số >= 0');
      player.carried = Math.floor(p.carried);
    }
    if (p.flames !== undefined) {
      if (!isNum(p.flames) || p.flames < 0) fail('scenario.player.flames', 'phải là số >= 0');
      player.flames = p.flames;
    }
    for (const key of ['invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks']) {
      if (p[key] !== undefined) {
        checkTicks(`scenario.player.${key}`, p[key]);
        player[key] = p[key];
      }
    }
    if (p.successful_lights !== undefined) {
      if (!isInt(p.successful_lights) || p.successful_lights < 0) {
        fail('scenario.player.successful_lights', 'phải là số nguyên >= 0');
      }
      player.successful_lights = p.successful_lights;
    }
    out.player = player;
  }

  for (const key of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) {
    if (raw[key] !== undefined) {
      if (typeof raw[key] !== 'boolean') fail(`scenario.${key}`, 'phải là boolean');
      out[key] = raw[key];
    }
  }

  if (raw.motes !== undefined) {
    if (!Array.isArray(raw.motes)) fail('scenario.motes', 'phải là mảng');
    out.motes = raw.motes.map((m, i) => {
      checkVec3(`scenario.motes[${i}]`, m);
      return [m[0], m[1], m[2]];
    });
  }

  if (raw.shades !== undefined) {
    if (!Array.isArray(raw.shades)) fail('scenario.shades', 'phải là mảng');
    const seen = new Set();
    out.shades = raw.shades.map((s, i) => {
      if (!isObject(s)) fail(`scenario.shades[${i}]`, 'phải là object');
      checkVec3(`scenario.shades[${i}].pos`, s.pos);
      const item = { pos: s.pos };
      if (s.id !== undefined) {
        if (typeof s.id !== 'string') fail(`scenario.shades[${i}].id`, 'phải là chuỗi');
        if (seen.has(s.id)) fail(`scenario.shades[${i}].id`, `id trùng "${s.id}"`);
        seen.add(s.id);
        item.id = s.id;
      }
      if (s.state !== undefined) {
        if (!SHADE_STATES.includes(s.state)) {
          fail(`scenario.shades[${i}].state`, `phải là một trong ${SHADE_STATES.join(', ')}`);
        }
        item.state = s.state;
      }
      if (s.state_ticks_left !== undefined) {
        checkTicks(`scenario.shades[${i}].state_ticks_left`, s.state_ticks_left);
        item.state_ticks_left = s.state_ticks_left;
      }
      if (s.target_lantern_id !== undefined) {
        if (typeof s.target_lantern_id !== 'string' || !s.target_lantern_id) {
          fail(`scenario.shades[${i}].target_lantern_id`, 'phải là chuỗi khác rỗng');
        }
        item.target_lantern_id = s.target_lantern_id;
      }
      return item;
    });
  }

  if (raw.drifters !== undefined) {
    if (!Array.isArray(raw.drifters)) fail('scenario.drifters', 'phải là mảng');
    const seen = new Set();
    out.drifters = raw.drifters.map((d, i) => {
      if (!isObject(d)) fail(`scenario.drifters[${i}]`, 'phải là object');
      checkVec3(`scenario.drifters[${i}].pos`, d.pos);
      const item = { pos: d.pos };
      if (d.id !== undefined) {
        if (typeof d.id !== 'string') fail(`scenario.drifters[${i}].id`, 'phải là chuỗi');
        if (seen.has(d.id)) fail(`scenario.drifters[${i}].id`, `id trùng "${d.id}"`);
        seen.add(d.id);
        item.id = d.id;
      }
      if (d.state !== undefined) {
        if (!DRIFTER_STATES.includes(d.state)) {
          fail(`scenario.drifters[${i}].state`, `phải là một trong ${DRIFTER_STATES.join(', ')}`);
        }
        item.state = d.state;
      }
      if (d.state_ticks_left !== undefined) {
        checkTicks(`scenario.drifters[${i}].state_ticks_left`, d.state_ticks_left);
        item.state_ticks_left = d.state_ticks_left;
      }
      if (d.stolen !== undefined) {
        if (!isInt(d.stolen) || d.stolen < 0) fail(`scenario.drifters[${i}].stolen`, 'phải là số nguyên >= 0');
        item.stolen = d.stolen;
      }
      return item;
    });
  }

  if (raw.charms !== undefined) {
    if (!Array.isArray(raw.charms)) fail('scenario.charms', 'phải là mảng');
    out.charms = raw.charms.map((c, i) => {
      if (!isObject(c)) fail(`scenario.charms[${i}]`, 'phải là object');
      checkVec3(`scenario.charms[${i}].pos`, c.pos);
      const item = { pos: c.pos };
      if (c.id !== undefined) {
        if (typeof c.id !== 'string') fail(`scenario.charms[${i}].id`, 'phải là chuỗi');
        item.id = c.id;
      }
      if (c.available !== undefined) {
        if (typeof c.available !== 'boolean') fail(`scenario.charms[${i}].available`, 'phải là boolean');
        item.available = c.available;
      }
      if (c.respawn_s !== undefined) {
        checkTicks(`scenario.charms[${i}].respawn_s`, c.respawn_s);
        item.respawn_s = c.respawn_s;
      }
      return item;
    });
  }

  if (raw.lanterns !== undefined) {
    if (!Array.isArray(raw.lanterns)) fail('scenario.lanterns', 'phải là mảng');
    out.lanterns = raw.lanterns.map((l, i) => {
      if (!isObject(l)) fail(`scenario.lanterns[${i}]`, 'phải là object');
      if (typeof l.id !== 'string' || l.id.length === 0) {
        fail(`scenario.lanterns[${i}].id`, 'phải là chuỗi khác rỗng');
      }
      const item = { id: l.id };
      if (l.pos !== undefined) {
        checkVec3(`scenario.lanterns[${i}].pos`, l.pos);
        item.pos = l.pos;
      }
      if (l.deposited !== undefined) {
        if (!isNum(l.deposited) || l.deposited < 0) {
          fail(`scenario.lanterns[${i}].deposited`, 'phải là số >= 0');
        }
        item.deposited = l.deposited;
      }
      if (l.lit !== undefined) {
        if (typeof l.lit !== 'boolean') fail(`scenario.lanterns[${i}].lit`, 'phải là boolean');
        item.lit = l.lit;
      }
      if (l.fuel !== undefined) {
        if (!isNum(l.fuel) || l.fuel < 0 || l.fuel > TUNING.fuel_max) {
          fail(`scenario.lanterns[${i}].fuel`, `phải là số từ 0 đến ${TUNING.fuel_max}`);
        }
        item.fuel = l.fuel;
      }
      if (l.ever_lit !== undefined) {
        if (typeof l.ever_lit !== 'boolean') fail(`scenario.lanterns[${i}].ever_lit`, 'phải là boolean');
        item.ever_lit = l.ever_lit;
      }
      return item;
    });
  }

  if (raw.time_left_s !== undefined) {
    if (!isNum(raw.time_left_s) || raw.time_left_s < 0) {
      fail('scenario.time_left_s', 'phải là số >= 0');
    }
    out.time_left_s = raw.time_left_s;
  }

  return out;
}

/** Parse + validate an inputs file (section C of the contract). */
export function parseInputs(raw) {
  if (raw === undefined || raw === null) return [];
  if (!isObject(raw)) fail('inputs', 'phải là object JSON');
  if (!Array.isArray(raw.frames)) fail('inputs.frames', 'phải là mảng');

  const frames = [];
  let lastTick = -1;
  raw.frames.forEach((f, i) => {
    if (!isObject(f)) fail(`inputs.frames[${i}]`, 'phải là object');
    if (!isInt(f.tick) || f.tick < 0) fail(`inputs.frames[${i}].tick`, 'phải là số nguyên >= 0');
    if (f.tick <= lastTick) {
      fail(`inputs.frames[${i}].tick`, 'các tick phải tăng nghiêm ngặt');
    }
    lastTick = f.tick;
    const frame = { tick: f.tick };
    if (f.move !== undefined) {
      if (
        !Array.isArray(f.move) ||
        f.move.length !== 2 ||
        !f.move.every((v) => isNum(v) && v >= -1 && v <= 1)
      ) {
        fail(`inputs.frames[${i}].move`, 'phải là [x, z] với mỗi thành phần trong [-1, 1]');
      }
      frame.move = [f.move[0], f.move[1]];
    }
    if (f.cam_yaw_deg !== undefined) {
      if (!isNum(f.cam_yaw_deg)) fail(`inputs.frames[${i}].cam_yaw_deg`, 'phải là số');
      frame.cam_yaw_deg = f.cam_yaw_deg;
    }
    for (const key of ['jump', 'interact', 'pulse', 'dash', 'pause']) {
      if (f[key] !== undefined) {
        if (typeof f[key] !== 'boolean') fail(`inputs.frames[${i}].${key}`, 'phải là boolean');
        frame[key] = f[key];
      }
    }
    frames.push(frame);
  });

  return frames;
}
