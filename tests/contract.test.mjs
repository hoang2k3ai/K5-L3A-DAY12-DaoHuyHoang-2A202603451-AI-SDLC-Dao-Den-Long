import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, stepWorld, snapshot, setFrames, drainEvents } from '../src/sim/world.js';
import { parseScenario, parseInputs, ContractError } from '../src/sim/contract.js';
import { TUNING } from '../src/sim/config.js';

function build({ seed = 7, night = 1, scenario = null, frames = [], tuning = TUNING } = {}) {
  const world = createWorld({ seed, night, scenario: parseScenario(scenario), tuning });
  setFrames(world, parseInputs(frames.length ? { frames } : null));
  return world;
}

function run(world, ticks) {
  const events = [];
  for (let i = 0; i < ticks && (world.state === 'playing' || world.state === 'paused'); i++) {
    stepWorld(world);
    events.push(...drainEvents(world));
  }
  return events;
}

const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const quiet = { random_motes: false, random_shades: false, motes: [] };

test('drifter contacts use numeric id order before the shade hit', () => {
  const world = build({
    night: 2,
    scenario: {
      ...quiet,
      player: { carried: 6 },
      drifters: [{ id: 'D10', pos: [0, 1.5, 0] }, { id: 'D2', pos: [0, 1.5, 0] }],
      shades: [{ pos: [0, 0, 0] }],
    },
  });
  const contacts = run(world, 1).filter(({ name }) => name === 'drifter_steal' || name === 'player_hit');
  assert.deepEqual(contacts.map(({ name }) => name), ['drifter_steal', 'drifter_steal', 'player_hit']);
  assert.deepEqual(contacts.slice(0, 2).map(({ data }) => data.drifter_id), ['D2', 'D10']);
  assert.equal(contacts[2].data.dropped, 0);
});

test('scenario recoil respects state_ticks_left', () => {
  const world = build({
    scenario: { ...quiet, shades: [{ pos: [10, 0, 0], state: 'recoil', state_ticks_left: 3 }] },
  });
  run(world, 2);
  assert.equal(world.shades[0].state, 'recoil');
  run(world, 1);
  assert.equal(world.shades[0].state, 'wander');
});

test('tick 0 snapshot is taken before inputs are applied', () => {
  const world = build({
    scenario: { ...quiet, time_left_s: 10 },
    frames: [{ tick: 0, move: [1, 0] }],
  });
  assert.deepEqual(snapshot(world).player.pos, [0, 0, 0]);
  assert.equal(snapshot(world).time_left_s, 10);
  run(world, 1);
  assert.ok(snapshot(world).player.pos[0] > 0);
});

test('mote is picked up exactly at pickup_radius', () => {
  const world = build({ scenario: { ...quiet, motes: [[TUNING.pickup_radius, 0, 0]] } });
  const events = run(world, 1);
  const picked = events.filter((e) => e.name === 'mote_picked');
  assert.equal(picked.length, 1);
  assert.equal(picked[0].tick, 1);
  assert.deepEqual(picked[0].data, { carried: 1 });
  assert.equal(world.player.carried, 1);
  assert.equal(world.motes.length, 0);
});

test('mote just outside pickup_radius is not picked up', () => {
  const world = build({ scenario: { ...quiet, motes: [[TUNING.pickup_radius + 0.01, 0, 0]] } });
  run(world, 1);
  assert.equal(world.player.carried, 0);
});

test('a mote on another tier is not picked up through the floor', () => {
  const world = build({
    night: 3,
    scenario: { ...quiet, player: { pos: [0, 6, 0] }, motes: [[0, 0, 0]] },
  });
  run(world, 1);
  assert.equal(world.player.carried, 0);
});

test('carry_capacity blocks pickups when full', () => {
  const world = build({
    scenario: { ...quiet, player: { carried: TUNING.carry_capacity }, motes: [[0.5, 0, 0]] },
  });
  run(world, 2);
  assert.equal(world.player.carried, TUNING.carry_capacity);
});

