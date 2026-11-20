import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld, snapshot, setFrames, drainEvents } from '../src/sim/world.js';
import { parseScenario, parseInputs, ContractError } from '../src/sim/contract.js';
import { TUNING } from '../src/sim/config.js';

function build({ seed = 7, scenario = null, frames = [] } = {}) {
  const world = createWorld({ seed, scenario: parseScenario(scenario), tuning: TUNING });
  setFrames(world, parseInputs(frames.length ? { frames } : null));
  return world;
}

function run(world, ticks) {
  const events = [];
  for (let i = 0; i < ticks && world.state === 'playing'; i++) {
    stepWorld(world);
    events.push(...drainEvents(world));
  }
  return events;
}

const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test('tick 0 snapshot is taken before inputs are applied', () => {
  const world = build({
    scenario: { random_motes: false, random_shades: false, motes: [], time_left_s: 10 },
    frames: [{ tick: 0, move: [1, 0] }],
  });
  assert.deepEqual(snapshot(world).player.pos, [0, 0, 0]);
  assert.equal(snapshot(world).time_left_s, 10);
  run(world, 1);
  assert.ok(snapshot(world).player.pos[0] > 0);
});

test('mote is picked up exactly at pickup_radius and scores per_mote', () => {
  const world = build({
    scenario: {
      random_motes: false,
      random_shades: false,
      motes: [[TUNING.pickup_radius, 0, 0]],
    },
  });
  const events = run(world, 1);
  const picked = events.filter((e) => e.name === 'mote_picked');
  assert.equal(picked.length, 1);
  assert.equal(picked[0].tick, 1);
  assert.deepEqual(picked[0].data, { carried: 1 });
  assert.equal(world.player.carried, 1);
  assert.equal(world.score, TUNING.score.per_mote);
  assert.equal(world.motes.length, 0);
});

test('mote is not picked up just outside pickup_radius', () => {
  const world = build({
    scenario: {
      random_motes: false,
      random_shades: false,
      motes: [[TUNING.pickup_radius + 0.01, 0, 0]],
    },
  });
  run(world, 1);
  assert.equal(world.player.carried, 0);
});

test('carry_capacity blocks pickups when full', () => {
  const world = build({
    scenario: {
      player: { carried: TUNING.carry_capacity },
      random_motes: false,
      random_shades: false,
      motes: [[0.5, 0, 0]],
    },
  });
  run(world, 2);
  assert.equal(world.player.carried, TUNING.carry_capacity);
});

test('interact deposits lantern_cost motes, lights the lantern and scores', () => {
  const world = build({
    scenario: {
      player: { pos: [0, 0, 24], carried: 5 },
      random_motes: false,
      random_shades: false,
      motes: [],
      lanterns: [{ id: 'L1', pos: [0, 0, 25] }],
    },
    frames: [{ tick: 0, interact: true }],
  });
  const events = run(world, 1);
  const deposit = events.find((e) => e.name === 'deposit');
  assert.deepEqual(deposit.data, { lantern_id: 'L1', amount: 3, deposited: 3 });
  assert.ok(events.some((e) => e.name === 'lantern_lit' && e.data.lantern_id === 'L1'));
  assert.equal(world.lanterns[0].lit, true);
  assert.equal(world.player.carried, 2);
  assert.equal(world.score, TUNING.score.per_lantern);
});

test('interact outside interact_radius does nothing', () => {
  const world = build({
    scenario: {
      player: { pos: [0, 0, 0], carried: 5 },
      random_motes: false,
      random_shades: false,
      motes: [],
      lanterns: [{ id: 'L1', pos: [0, 0, TUNING.interact_radius + 0.5] }],
    },
    frames: [{ tick: 0, interact: true }],
  });
  run(world, 1);
  assert.equal(world.lanterns[0].deposited, 0);
  assert.equal(world.player.carried, 5);
});

test('pulse stuns and pushes shades within pulse_radius, costs flames and scores per_stun', () => {
  const world = build({
    scenario: {
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [{ pos: [3, 0, 0] }],
    },
    frames: [{ tick: 0, pulse: true }],
  });
  const events = run(world, 1);
  const pulse = events.find((e) => e.name === 'pulse');
  assert.deepEqual(pulse.data.stunned_ids, ['S1']);
  assert.equal(world.player.flames, TUNING.flames - TUNING.pulse_cost);
  assert.equal(world.score, TUNING.score.per_stun);
  assert.equal(world.shades[0].state, 'stunned');
  assert.ok(near(snapshot(world).shades[0].pos[0], 3 + TUNING.pulse_push_m, 1e-3));
});

