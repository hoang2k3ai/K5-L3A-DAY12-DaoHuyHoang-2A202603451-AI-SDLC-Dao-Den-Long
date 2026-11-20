import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, '..', 'tools', 'headless.mjs');

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dao-den-long-'));
}

function runCli(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
}

function readJsonl(file) {
  return fs
    .readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
}

test('valid headless run writes snapshots, events and a final end line', () => {
  const dir = tmpdir();
  const scenario = path.join(dir, 'scenario.json');
  const out = path.join(dir, 'out.jsonl');
  fs.writeFileSync(
    scenario,
    JSON.stringify({
      player: { pos: [0, 0, 0], carried: 0, flames: 3 },
      random_motes: false,
      random_shades: false,
      motes: [[1, 0, 0]],
      time_left_s: 10,
    }),
  );
  const result = runCli(['--seed', '3', '--night', '1', '--ticks', '60', '--scenario', scenario, '--out', out]);
  assert.equal(result.status, 0, result.stderr);

  const lines = readJsonl(out);
  assert.equal(lines[0].type, 'snapshot');
  assert.equal(lines[0].tick, 0);
  assert.equal(lines[0].player.flames, 3);
  assert.ok(lines.some((l) => l.type === 'event' && l.name === 'mote_picked'));
  const end = lines[lines.length - 1];
  assert.equal(end.type, 'end');
  assert.equal(end.ticks, 60);
});

test('--ticks 0 emits the tick 0 snapshot, night_start and the end line', () => {
  const dir = tmpdir();
  const out = path.join(dir, 'zero.jsonl');
  const result = runCli(['--seed', '1', '--ticks', '0', '--out', out]);
  assert.equal(result.status, 0, result.stderr);
  const lines = readJsonl(out);
  assert.equal(lines.length, 3);
  assert.equal(lines[0].tick, 0);
  assert.equal(lines[1].name, 'night_start');
  assert.deepEqual(lines[1].data, { night: 1 });
  assert.deepEqual(lines[2], { type: 'end', ticks: 0, state: 'playing', score: 0 });
});

test('night_start is the first event and reports the chosen night', () => {
  const dir = tmpdir();
  for (const night of [1, 2, 3]) {
    const out = path.join(dir, `night${night}.jsonl`);
    const result = runCli(['--seed', '5', '--night', String(night), '--ticks', '1', '--out', out]);
    assert.equal(result.status, 0, result.stderr);
    const lines = readJsonl(out);
    const first = lines.find((l) => l.type === 'event');
    assert.equal(first.name, 'night_start');
    assert.deepEqual(first.data, { night });
    assert.equal(lines[0].night, night);
  }
});

test('each night uses its own standard duration', () => {
  const dir = tmpdir();
  const expected = { 1: 240, 2: 270, 3: 300 };
  for (const night of [1, 2, 3]) {
    const out = path.join(dir, `d${night}.jsonl`);
    assert.equal(runCli(['--night', String(night), '--ticks', '0', '--out', out]).status, 0);
    const snap = readJsonl(out)[0];
    assert.equal(snap.time_left_s, expected[night]);
  }
});

test('same seed and inputs give byte-identical output', () => {
  const dir = tmpdir();
  const a = path.join(dir, 'a.jsonl');
  const b = path.join(dir, 'b.jsonl');
  const args = ['--seed', '42', '--night', '3', '--ticks', '300', '--snapshot-every', '5'];
  assert.equal(runCli([...args, '--out', a]).status, 0);
  assert.equal(runCli([...args, '--out', b]).status, 0);
  assert.equal(fs.readFileSync(a, 'utf8'), fs.readFileSync(b, 'utf8'));
});

test('different seeds give different output', () => {
  const dir = tmpdir();
  const a = path.join(dir, 'seed1.jsonl');
  const b = path.join(dir, 'seed2.jsonl');
  assert.equal(runCli(['--seed', '1', '--night', '2', '--ticks', '120', '--out', a]).status, 0);
  assert.equal(runCli(['--seed', '2', '--night', '2', '--ticks', '120', '--out', b]).status, 0);
  assert.notEqual(fs.readFileSync(a, 'utf8'), fs.readFileSync(b, 'utf8'));
});

test('malformed scenario JSON exits with code 2', () => {
  const dir = tmpdir();
  const bad = path.join(dir, 'bad.json');
  fs.writeFileSync(bad, '{ not json');
  const result = runCli(['--ticks', '10', '--scenario', bad, '--out', path.join(dir, 'x.jsonl')]);
  assert.equal(result.status, 2);
});

test('scenario with wrong types exits with code 2', () => {
  const dir = tmpdir();
  const bad = path.join(dir, 'bad.json');
  fs.writeFileSync(bad, JSON.stringify({ player: { pos: 'here' } }));
  const result = runCli(['--ticks', '10', '--scenario', bad, '--out', path.join(dir, 'x.jsonl')]);
  assert.equal(result.status, 2);
});