test('interact deposits 10 motes, lights the lantern and scores', () => {
  const world = build({
    scenario: {
      ...quiet,
      player: { pos: [0, 0, 24], carried: 10 },
      lanterns: [{ id: 'L1', pos: [0, 0, 25] }],
    },
    frames: [{ tick: 0, interact: true }],
  });
  const events = run(world, 1);
  const deposit = events.find((e) => e.name === 'deposit');
  assert.deepEqual(deposit.data, { lantern_id: 'L1', amount: 10, deposited: 10 });
  assert.ok(events.some((e) => e.name === 'lantern_lit' && e.data.lantern_id === 'L1'));
  assert.equal(world.lanterns[0].lit, true);
  assert.equal(world.player.carried, 0);
  assert.equal(world.score, 10 * TUNING.score.per_mote + TUNING.score.per_lantern);
});

test('deposit is partial and the lantern remembers progress', () => {
  const world = build({
    scenario: {
      ...quiet,
      player: { pos: [0, 0, 24], carried: 4 },
      lanterns: [{ id: 'L1', pos: [0, 0, 25], deposited: 2 }],
    },
    frames: [
      { tick: 0, interact: true },
      { tick: 1, interact: false },
      { tick: 2, interact: true },
    ],
  });
  const events = run(world, 3);
  const deposits = events.filter((e) => e.name === 'deposit');
  assert.equal(deposits.length, 1);
  assert.equal(deposits[0].data.amount, 4);
  assert.equal(world.lanterns[0].deposited, 6);
  assert.equal(world.lanterns[0].lit, false);
  assert.equal(world.player.carried, 0);
});

test('a deposit never overshoots lantern_cost', () => {
  const world = build({
    scenario: {
      ...quiet,
      player: { pos: [0, 0, 24], carried: 10 },
      lanterns: [{ id: 'L1', pos: [0, 0, 25], deposited: 7 }],
    },
    frames: [{ tick: 0, interact: true }],
  });
  const events = run(world, 1);
  const deposit = events.find((e) => e.name === 'deposit');
  assert.equal(deposit.data.amount, 3);
  assert.equal(world.player.carried, 7);
  assert.equal(world.lanterns[0].lit, true);
});

test('interact outside interact_radius does nothing', () => {
  const world = build({
    scenario: {
      ...quiet,
      player: { pos: [0, 0, 0], carried: 10 },
      lanterns: [{ id: 'L1', pos: [0, 0, TUNING.interact_radius + 0.5] }],
    },
    frames: [{ tick: 0, interact: true }],
  });
  run(world, 1);
  assert.equal(world.lanterns[0].deposited, 0);
  assert.equal(world.player.carried, 10);
});

test('nearest eligible lantern is chosen and a full lantern is ignored', () => {
  const world = build({
    tuning: { ...TUNING, fuel_decay_per_s: 0 },
    scenario: {
      ...quiet,
      player: { pos: [0, 0, 0], carried: 10 },
      lanterns: [
        { id: 'L1', pos: [0, 0, 0.5], lit: true },
        { id: 'L2', pos: [0, 0, 1.8] },
        { id: 'L3', pos: [0, 0, 1.2] },
      ],
    },
    frames: [{ tick: 0, interact: true }],
  });
  const events = run(world, 1);
  assert.equal(events.find((e) => e.name === 'deposit').data.lantern_id, 'L3');
});

test('pulse costs 3 motes, stuns for 120 ticks, pushes 4 m and scores 5', () => {
  const world = build({
    scenario: { ...quiet, player: { carried: 3 }, shades: [{ pos: [3, 0, 0] }] },
    frames: [{ tick: 0, pulse: true }],
  });
  const events = run(world, 1);
  const pulse = events.find((e) => e.name === 'pulse');
  assert.deepEqual(pulse.data.stunned_ids, ['S1']);
  assert.equal(world.player.carried, 0);
  assert.equal(world.score, TUNING.score.per_stun);
  assert.equal(world.shades[0].state, 'stunned');
  assert.equal(snapshot(world).shades[0].state_ticks_left, TUNING.pulse_stun_s * 60);

  run(world, 14);
  assert.ok(near(snapshot(world).shades[0].pos[0], 3 + TUNING.pulse_push_m, 1e-3));

  run(world, 120);
  assert.notEqual(world.shades[0].state, 'stunned');
});