test('pulse ignores shades outside pulse_radius', () => {
  const world = build({
    scenario: {
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [{ pos: [TUNING.pulse_radius + 1, 0, 0] }],
    },
    frames: [{ tick: 0, pulse: true }],
  });
  const events = run(world, 1);
  assert.deepEqual(events.find((e) => e.name === 'pulse').data.stunned_ids, []);
});

test('pulse respects cooldown', () => {
  const world = build({
    scenario: { random_motes: false, random_shades: false, motes: [], shades: [{ pos: [3, 0, 0] }] },
    frames: [
      { tick: 0, pulse: true },
      { tick: 5, pulse: false },
      { tick: 6, pulse: true },
      { tick: 7, pulse: false },
      { tick: 8, pulse: true },
    ],
  });
  const events = run(world, 20);
  assert.equal(events.filter((e) => e.name === 'pulse').length, 1);
});

test('shade hit costs a flame, drops hit_drop_ratio of carried motes, then invulnerability applies', () => {
  const world = build({
    scenario: {
      player: { carried: 4 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [{ pos: [0.5, 0, 0] }],
    },
  });
  let events = run(world, 1);
  const hit = events.find((e) => e.name === 'player_hit');
  assert.deepEqual(hit.data, { by: 'shade', flames: TUNING.flames - 1, dropped: 2 });
  assert.equal(world.player.carried, 2);

  events = run(world, 30);
  assert.equal(events.filter((e) => e.name === 'player_hit').length, 0, 'invuln_s must block the second hit');
});

test('shades cannot enter safe_radius around a lit lantern', () => {
  const world = build({
    scenario: {
      random_motes: false,
      random_shades: false,
      motes: [],
      lanterns: [{ id: 'L1', pos: [0, 0, 10], lit: true }],
      shades: [{ pos: [0, 0, 7] }],
    },
  });
  run(world, 1);
  const shade = snapshot(world).shades[0];
  const distanceToLantern = Math.hypot(shade.pos[0] - 0, shade.pos[2] - 10);
  assert.ok(distanceToLantern >= TUNING.safe_radius - 1e-3, `shade must stay outside safe_radius (got ${distanceToLantern})`);
});

test('falling off the island costs a flame and respawns at the origin', () => {
  const world = build({
    scenario: {
      player: { pos: [40, 0, 0] },
      random_motes: false,
      random_shades: false,
      motes: [],
    },
  });
  const events = run(world, 1);
  const hit = events.find((e) => e.name === 'player_hit');
  assert.deepEqual(hit.data, { by: 'fall', flames: TUNING.flames - 1, dropped: 0 });
  assert.deepEqual(snapshot(world).player.pos, [0, 0, 0]);
});

test('fall_enabled=false keeps the player inside the island without damage', () => {
  const world = createWorld({
    seed: 1,
    scenario: parseScenario({ player: { pos: [40, 0, 0] }, random_motes: false, random_shades: false, motes: [] }),
    tuning: { ...TUNING, fall_enabled: false },
  });
  run(world, 1);
  assert.equal(world.player.flames, TUNING.flames);
  assert.ok(Math.hypot(world.player.x, world.player.z) <= 28 + 1e-6);
});

test('dawn ends the night as a loss', () => {
  const world = build({
    scenario: { random_motes: false, random_shades: false, motes: [], time_left_s: 0.05 },
  });
  const events = run(world, 5);
  const over = events.find((e) => e.name === 'game_over');
  assert.deepEqual(over.data, { result: 'lost', reason: 'dawn' });
  assert.equal(world.state, 'lost');
  assert.equal(world.tick, 3);
});

test('lighting the last lantern wins and applies end-of-night bonuses', () => {
  const world = build({
    scenario: {
      player: { pos: [0, 0, 24], carried: 1 },
      random_motes: false,
      random_shades: false,
      motes: [],
      lanterns: [
        { id: 'L1', lit: true },
        { id: 'L2', lit: true },
        { id: 'L3', lit: true },
        { id: 'L4', lit: true },
        { id: 'L5', pos: [0, 0, 25], deposited: 2 },
      ],
    },
    frames: [{ tick: 0, interact: true }],
  });
  const events = run(world, 1);
  const over = events.find((e) => e.name === 'game_over');
  assert.deepEqual(over.data, { result: 'won', reason: 'all_lit' });
  const expected = TUNING.score.per_lantern + 299 * TUNING.score.per_second_left + 5 * TUNING.score.per_flame_left;
  assert.equal(world.score, expected);
});

test('camera yaw rotates the movement vector exactly as the contract specifies', () => {
  const world = build({
    scenario: { random_motes: false, random_shades: false, motes: [] },
    frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }],
  });
  run(world, 60);
  const pos = snapshot(world).player.pos;
  assert.ok(near(pos[0], TUNING.player_speed, 1e-3));
  assert.ok(near(pos[2], 0, 1e-3));
});