test('malformed inputs file exits with code 2', () => {
  const dir = tmpdir();
  const bad = path.join(dir, 'inputs.json');
  fs.writeFileSync(bad, JSON.stringify({ frames: [{ tick: 5 }, { tick: 5 }] }));
  const result = runCli(['--ticks', '10', '--inputs', bad, '--out', path.join(dir, 'x.jsonl')]);
  assert.equal(result.status, 2);
});

test('bad arguments exit with code 2', () => {
  const dir = tmpdir();
  assert.equal(runCli(['--ticks', '10']).status, 2);
  assert.equal(runCli(['--ticks', '10', '--night', '4', '--out', path.join(dir, 'x.jsonl')]).status, 2);
  assert.equal(runCli(['--ticks', 'abc', '--out', path.join(dir, 'x.jsonl')]).status, 2);
});

test('unknown extra flags are ignored instead of crashing', () => {
  const dir = tmpdir();
  const out = path.join(dir, 'x.jsonl');
  const result = runCli(['--ticks', '5', '--out', out, '--future-flag', '1']);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(out));
});

test('lighting every lantern waits until dawn before the CLI reports a win', () => {
  const dir = tmpdir();
  const scenario = path.join(dir, 'win.json');
  const out = path.join(dir, 'win.jsonl');
  fs.writeFileSync(
    scenario,
    JSON.stringify({
      player: { pos: [0, 0, 24], carried: 1 },
      time_left_s: 0.05,
      random_motes: false,
      random_shades: false,
      motes: [],
      lanterns: [
        { id: 'L1', lit: true, pos: [0, 0, 15] },
        { id: 'L2', lit: true },
        { id: 'L3', lit: true },
        { id: 'L4', lit: true },
        { id: 'L5', pos: [0, 0, 25], deposited: 9 },
      ],
    }),
  );
  const inputs = path.join(dir, 'win.inputs.json');
  fs.writeFileSync(inputs, JSON.stringify({ frames: [{ tick: 0, interact: true }] }));
  const result = runCli(['--ticks', '100', '--scenario', scenario, '--inputs', inputs, '--out', out]);
  assert.equal(result.status, 0, result.stderr);
  const lines = readJsonl(out);
  const end = lines[lines.length - 1];
  assert.equal(end.state, 'won');
  assert.equal(end.ticks, 3);
  assert.ok(lines.some((l) => l.type === 'event' && l.name === 'lantern_lit' && l.tick === 1));
  assert.ok(lines.some((l) => l.type === 'event' && l.name === 'game_over' && l.data.reason === 'dawn_survived'));
});

test('a pause frame keeps the run alive but freezes the clock', () => {
  const dir = tmpdir();
  const inputs = path.join(dir, 'pause.json');
  const out = path.join(dir, 'pause.jsonl');
  fs.writeFileSync(
    inputs,
    JSON.stringify({
      frames: [
        { tick: 0, pause: true },
        { tick: 1, pause: false },
        { tick: 10, pause: true },
        { tick: 11, pause: false },
      ],
    }),
  );
  const result = runCli(['--seed', '1', '--night', '1', '--ticks', '20', '--scenario', path.join(dir, 'none.json'), '--out', out]);
  assert.equal(result.status, 2, 'missing scenario file must still exit 2');

  const scenario = path.join(dir, 'scenario.json');
  fs.writeFileSync(scenario, JSON.stringify({ random_motes: false, random_shades: false, motes: [], time_left_s: 100 }));
  const ok = runCli(['--seed', '1', '--night', '1', '--ticks', '20', '--scenario', scenario, '--inputs', inputs, '--out', out]);
  assert.equal(ok.status, 0, ok.stderr);
  const lines = readJsonl(out);
  assert.ok(lines.some((l) => l.name === 'paused'));
  assert.ok(lines.some((l) => l.name === 'resumed'));
  const pausedSnap = lines.find((l) => l.type === 'snapshot' && l.state === 'paused');
  assert.ok(pausedSnap);
  assert.equal(pausedSnap.time_left_s, 100);
  assert.equal(pausedSnap.sim_tick, 0);
});

test('a full night runs headless in well under 30 seconds', () => {
  const dir = tmpdir();
  const out = path.join(dir, 'full.jsonl');
  const started = Date.now();
  const result = runCli(['--seed', '9', '--night', '3', '--ticks', '18000', '--snapshot-every', '600', '--out', out]);
  const elapsed = Date.now() - started;
  assert.equal(result.status, 0, result.stderr);
  const lines = readJsonl(out);
  const end = lines[lines.length - 1];
  assert.equal(end.type, 'end');
  assert.ok(end.ticks > 0);
  assert.ok(['playing', 'won', 'lost'].includes(end.state));
  assert.ok(elapsed < 30000, `full night took ${elapsed} ms`);
});