test('pulse does nothing without 3 motes', () => {
  const world = build({
    scenario: { ...quiet, player: { carried: 2 }, shades: [{ pos: [3, 0, 0] }] },
    frames: [{ tick: 0, pulse: true }],
  });
  const events = run(world, 1);
  assert.equal(events.filter((e) => e.name === 'pulse').length, 0);
  assert.equal(world.player.carried, 2);
});

test('pulse ignores shades outside pulse_radius', () => {
  const world = build({
    scenario: { ...quiet, player: { carried: 3 }, shades: [{ pos: [TUNING.pulse_radius + 1, 0, 0] }] },
    frames: [{ tick: 0, pulse: true }],
  });
  const events = run(world, 1);
  assert.deepEqual(events.find((e) => e.name === 'pulse').data.stunned_ids, []);
});

test('pulse respects its 3 s cooldown', () => {
  const world = build({
    scenario: { ...quiet, player: { carried: 9 }, shades: [{ pos: [3, 0, 0] }] },
    frames: [
      { tick: 0, pulse: true },
      { tick: 1, pulse: false },
      { tick: 100, pulse: true },
      { tick: 101, pulse: false },
      { tick: 181, pulse: true },
      { tick: 182, pulse: false },
    ],
  });
  const events = run(world, 200);
  assert.equal(events.filter((e) => e.name === 'pulse').length, 2);
});

test('shade hit costs a flame, drops half the carried motes and grants 90 ticks of invulnerability', () => {
  const world = build({
    scenario: { ...quiet, player: { carried: 4 }, shades: [{ pos: [0.5, 0, 0] }] },
  });
  const events = run(world, 1);
  const hit = events.find((e) => e.name === 'player_hit');
  assert.deepEqual(hit.data, { by: 'shade', flames: TUNING.flames - 1, dropped: 2 });
  assert.equal(world.player.carried, 2);
  assert.equal(snapshot(world).player.invuln, TUNING.invuln_s);
  assert.equal(world.motes.filter((m) => m.kind === 'dropped').length, 2);

  const more = run(world, 30);
  assert.equal(more.filter((e) => e.name === 'player_hit').length, 0);
});

test('dropped motes land outside pickup range and can be collected by walking over them', () => {
  const world = build({
    scenario: {
      ...quiet,
      player: { pos: [0, 0, 0], carried: 2 },
      shades: [{ pos: [0.5, 0, 0] }],
    },
  });
  run(world, 1);
  assert.equal(world.motes.length, 1);
  const mote = world.motes[0];
  assert.equal(mote.kind, 'dropped');
  const radius = Math.hypot(mote.x - 0, mote.z - 0);
  assert.ok(radius >= 1.5 - 1e-6 && radius <= 2.5 + 1e-6, `drop radius ${radius}`);
  assert.ok(radius > TUNING.pickup_radius, 'drop must be outside immediate pickup range');
  assert.equal(snapshot(world).motes[0].ttl_s, 8);

  world.player.invuln_until = 0;
  world.player.x = mote.x;
  world.player.z = mote.z;
  run(world, 1);
  assert.equal(world.player.carried, 2);
});

test('shades cannot enter the 6 m safe radius around a lit lantern', () => {
  const world = build({
    scenario: {
      ...quiet,
      player: { pos: [0, 0, 10.5] },
      lanterns: [{ id: 'L1', pos: [0, 0, 10], lit: true }],
      shades: [{ pos: [0, 0, 4] }],
    },
  });
  const events = run(world, 120);
  const snaps = [snapshot(world)];
  const distance = Math.hypot(snaps[0].shades[0].pos[0], snaps[0].shades[0].pos[2] - 10);
  assert.ok(distance >= TUNING.safe_radius - 1e-3, `shade entered safe radius: ${distance}`);
  assert.equal(events.filter((e) => e.name === 'player_hit').length, 0);
});