test('movement longer than 1 is normalised', () => {
  const world = build({
    scenario: { random_motes: false, random_shades: false, motes: [] },
    frames: [{ tick: 0, move: [1, 1] }],
  });
  run(world, 60);
  const pos = snapshot(world).player.pos;
  const expected = TUNING.player_speed / Math.SQRT2;
  assert.ok(near(pos[0], expected, 1e-3));
  assert.ok(near(pos[2], expected, 1e-3));
});

test('jump leaves the ground and gravity brings the player back', () => {
  const world = build({
    scenario: { random_motes: false, random_shades: false, motes: [] },
    frames: [
      { tick: 0, jump: true },
      { tick: 1, jump: false },
    ],
  });
  run(world, 10);
  assert.ok(world.player.y > 0);
  run(world, 60);
  assert.equal(world.player.y, 0);
  assert.equal(world.player.on_ground, true);
});

test('same seed + scenario + inputs produce identical output', () => {
  const scenario = {
    random_motes: true,
    random_shades: true,
    time_left_s: 120,
    motes: [[2, 0, 3]],
    shades: [{ pos: [12, 0, -4] }],
  };
  const frames = [
    { tick: 0, move: [1, 0], cam_yaw_deg: 30 },
    { tick: 40, move: [0, 1] },
    { tick: 80, pulse: true },
    { tick: 90, pulse: false, interact: true },
  ];
  const outputs = [0, 1].map(() => {
    const world = build({ scenario, frames });
    const lines = [JSON.stringify(snapshot(world))];
    for (let i = 0; i < 400 && world.state === 'playing'; i++) {
      stepWorld(world);
      for (const e of drainEvents(world)) lines.push(JSON.stringify(e));
      lines.push(JSON.stringify(snapshot(world)));
    }
    lines.push(JSON.stringify({ type: 'end', ticks: world.tick, state: world.state, score: world.score }));
    return lines.join('\n');
  });
  assert.equal(outputs[0], outputs[1]);
});

test('scenario construction emits no events and adds no score', () => {
  const world = build({
    scenario: {
      random_motes: false,
      random_shades: false,
      motes: [[1, 0, 1]],
      lanterns: [{ id: 'L1', lit: true }, { id: 'L2', deposited: 3 }],
    },
  });
  assert.equal(world.score, 0);
  assert.equal(drainEvents(world).length, 0);
  assert.equal(world.lanterns[1].lit, true);
});

test('snapshot fields and coordinate rounding follow the contract', () => {
  const world = build({
    scenario: {
      random_motes: false,
      random_shades: false,
      motes: [[1.23456, 0, -2.98765]],
      shades: [{ pos: [1.1111, 0, 2.2222] }],
      time_left_s: 12.3456,
    },
  });
  const snap = snapshot(world);
  assert.equal(snap.type, 'snapshot');
  assert.equal(snap.sim_tick, 0);
  assert.equal(snap.state, 'playing');
  assert.equal(snap.time_left_s, 12.346);
  assert.equal(snap.motes[0].pos[0], 1.235);
  assert.equal(snap.shades[0].pos[0], 1.111);
  assert.equal(snap.motes_active, 1);
  for (const v of snap.player.pos) {
    assert.equal(v, Math.round(v * 1000) / 1000);
  }
});

test('inputs validation rejects malformed frames', () => {
  assert.throws(() => parseInputs({ frames: [{ tick: 5 }, { tick: 5 }] }), ContractError);
  assert.throws(() => parseInputs({ frames: [{ tick: 0, move: [2, 0] }] }), ContractError);
  assert.throws(() => parseInputs({ frames: [{ tick: -1 }] }), ContractError);
  assert.throws(() => parseInputs({ frames: [{ tick: 0, jump: 'yes' }] }), ContractError);
  assert.throws(() => parseInputs({ frames: 'nope' }), ContractError);
});

test('scenario validation rejects malformed data', () => {
  assert.throws(() => parseScenario({ player: { pos: [1, 2] } }), ContractError);
  assert.throws(() => parseScenario({ motes: [[0, 0]] }), ContractError);
  assert.throws(() => parseScenario({ shades: [{ pos: [0, 0, 0] }, { pos: [0, 0, 0], id: 'S1' }, { pos: [1, 0, 0], id: 'S1' }] }), ContractError);
  assert.throws(() => parseScenario({ time_left_s: -1 }), ContractError);
  assert.throws(() => parseScenario([]), ContractError);
});

test('tuning in game.contract.json matches the simulation constants', async () => {
  const fs = await import('node:fs');
  const contract = JSON.parse(fs.readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));
  assert.deepEqual(contract.tuning, JSON.parse(JSON.stringify(TUNING)));
});
