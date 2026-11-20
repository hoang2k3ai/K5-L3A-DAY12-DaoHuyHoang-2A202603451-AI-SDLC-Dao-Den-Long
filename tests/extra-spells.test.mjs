import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, drainEvents, stepWorld } from '../src/sim/world.js';
import { BROOM, LIGHTNING, lightningHits } from '../src/sim/extra-spells.js';

const at = (degrees, distance) => {
  const angle = degrees * Math.PI / 180;
  return { x: Math.sin(angle) * distance, z: Math.cos(angle) * distance, baseY: 0 };
};

test('Thiểm Lôi uses the inclusive 60° horizontal cone and 8 m range', () => {
  const player = { x: 0, y: 0, z: 0, facing: 0 };
  for (const angle of [-30, 0, 30]) assert.equal(lightningHits(player, at(angle, 8)), true);
  for (const angle of [-30.1, 30.1, 180]) assert.equal(lightningHits(player, at(angle, 6)), false);
  assert.equal(lightningHits(player, at(0, 8.01)), false);
  assert.equal(lightningHits(player, { ...at(0, 5), baseY: 3 }), false);
  assert.equal(lightningHits({ ...player, facing: Math.PI / 2 }, at(90, 8)), true);
});

test('Thiểm Lôi costs motes, stuns only cone targets and enforces cooldown', () => {
  const world = createWorld({ scenario: {
    random_motes: false, random_shades: false, player: { carried: 5 },
    shades: [{ id: 'inside', pos: [0, 0, 8] }, { id: 'outside', pos: [6, 0, 3] }],
  } });
  stepWorld(world, { lightning: true });
  assert.deepEqual(drainEvents(world).find((event) => event.name === 'lightning').data.stunned_ids, ['inside']);
  assert.equal(world.player.carried, 5 - LIGHTNING.cost);
  assert.equal(world.shades[0].state_until, 1 + LIGHTNING.stun);
  stepWorld(world, { lightning: true });
  assert.equal(world.player.carried, 5 - LIGHTNING.cost);
});

test('Chổi Bay launches from ground, can steer at altitude and lands after flight', () => {
  const world = createWorld({ scenario: { random_motes: false, random_shades: false } });
  stepWorld(world, { broom: true });
  assert.equal(world.player.broom_mounted, true);
  assert.equal(world.player.grounded, false);
  for (let i = 0; i < 50; i++) stepWorld(world, { move: [0, 1] });
  assert.equal(world.player.y, BROOM.height);
  assert.ok(world.player.z > 4);
  for (let i = 0; i < 180; i++) stepWorld(world, { broom: true, move: [0, 0] });
  assert.equal(world.player.y, 0);
  assert.equal(world.player.grounded, true);
  assert.equal(world.player.broom_mounted, false);
});