test('falling off the island costs a flame, drops everything and respawns after 60 ticks', () => {
  const world = build({
    scenario: { ...quiet, player: { pos: [60, 0, 0], carried: 5, flames: 3 } },
  });
  const events = run(world, 140);
  const hit = events.find((e) => e.name === 'player_hit');
  assert.equal(hit.data.by, 'fall');
  assert.equal(hit.data.flames, 2);
  assert.equal(hit.data.lost, 5);
  assert.equal(world.player.carried, 0);
  assert.deepEqual(snapshot(world).player.pos, [0, 0, 0]);
  assert.ok(snapshot(world).player.invuln > 0);
});

test('a fall with the last flame loses immediately and never respawns', () => {
  const world = build({
    scenario: { ...quiet, player: { pos: [60, 0, 0], flames: 1 } },
  });
  const events = run(world, 200);
  assert.equal(world.state, 'lost');
  assert.equal(world.end_reason, 'no_flames');
  const over = events.find((e) => e.name === 'game_over');
  assert.deepEqual(over.data, { result: 'lost', reason: 'no_flames' });
});

test('dawn ends the night as a loss', () => {
  const world = build({ scenario: { ...quiet, time_left_s: 0.05 } });
  const events = run(world, 5);
  const over = events.find((e) => e.name === 'game_over');
  assert.deepEqual(over.data, { result: 'lost', reason: 'dawn' });
  assert.equal(world.tick, 3);
});

test('lighting the last lantern waits for dawn and scores the remaining fuel', () => {
  const world = build({
    scenario: {
      ...quiet,
      time_left_s: 0.05,
      player: { pos: [0, 0, 24], carried: 1 },
      lanterns: [
        { id: 'L1', lit: true, pos: [0, 0, 15] },
        { id: 'L2', lit: true },
        { id: 'L3', lit: true },
        { id: 'L4', lit: true },
        { id: 'L5', pos: [0, 0, 25], deposited: 9 },
      ],
    },
    frames: [{ tick: 0, interact: true }],
  });
  run(world, 1);
  assert.equal(world.state, 'playing');
  const events = run(world, 2);
  const over = events.find((e) => e.name === 'game_over');
  assert.deepEqual(over.data, { result: 'won', reason: 'dawn_survived' });
  assert.equal(world.score, 5 + 100 + 5 * (50 + 99) + 3 * 50);
});

test('camera yaw rotates the movement vector exactly as the contract specifies', () => {
  const world = build({
    scenario: quiet,
    frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }],
  });
  run(world, 60);
  const pos = snapshot(world).player.pos;
  assert.ok(near(pos[0], TUNING.player_speed, 1e-3));
  assert.ok(near(pos[2], 0, 1e-3));
});

test('movement longer than 1 is normalised', () => {
  const world = build({ scenario: quiet, frames: [{ tick: 0, move: [1, 1] }] });
  run(world, 60);
  const pos = snapshot(world).player.pos;
  const expected = TUNING.player_speed / Math.SQRT2;
  assert.ok(near(pos[0], expected, 1e-3));
  assert.ok(near(pos[2], expected, 1e-3));
});

test('jump leaves the ground and gravity brings the player back', () => {
  const world = build({
    scenario: quiet,
    frames: [
      { tick: 0, jump: true },
      { tick: 1, jump: false },
    ],
  });
  run(world, 10);
  assert.ok(world.player.y > 0);
  run(world, 60);
  assert.equal(world.player.y, 0);
  assert.equal(world.player.grounded, true);
});

test('dash covers 2.8 m in 12 ticks and has a 1.5 s cooldown', () => {
  const world = build({
    scenario: quiet,
    frames: [
      { tick: 0, move: [1, 0], dash: true },
      { tick: 1, move: [1, 0], dash: false },
      { tick: 50, dash: true },
      { tick: 51, dash: false },
      { tick: 100, dash: true },
      { tick: 101, dash: false },
    ],
  });
  const events = run(world, 12);
  assert.ok(near(snapshot(world).player.pos[0], TUNING.dash_speed * TUNING.dash_duration_s, 1e-3));
  const more = run(world, 120);
  const dashes = [...events, ...more].filter((e) => e.name === 'dash');
  assert.equal(dashes.length, 2, 'the tick-50 dash must be blocked by the cooldown');
});

