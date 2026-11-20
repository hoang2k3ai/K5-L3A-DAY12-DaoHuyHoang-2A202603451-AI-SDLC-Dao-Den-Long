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

test('--ticks 0 emits only the tick 0 snapshot and the end line', () => {
  const dir = tmpdir();
  const out = path.join(dir, 'zero.jsonl');
  const result = runCli(['--seed', '1', '--ticks', '0', '--out', out]);
  assert.equal(result.status, 0, result.stderr);
  const lines = readJsonl(out);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].tick, 0);
  assert.deepEqual(lines[1], { type: 'end', ticks: 0, state: 'playing', score: 0 });
});

test('same seed and inputs give byte-identical output', () => {
  const dir = tmpdir();
  const a = path.join(dir, 'a.jsonl');
  const b = path.join(dir, 'b.jsonl');
  const args = ['--seed', '42', '--ticks', '300', '--snapshot-every', '5'];
  assert.equal(runCli([...args, '--out', a]).status, 0);
  assert.equal(runCli([...args, '--out', b]).status, 0);
  assert.equal(fs.readFileSync(a, 'utf8'), fs.readFileSync(b, 'utf8'));
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
  assert.equal(runCli(['--ticks', '10', '--night', '2', '--out', path.join(dir, 'x.jsonl')]).status, 2);
  assert.equal(runCli(['--ticks', 'abc', '--out', path.join(dir, 'x.jsonl')]).status, 2);
});

test('unknown extra flags are ignored instead of crashing', () => {
  const dir = tmpdir();
  const out = path.join(dir, 'x.jsonl');
  const result = runCli(['--ticks', '5', '--out', out, '--future-flag', '1']);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(out));
});

test('an early win stops the run and reports the winning state', () => {
  const dir = tmpdir();
  const scenario = path.join(dir, 'win.json');
  const out = path.join(dir, 'win.jsonl');
  fs.writeFileSync(
    scenario,
    JSON.stringify({
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
    }),
  );
  const inputs = path.join(dir, 'win.inputs.json');
  fs.writeFileSync(inputs, JSON.stringify({ frames: [{ tick: 0, interact: true }] }));
  const result = runCli(['--ticks', '100', '--scenario', scenario, '--inputs', inputs, '--out', out]);
  assert.equal(result.status, 0, result.stderr);
  const lines = readJsonl(out);
  const end = lines[lines.length - 1];
  assert.equal(end.state, 'won');
  assert.equal(end.ticks, 1);
  assert.ok(lines.some((l) => l.type === 'event' && l.name === 'game_over' && l.data.reason === 'all_lit'));
});
