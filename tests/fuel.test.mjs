import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScenario, ContractError } from '../src/sim/contract.js';
import { createWorld, drainEvents, lanternHasSafeZone, snapshot, stepWorld } from '../src/sim/world.js';

function setup(scenario, night = 1) {
  return createWorld({
    night,
    scenario: parseScenario({ random_motes: false, random_shades: false, random_drifters: false, ...scenario }),
  });
}

function step(world, ticks = 1, input = {}) {
  for (let i = 0; i < ticks; i++) stepWorld(world, input);
  return drainEvents(world);
}

const lantern = (world, index = 0) => snapshot(world).lanterns[index];
const burning = (fuel) => ({ id: 'L1', lit: true, fuel });
const drainer = (id, x) => ({ id, pos: [x, 0, 25], state: 'drain', target_lantern_id: 'L1' });

test('passive decay pauses and extinguishes at zero; relighting costs five and increases capacity', () => {
  const world = setup({
    lanterns: [{ ...burning(1), deposited: 10 }],
    player: { pos: [0, 0, 24], carried: 5 },
  });
  assert.equal(snapshot(world).player.capacity, 10);
  step(world, 1, { pause: true });
  assert.equal(lantern(world).fuel, 1);
  step(world, 10, { pause: false });
  step(world, 1, { pause: true });
  step(world, 58);
  assert.equal(lantern(world).lit, true);
  const events = step(world, 1, { interact: true });
  assert.deepEqual(events.map(({ name }) => name), ['lantern_out', 'deposit', 'lantern_lit']);
  assert.deepEqual(events[1].data, { lantern_id: 'L1', amount: 5, deposited: 5 });
  assert.deepEqual(events[2].data, { lantern_id: 'L1', relight: true });
  assert.deepEqual(lantern(world), {
    id: 'L1', pos: [0, 0, 25], lit: true, deposited: 5, fuel: 100, ever_lit: true, relit_count: 1,
  });
  assert.equal(snapshot(world).player.capacity, 12);
  assert.equal(world.score, 65);
});

test('refuel uses ceil, clips at 100, and picks smaller eligible id on a tie', () => {
  const world = setup({
    player: { carried: 5 },
    lanterns: [{ ...burning(80), pos: [1, 0, 0] }, { id: 'L2', pos: [-1, 0, 0] }],
  });
  assert.deepEqual(step(world, 1, { interact: true })[0].data, { lantern_id: 'L1', amount: 3, fuel: 100 });
  assert.equal(world.player.carried, 2);
  assert.equal(world.score, 15);
  assert.equal(snapshot(world).player.capacity, 10);
});

test('capacity from successful lights caps at twenty and governs pickup', () => {
  const world = setup({
    player: { carried: 19, successful_lights: 7 }, motes: [[0, 0, 0], [0, 0, 0]],
  });
  step(world);
  assert.equal(snapshot(world).player.capacity, 20);
  assert.equal(world.player.carried, 20);
  assert.equal(world.motes.length, 1);
});

test('two drainers deduct eleven per second including decay and report only every 60 active ticks', () => {
  const world = setup({ lanterns: [burning(27)], shades: [drainer('S1', 0), drainer('S2', 1)] });
  assert.equal(step(world, 59).filter((e) => e.name === 'fuel_drain').length, 0);
  assert.deepEqual(step(world).map(({ data }) => data), [
    { lantern_id: 'L1', shade_id: 'S1', fuel: 16 },
    { lantern_id: 'L1', shade_id: 'S2', fuel: 16 },
  ]);
  step(world, 88);
  assert.deepEqual(lantern(world), {
    id: 'L1', pos: [0, 0, 25], lit: false, deposited: 0, fuel: 0, ever_lit: true, relit_count: 0,
  });
  assert.ok(world.shades.every((s) => s.state === 'wander'));
});