test('dash in the air keeps altitude', () => {
  const world = build({
    scenario: { ...quiet, player: { pos: [0, 20, 0] } },
    frames: [
      { tick: 0, move: [1, 0], jump: true },
      { tick: 1, jump: false },
      { tick: 5, dash: true },
      { tick: 6, dash: false },
    ],
  });
  run(world, 6);
  const yBefore = world.player.y;
  run(world, 6);
  assert.ok(near(world.player.y, yBefore, 1e-3));
});

test('charm raises run speed to 7.2 m/s and removes dash cooldown', () => {
  const world = build({
    scenario: { ...quiet, player: { charm_ticks: 600 } },
    frames: [
      { tick: 0, move: [1, 0], dash: true },
      { tick: 1, move: [1, 0], dash: false },
      { tick: 20, dash: true },
      { tick: 21, dash: false },
    ],
  });
  const events = run(world, 12);
  const dashes = events.filter((e) => e.name === 'dash');
  assert.equal(dashes.length, 1);
  const more = run(world, 30);
  assert.equal(more.filter((e) => e.name === 'dash').length, 1);
  assert.equal(snapshot(world).player.dash_cd_s, 0);

  const walking = build({
    scenario: { ...quiet, player: { charm_ticks: 600 } },
    frames: [{ tick: 0, move: [1, 0] }],
  });
  run(walking, 60);
  assert.ok(near(walking.player.x, 7.2, 1e-3));
});

test('charm pickup grants 600 ticks and respawns after 2700 ticks', () => {
  const world = build({
    scenario: {
      ...quiet,
      charms: [{ id: 'C1', pos: [1, 0, 0] }],
    },
  });
  const events = run(world, 1);
  const picked = events.find((e) => e.name === 'charm_picked');
  assert.deepEqual(picked.data, { charm_id: 'C1', charm_ticks: 600 });
  assert.equal(world.charms[0].available, false);
  assert.equal(snapshot(world).charms[0].respawn_s, 45);

  world.player.x = 10; // step away so the respawned charm is not re-collected
  run(world, 2700);
  assert.equal(world.charms[0].available, true);
});

test('a drifter starts chasing at 5 carried motes and steals 3', () => {
  const world = build({
    scenario: {
      ...quiet,
      player: { carried: 5 },
      drifters: [{ id: 'D1', pos: [5, 0, 0], state: 'idle' }],
    },
  });
  run(world, 1);
  assert.equal(world.drifters[0].state, 'chase');
  const events = run(world, 60);
  const steal = events.find((e) => e.name === 'drifter_steal');
  assert.deepEqual(steal.data, { drifter_id: 'D1', amount: 3, carried: 2 });
  assert.equal(world.drifters[0].state, 'flee');
  assert.equal(world.drifters[0].stolen, 3);
});

test('pulsing a fleeing drifter makes it drop the stolen motes', () => {
  const world = build({
    scenario: {
      ...quiet,
      player: { carried: 3 },
      drifters: [{ id: 'D1', pos: [3, 0, 0], state: 'flee', stolen: 3, state_ticks_left: 200 }],
    },
    frames: [{ tick: 0, pulse: true }],
  });
  const events = run(world, 1);
  const drop = events.find((e) => e.name === 'drifter_drop');
  assert.deepEqual(drop.data, { drifter_id: 'D1', amount: 3 });
  assert.equal(world.motes.filter((m) => m.kind === 'dropped').length, 3);
  assert.equal(world.drifters[0].state, 'removed');
});

test('pulsing a chasing drifter makes it flee without stealing', () => {
  const world = build({
    scenario: {
      ...quiet,
      player: { carried: 5 },
      drifters: [{ id: 'D1', pos: [3, 0, 0], state: 'chase' }],
    },
    frames: [{ tick: 0, pulse: true }],
  });
  const events = run(world, 1);
  assert.equal(events.filter((e) => e.name === 'drifter_steal').length, 0);
  assert.equal(world.drifters[0].state, 'flee');
  assert.equal(world.drifters[0].stolen, 0);
});

