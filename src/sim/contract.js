// Validation for the two JSON inputs of the Test Contract v1.0.
// Any malformed file must make the headless run exit with code 2.

export class ContractError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ContractError';
  }
}

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isInt = (v) => Number.isInteger(v);

function fail(where, msg) {
  throw new ContractError(`${where}: ${msg}`);
}

function checkVec3(where, v) {
  if (!Array.isArray(v) || v.length !== 3 || !v.every(isNum)) {
    fail(where, 'phải là mảng 3 số [x, y, z]');
  }
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
    out.player = player;
  }

  for (const key of ['random_motes', 'random_shades']) {
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
      const id = s.id === undefined ? undefined : s.id;
      if (id !== undefined && typeof id !== 'string') fail(`scenario.shades[${i}].id`, 'phải là chuỗi');
      if (id !== undefined) {
        if (seen.has(id)) fail(`scenario.shades[${i}].id`, `id trùng "${id}"`);
        seen.add(id);
      }
      return { pos: s.pos, id };
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
    for (const key of ['jump', 'interact', 'pulse', 'dash']) {
      if (f[key] !== undefined) {
        if (typeof f[key] !== 'boolean') fail(`inputs.frames[${i}].${key}`, 'phải là boolean');
        frame[key] = f[key];
      }
    }
    frames.push(frame);
  });

  return frames;
}