test('wander prefers the nearest weak lantern, breaking ties by id, and stays still while draining', () => {
  const world = setup({
    lanterns: [
      { ...burning(20), pos: [1, 0, 25] },
      { id: 'L2', lit: true, fuel: 20, pos: [-1, 0, 25] },
      { id: 'L3', pos: [0, 0, 25] },
    ],
    shades: [{ pos: [0, 0, 25], state: 'wander' }],
  });
  step(world);
  assert.equal(world.shades[0].state, 'drain');
  assert.equal(world.shades[0].target_lantern_id, 'L1');
  step(world, 60);
  assert.equal(lantern(world).fuel, 14);
  assert.equal(lantern(world, 1).fuel, 19);
  assert.deepEqual(snapshot(world).shades[0].pos, [0, 1, 25]);
});

test('exactly thirty is safe and refueling an active drain expels and neutralizes the shade', () => {
  const world = setup({ lanterns: [burning(30)] });
  assert.equal(lanternHasSafeZone(world, world.lanterns[0]), true);
  step(world);
  assert.equal(lanternHasSafeZone(world, world.lanterns[0]), false);
  const refill = setup({
    player: { pos: [0, 0, 24], carried: 1 },
    lanterns: [burning(29)], shades: [drainer('S1', 0)],
  });
  step(refill, 1, { interact: true });
  assert.equal(refill.shades[0].state, 'wander');
  assert.ok(Math.hypot(refill.shades[0].x, refill.shades[0].z - 25) >= 6);
  assert.equal(refill.player.flames, 3);
  assert.ok(refill.shades[0].safe_push_until > refill.sim_tick);
});

test('drain is interrupted by proximity or pulse and only a draining target awards fifteen', () => {
  const scenario = {
    player: { pos: [0, 0, 21], carried: 3 },
    lanterns: [burning(25)], shades: [drainer('S1', 0), { pos: [0, 0, 20], state: 'stunned', state_ticks_left: 10 }],
  };
  const close = setup(scenario);
  step(close);
  assert.equal(close.shades[0].state, 'chase');
  const pulsed = setup(scenario);
  step(pulsed, 1, { pulse: true });
  assert.equal(pulsed.score, 20);
  assert.ok(pulsed.shades.every((s) => s.state === 'stunned'));
  step(pulsed, 120);
  assert.equal(pulsed.shades[0].state, 'wander');
});

test('dawn needs three, four, and five lit lanterns respectively', () => {
  for (const [night, goal] of [[1, 3], [2, 4], [3, 5]]) {
    const lanterns = Array.from({ length: goal }, (_, i) => ({ id: `L${i + 1}`, lit: true }));
    const winning = setup({ lanterns, time_left_s: 1 / 60 }, night);
    step(winning);
    assert.equal(winning.end_reason, 'dawn_survived');
    assert.equal(winning.score, goal * (50 + 99) + 150);
    lanterns[goal - 1].fuel = 1 / 60;
    const losing = setup({ lanterns, time_left_s: 1 / 60 }, night);
    assert.deepEqual(step(losing).map((e) => e.name), ['lantern_out', 'game_over']);
    assert.equal(losing.end_reason, 'dawn');
    assert.equal(losing.score, 0);
  }
});

test('final tick allows lighting before dawn, but fatal contact still takes priority', () => {
  const scenario = {
    player: { pos: [0, 0, 24], carried: 1, flames: 1 },
    lanterns: [{ id: 'L1', deposited: 9 }, { id: 'L2', lit: true }, { id: 'L3', lit: true }],
    time_left_s: 1 / 60,
  };
  const win = setup(scenario);
  assert.deepEqual(step(win, 1, { interact: true }).map((e) => e.name), ['deposit', 'lantern_lit', 'game_over']);
  assert.equal(win.end_reason, 'dawn_survived');
  const loss = setup({ ...scenario, shades: [{ pos: [0, 0, 24] }] });
  step(loss);
  assert.equal(loss.end_reason, 'no_flames');
});

test('malformed v1.2 scenario fields raise a contract error', () => {
  for (const scenario of [
    { player: { successful_lights: 1.5 } },
    { lanterns: [{ id: 'L1', fuel: 101 }] },
    { lanterns: [{ id: 'L1', ever_lit: 'true' }] },
    { shades: [{ pos: [0, 0, 0], target_lantern_id: 1 }] },
  ]) assert.throws(() => parseScenario(scenario), ContractError);
});
