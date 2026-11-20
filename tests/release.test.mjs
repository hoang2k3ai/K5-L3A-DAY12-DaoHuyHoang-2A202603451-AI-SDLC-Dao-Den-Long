import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { benchmarkCamera, benchmarkWorld, frameMetrics } from '../src/bench-scene.js';
import { lanternFuel, stepBenchmark } from '../src/sim/world.js';
import { bindingConflict, DEFAULT_BINDINGS } from '../src/input.js';
import { makeEntry, rankEntries, validName } from '../src/leaderboard.js';
import { guidanceTargets } from '../src/spell-targets.js';

test('benchmark retains its seeded crowd, fuel and fixed player without gameplay side effects', () => {
  const world = benchmarkWorld(42);
  const same = benchmarkWorld(42);
  assert.deepEqual(world.shades, same.shades);
  assert.equal(world.night, 1);
  assert.equal(world.shades.length, 200);
  assert.equal(world.motes.length, 100);
  const initial = world.shades[0].x;
  for (let i = 0; i < 120; i++) stepBenchmark(world);
  assert.ok(world.shades[0].x !== initial);
  assert.equal(world.shades.length, 200);
  assert.ok(world.shades.every((shade) => shade.state === 'wander'));
  assert.equal(world.motes.length, 100);
  assert.deepEqual(world.lanterns.map(lanternFuel), [100, 100, 100, 0, 0]);
  assert.deepEqual([world.player.x, world.player.y, world.player.z, world.player.carried], [0, 0, 0, 0]);
  assert.equal(world.score, 0);
  assert.equal(world.state, 'playing');
  assert.deepEqual(benchmarkCamera(0), [30, 15, 0]);
  assert.ok(Math.abs(benchmarkCamera(15)[0] - 30) < 1e-9);
  assert.ok(benchmarkCamera(3.75)[2] > 29.99);
});

test('benchmark metrics use sample count, total time, and the slowest one percent', () => {
  const sample = [...Array(99).fill(10), 50, 100];
  assert.deepEqual(frameMetrics(sample), {
    frames: 101, avg_fps: 88.596, p1_low_fps: 13.333, frame_ms_p95: 10,
  });
});

test('leaderboard validates names and retains top ten with earlier achievement first', () => {
  assert.equal(validName('May_07'), true);
  assert.equal(validName('  abc'), false);
  assert.equal(validName('ắbc'), false);
  assert.throws(() => makeEntry({ name: 'abc', score: -1, nights_won: 0, seed: 1 }));
  const entries = Array.from({ length: 12 }, (_, i) => makeEntry(
    { name: `May_${i}`, score: Math.floor(i / 2), nights_won: 2, seed: i },
    new Date(Date.UTC(2026, 0, 1, 0, i)),
  ));
  const ranked = rankEntries(entries);
  assert.equal(ranked.length, 10);
  assert.deepEqual(ranked.slice(0, 2).map((e) => e.name), ['May_10', 'May_11']);
  assert.match(ranked[0].achieved_at, /Z$/);
});

test('local server and export command read the same persisted leaderboard', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'lantern-leaderboard-test-'));
  const leaderboardFile = join(dir, 'leaderboard.json');
  process.env.LANTERN_LEADERBOARD = leaderboardFile;
  const { startServer } = await import('../tools/server.mjs');
  writeFileSync(join(dir, 'index.html'), 'test');
  const { server, url } = await startServer({ root: dir, scores: true });
  try {
    const api = `${url}/api/leaderboard`;
    const entry = { name: 'May_07', score: 350, nights_won: 2, seed: 42 };
    const response = await fetch(api, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry),
    });
    assert.equal(response.status, 201);
    const stored = await (await fetch(api)).json();
    assert.equal(stored.entries[0].seed, 42);
    const exported = join(dir, 'export.json');
    const result = spawnSync(process.execPath, ['tools/run.mjs', '--export-leaderboard', exported], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(readFileSync(exported)), stored);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  }
});

test('remapping rejects another action’s keys, including default aliases', () => {
  assert.equal(Object.keys(DEFAULT_BINDINGS).length, 13);
  assert.equal(bindingConflict(DEFAULT_BINDINGS, 'guide', 'KeyF'), 'motes');
  assert.equal(bindingConflict(DEFAULT_BINDINGS, 'pause', 'ArrowUp'), 'up');
  assert.equal(bindingConflict(DEFAULT_BINDINGS, 'jump', 'Space'), undefined);
  assert.equal(bindingConflict(DEFAULT_BINDINGS, 'jump', 'KeyJ'), undefined);
});

test('guidance reads nearest motes and unlit lanterns without changing the scene', () => {
  const point = (id, x, lit = false) => ({ id, x, y: 0, z: 0, lit });
  const world = {
    player: point('Mây', 0),
    motes: [point('A', 9), point('B', 1), point('C', 3), point('D', 2)],
    lanterns: [point('L1', 2, true), point('L2', 6), point('L3', 3)],
  };
  const before = structuredClone(world);
  assert.deepEqual(guidanceTargets(world, 'motes').map(({ target }) => target.id), ['B', 'D', 'C']);
  assert.equal(guidanceTargets(world, 'guide')[0].target.id, 'L3');
  assert.deepEqual(world, before);
});