test('wind on Night 3 activates every 30 s and pushes the player 2 m/s', () => {
  const world = build({ night: 3 });
  run(world, 1800);
  const snap = snapshot(world);
  assert.equal(snap.wind.active, true);
  assert.ok(snap.wind.dir_deg >= 0 && snap.wind.dir_deg < 360);
  const before = { x: world.player.x, z: world.player.z };
  run(world, 60);
  const moved = Math.hypot(world.player.x - before.x, world.player.z - before.z);
  assert.ok(moved > 1.5 && moved < 2.5, `wind moved the player ${moved} m in 1 s`);
});

test('Night 2 bridge is walkable and the void between islands is not', () => {
  const walker = build({
    night: 2,
    scenario: { ...quiet, player: { pos: [35, 0, 0] } },
    frames: [{ tick: 0, move: [1, 0] }],
  });
  const events = run(walker, 120);
  assert.equal(events.filter((e) => e.name === 'player_hit').length, 0);
  assert.ok(walker.player.x > 45);

  const faller = build({ night: 2, scenario: { ...quiet, player: { pos: [35, 0, 5] } } });
  const fallen = run(faller, 120);
  assert.ok(fallen.some((e) => e.name === 'player_hit' && e.data.by === 'fall'));
});

test('Night 2 jump pad launches the player to the other island', () => {
  const world = build({ night: 2, scenario: { ...quiet, player: { pos: [20, 0, 18] } } });
  run(world, 120);
  assert.ok(world.player.x > 45, `landed at x=${world.player.x}`);
  assert.equal(world.player.y, 0);
  assert.equal(world.player.grounded, true);
});

test('Night 3 tiers, ramps and the bell tower pad work', () => {
  const tier1 = build({
    night: 3,
    scenario: { ...quiet, player: { pos: [0, 3, 13] } },
  });
  assert.equal(snapshot(tier1).player.pos[1], 3);

  const tier2 = build({
    night: 3,
    scenario: { ...quiet, player: { pos: [0, 6, 0] } },
  });
  assert.equal(snapshot(tier2).player.pos[1], 6);

  const ramp = build({
    night: 3,
    scenario: { ...quiet, player: { pos: [25.98, 0, 15] } },
    frames: [{ tick: 0, move: [-0.866, -0.5] }],
  });
  run(ramp, 60);
  assert.ok(near(ramp.player.y, 3, 0.2), `ramp height ${ramp.player.y}`);

  const pad = build({ night: 3, scenario: { ...quiet, player: { pos: [0, 3, 13] } } });
  run(pad, 120);
  assert.ok(near(pad.player.y, 6, 0.01), `pad landing y=${pad.player.y}`);
});

test('pause freezes sim_tick, time and cooldowns while tick keeps advancing', () => {
  const world = build({
    scenario: { ...quiet, time_left_s: 100 },
    frames: [
      { tick: 0, pause: true },
      { tick: 2, pause: false },
      { tick: 5, pause: true },
      { tick: 6, pause: false },
    ],
  });
  const first = run(world, 3);
  const paused = snapshot(world);
  assert.equal(paused.state, 'paused');
  assert.equal(paused.tick, 3);
  assert.equal(paused.sim_tick, 0);
  assert.equal(paused.time_left_s, 100);
  assert.deepEqual(first.find((e) => e.name === 'paused').data, {});

  const rest = run(world, 3);
  assert.equal(snapshot(world).state, 'playing');
  assert.equal(snapshot(world).sim_tick, 1);
  assert.ok(rest.some((e) => e.name === 'resumed'));
});

test('mote spawn schedule adds one every 240 ticks up to the cap', () => {
  const world = build({});
  run(world, 240);
  assert.equal(world.motes.length, 21);
  run(world, 240);
  assert.equal(world.motes.length, 22);
});

