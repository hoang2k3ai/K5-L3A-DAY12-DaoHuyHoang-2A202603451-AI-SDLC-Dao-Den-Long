#!/usr/bin/env node
// Headless runner for Test Contract v1.1 (Phase 2).
//
//   node tools/headless.mjs --seed 7 --night 1 --ticks 600 \
//     --out out.jsonl [--scenario s.json] [--inputs i.json] [--snapshot-every 10]
//
// Exit codes: 0 = ok, 2 = bad arguments / malformed input files, 1 = runtime error.
import fs from 'node:fs';
import path from 'node:path';
import { TUNING } from '../src/sim/config.js';
import {
  createWorld,
  stepWorld,
  snapshot,
  endLine,
  setFrames,
  drainEvents,
  startNight,
} from '../src/sim/world.js';
import { parseScenario, parseInputs, ContractError } from '../src/sim/contract.js';

const USAGE = `Usage: node tools/headless.mjs --seed <int> --night <1|2|3> --ticks <int> --out <file.jsonl>
       [--scenario <file.json>] [--inputs <file.json>] [--snapshot-every <int>]`;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    if (!token.startsWith('--')) throw new ContractError(`tham số không hợp lệ: ${token}`);
    let key;
    let value;
    const eq = token.indexOf('=');
    if (eq !== -1) {
      key = token.slice(2, eq);
      value = token.slice(eq + 1);
    } else {
      key = token.slice(2);
      value = argv[++i];
    }
    if (value === undefined) throw new ContractError(`thiếu giá trị cho --${key}`);
    args[key] = value;
  }
  return args;
}

function parseIntArg(args, key, { required = false, fallback = undefined } = {}) {
  const raw = args[key];
  if (raw === undefined) {
    if (required) throw new ContractError(`thiếu tham số --${key}`);
    return fallback;
  }
  if (!/^-?\d+$/.test(raw)) throw new ContractError(`--${key} phải là số nguyên`);
  return Number(raw);
}

function readJsonFile(file, label) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    throw new ContractError(`${label}: không đọc được file "${file}" (${err.message})`);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new ContractError(`${label}: JSON không hợp lệ trong "${file}" (${err.message})`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }

  const seed = parseIntArg(args, 'seed', { fallback: 0 });
  const night = parseIntArg(args, 'night', { fallback: 1 });
  const ticks = parseIntArg(args, 'ticks', { required: true });
  const snapshotEvery = parseIntArg(args, 'snapshot-every', { fallback: 10 });
  const out = args.out;
  if (!out) throw new ContractError('thiếu tham số --out');
  if (![1, 2, 3].includes(night)) throw new ContractError('--night chỉ nhận giá trị 1, 2 hoặc 3');
  if (ticks < 0) throw new ContractError('--ticks phải >= 0');
  if (snapshotEvery < 1) throw new ContractError('--snapshot-every phải >= 1');

  const scenario = args.scenario ? parseScenario(readJsonFile(args.scenario, 'scenario')) : null;
  const frames = args.inputs ? parseInputs(readJsonFile(args.inputs, 'inputs')) : [];

  const world = createWorld({ seed, night, scenario, tuning: TUNING });
  setFrames(world, frames);

  const lines = [JSON.stringify(snapshot(world))];
  startNight(world);
  for (const event of drainEvents(world)) lines.push(JSON.stringify(event));

  let steps = 0;
  while ((world.state === 'playing' || world.state === 'paused') && steps < ticks) {
    stepWorld(world);
    steps += 1;
    for (const event of drainEvents(world)) lines.push(JSON.stringify(event));
    if (world.tick % snapshotEvery === 0) lines.push(JSON.stringify(snapshot(world)));
  }
  lines.push(JSON.stringify(endLine(world)));

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, `${lines.join('\n')}\n`, 'utf8');
  return 0;
}

try {
  process.exitCode = main();
} catch (err) {
  if (err instanceof ContractError) {
    process.stderr.write(`error: ${err.message}\n${USAGE}\n`);
    process.exitCode = 2;
  } else {
    process.stderr.write(`error: ${err && err.stack ? err.stack : err}\n`);
    process.exitCode = 1;
  }
}