test('same seed + scenario + inputs produce identical output', () => {
  const scenario = {
    random_motes: true,
    random_shades: true,
    random_drifters: true,
    time_left_s: 120,
    motes: [[2, 0, 3]],
    shades: [{ pos: [12, 0, -4] }],
  };
  const frames = [
    { tick: 0, move: [1, 0], cam_yaw_deg: 30 },
    { tick: 40, move: [0, 1], dash: true },
    { tick: 41, dash: false },
    { tick: 80, pulse: true },
    { tick: 90, pulse: false, interact: true },
  ];
  const outputs = [0, 1].map(() => {
    const world = build({ night: 2, scenario, frames });
    const lines = [JSON.stringify(snapshot(world))];
    for (let i = 0; i < 600 && world.state === 'playing'; i++) {
      stepWorld(world);
      for (const e of drainEvents(world)) lines.push(JSON.stringify(e));
      lines.push(JSON.stringify(snapshot(world)));
    }
    return lines.join('\n');
  });
  assert.equal(outputs[0], outputs[1]);
});

test('scenario construction emits no events and adds no score', () => {
  const world = build({
    scenario: {
      ...quiet,
      motes: [[1, 0, 1]],
      lanterns: [{ id: 'L1', lit: true }, { id: 'L2', deposited: 10 }],
    },
  });
  assert.equal(world.score, 0);
  assert.equal(drainEvents(world).length, 0);
  assert.equal(world.lanterns[1].lit, true);
});

test('snapshot fields and coordinate rounding follow the contract', () => {
  const world = build({
    scenario: {
      ...quiet,
      motes: [[1.23456, 0, -2.98765]],
      shades: [{ pos: [1.1111, 0, 2.2222] }],
      time_left_s: 12.3456,
    },
  });
  const snap = snapshot(world);
  assert.equal(snap.type, 'snapshot');
  assert.equal(snap.sim_tick, 0);
  assert.equal(snap.night, 1);
  assert.equal(snap.state, 'playing');
  assert.equal(snap.time_left_s, 12.346);
  assert.equal(snap.motes[0].pos[0], 1.235);
  assert.equal(snap.motes[0].kind, 'random');
  assert.equal(snap.shades[0].pos[0], 1.111);
  assert.equal(snap.motes_active, 1);
  assert.ok(Array.isArray(snap.drifters));
  assert.ok(Array.isArray(snap.charms));
  assert.deepEqual(snap.wind, { active: false, dir_deg: 0 });
});

test('shade states use only the v1.2 names', () => {
  const allowed = new Set(['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain']);
  const world = build({});
  for (let i = 0; i < 900; i++) {
    stepWorld(world);
    for (const s of world.shades) assert.ok(allowed.has(s.state), `bad state ${s.state}`);
  }
});

test('inputs validation rejects malformed frames', () => {
  assert.throws(() => parseInputs({ frames: [{ tick: 5 }, { tick: 5 }] }), ContractError);
  assert.throws(() => parseInputs({ frames: [{ tick: 0, move: [2, 0] }] }), ContractError);
  assert.throws(() => parseInputs({ frames: [{ tick: -1 }] }), ContractError);
  assert.throws(() => parseInputs({ frames: [{ tick: 0, jump: 'yes' }] }), ContractError);
  assert.throws(() => parseInputs({ frames: [{ tick: 0, pause: 1 }] }), ContractError);
  assert.throws(() => parseInputs({ frames: 'nope' }), ContractError);
});

test('scenario validation rejects malformed data', () => {
  assert.throws(() => parseScenario({ player: { pos: [1, 2] } }), ContractError);
  assert.throws(() => parseScenario({ motes: [[0, 0]] }), ContractError);
  assert.throws(
    () => parseScenario({ shades: [{ pos: [0, 0, 0] }, { pos: [0, 0, 0], id: 'S1' }, { pos: [1, 0, 0], id: 'S1' }] }),
    ContractError,
  );
  assert.throws(() => parseScenario({ shades: [{ pos: [0, 0, 0], state: 'angry' }] }), ContractError);
  assert.throws(() => parseScenario({ drifters: [{ pos: [0, 0, 0], state: 'angry' }] }), ContractError);
  assert.throws(() => parseScenario({ time_left_s: -1 }), ContractError);
  assert.throws(() => parseScenario([]), ContractError);
});

test('tuning in game.contract.json matches the simulation constants', async () => {
  const fs = await import('node:fs');
  const contract = JSON.parse(fs.readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));
  assert.equal(contract.contract_version, '1.2');
  assert.deepEqual(contract.tuning, JSON.parse(JSON.stringify(TUNING)));
});
