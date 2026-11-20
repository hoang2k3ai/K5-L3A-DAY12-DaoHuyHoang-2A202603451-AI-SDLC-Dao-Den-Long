#!/usr/bin/env node
// Runs the Phase 1 proof suite: every case is executed through the real
// headless CLI, asserted, and stored under docs/proof/phase-1/ so the grader
// can reproduce it at the phase-1 tag.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TUNING } from '../src/sim/config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const cli = path.join(root, 'tools', 'headless.mjs');
const proofDir = path.join(root, 'docs', 'proof', 'phase-1');
const casesDir = path.join(proofDir, 'cases');
fs.mkdirSync(casesDir, { recursive: true });

const lanterns = [
  [0, -20],
  [19.021, -6.18],
  [11.756, 16.18],
  [-11.756, 16.18],
  [-19.021, -6.18],
];

/** Builds a win-by-walking run: walk to each lantern, pick up 3 motes, deposit. */
function winWalkthrough() {
  const frames = [];
  const stops = [];
  let x = 0;
  let z = 0;
  let tick = 0;
  for (const [lx, lz] of lanterns) {
    const dx = lx - x;
    const dz = lz - z;
    const dist = Math.hypot(dx, dz);
    const dirX = dx / dist;
    const dirZ = dz / dist;
    frames.push({ tick, move: [round4(dirX), round4(dirZ)] });
    const walkTicks = Math.ceil(((dist - 2) / TUNING.player_speed) * 60);
    tick += walkTicks;
    x = lx - dirX * 2;
    z = lz - dirZ * 2;
    stops.push([round4(x), round4(z)]);
    frames.push({ tick, move: [0, 0], interact: true });
    tick += 1;
    frames.push({ tick, interact: false });
    tick += 1;
  }

  // Three motes waiting at every stop: the run really collects 15 motes.
  const motes = [];
  for (const [sx, sz] of stops) {
    motes.push([sx, 0, sz], [round4(sx + 0.25), 0, sz], [sx, 0, round4(sz + 0.25)]);
  }

  return {
    scenario: {
      player: { pos: [0, 0, 0], carried: 0, flames: TUNING.flames },
      random_motes: false,
      random_shades: false,
      motes,
    },
    inputs: { frames },
    stops,
  };
}

const round4 = (v) => Math.round(v * 10000) / 10000;

const walk = winWalkthrough();

const CASES = [
  {
    name: '01-pickup',
    about: 'Nhặt đom đóm khi đi qua (pickup_radius, per_mote)',
    scenario: {
      random_motes: false,
      random_shades: false,
      motes: [[6, 0, 0]],
    },
    inputs: { frames: [{ tick: 0, move: [1, 0] }] },
    ticks: 90,
    check(lines) {
      const picked = lines.filter((l) => l.type === 'event' && l.name === 'mote_picked');
      const last = lines[lines.length - 1];
      assert(picked.length === 1, `expected 1 mote_picked, got ${picked.length}`);
      assert(picked[0].tick <= 60, `pickup too late: tick ${picked[0].tick}`);
      assert(last.score === TUNING.score.per_mote, `score ${last.score}`);
      return `mote_picked tick=${picked[0].tick}, score=${last.score}`;
    },
  },
  {
    name: '02-deposit-and-light',
    about: 'Nạp đủ lantern_cost thì đèn sáng (interact_radius, deposit, lantern_lit)',
    scenario: {
      player: { pos: [0, 0, -18], carried: 3 },
      random_motes: false,
      random_shades: false,
      motes: [],
    },
    inputs: { frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }] },
    ticks: 10,
    check(lines) {
      const deposit = lines.find((l) => l.type === 'event' && l.name === 'deposit');
      const lit = lines.find((l) => l.type === 'event' && l.name === 'lantern_lit');
      assert(deposit && deposit.data.amount === 3, 'deposit amount must be 3');
      assert(lit && lit.data.lantern_id === 'L1', 'L1 must light up');
      const snap = lines.filter((l) => l.type === 'snapshot').pop();
      const l1 = snap.lanterns.find((l) => l.id === 'L1');
      assert(l1.lit === true && l1.deposited === 3, 'L1 state after deposit');
      assert(snap.player.carried === 0, 'carried must be empty');
      return `deposit=3, L1 lit, score=${snap.score}`;
    },
  },
  {
    name: '03-pulse-stun',
    about: 'Tỏa sáng đẩy lùi và làm choáng Bóng Mực trong pulse_radius',
    scenario: {
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [{ pos: [4, 0, 0] }],
    },
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] },
    ticks: 10,
    check(lines) {
      const pulse = lines.find((l) => l.type === 'event' && l.name === 'pulse');
      assert(pulse && pulse.data.stunned_ids.includes('S1'), 'S1 must be stunned');
      const snap = lines.filter((l) => l.type === 'snapshot').pop();
      const shade = snap.shades.find((s) => s.id === 'S1');
      assert(shade.state === 'stunned', 'shade state must be stunned');
      const distance = Math.hypot(shade.pos[0], shade.pos[2]);
      assert(Math.abs(distance - (4 + TUNING.pulse_push_m)) < 0.2, `push distance ${distance}`);
      assert(snap.player.flames === TUNING.flames - TUNING.pulse_cost, 'pulse must cost a flame');
      return `stunned S1, pushed to ${distance.toFixed(2)}m, flames=${snap.player.flames}`;
    },
  },
  {
    name: '04-hit-and-invuln',
    about: 'Bị chạm mất 1 lửa, rơi hit_drop_ratio đom đóm, invuln_s chặn đòn thứ hai',
    scenario: {
      player: { carried: 4 },
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [{ pos: [0.5, 0, 0] }],
    },
    ticks: 60,
    check(lines) {
      const hits = lines.filter((l) => l.type === 'event' && l.name === 'player_hit');
      assert(hits.length === 1, `expected exactly 1 hit in 1s, got ${hits.length}`);
      assert(hits[0].data.dropped === 2, `dropped ${hits[0].data.dropped}`);
      const snap = lines.filter((l) => l.type === 'snapshot').pop();
      assert(snap.player.carried === 2, 'carried must drop from 4 to 2');
      assert(snap.player.flames === TUNING.flames - 1, 'one flame lost');
      return `1 hit, dropped=2, flames=${snap.player.flames}, carried=${snap.player.carried}`;
    },
  },
  {
    name: '05-safe-radius',
    about: 'Bóng Mực không vào được safe_radius quanh đèn đã sáng (dù người chơi đứng trong vùng an toàn)',
    scenario: {
      player: { pos: [0, 0, 10.5] },
      random_motes: false,
      random_shades: false,
      motes: [],
      lanterns: [{ id: 'L1', pos: [0, 0, 10], lit: true }],
      shades: [{ pos: [0, 0, 7] }],
    },
    ticks: 120,
    check(lines) {
      const snaps = lines.filter((l) => l.type === 'snapshot');
      let closest = Infinity;
      for (const snap of snaps) {
        for (const shade of snap.shades) {
          closest = Math.min(closest, Math.hypot(shade.pos[0] - 0, shade.pos[2] - 10));
        }
      }
      assert(closest >= TUNING.safe_radius - 0.001, `shade entered safe radius: ${closest}`);
      assert(closest <= TUNING.safe_radius + 0.5, `shade did not press against the boundary: ${closest}`);
      const last = snaps[snaps.length - 1];
      assert(last.player.flames === TUNING.flames, 'player must stay safe inside the lantern zone');
      return `shade pressed at ${closest.toFixed(2)}m from lit lantern, player unharmed`;
    },
  },
  {
    name: '06-fall',
    about: 'Rơi khỏi đảo bị phạt 1 lửa và hồi sinh ở tâm (fall_enabled)',
    scenario: {
      player: { pos: [40, 0, 0] },
      random_motes: false,
      random_shades: false,
      motes: [],
    },
    ticks: 10,
    check(lines) {
      const hit = lines.find((l) => l.type === 'event' && l.name === 'player_hit');
      assert(hit && hit.data.by === 'fall', 'expected a fall hit');
      const snap = lines.filter((l) => l.type === 'snapshot').pop();
      assert(snap.player.pos[0] === 0 && snap.player.pos[2] === 0, 'respawn at origin');
      assert(snap.player.flames === TUNING.flames - 1, 'fall costs a flame');
      return `fall hit, flames=${snap.player.flames}, respawn=(0,0,0)`;
    },
  },
  {
    name: '07-dawn',
    about: 'Hết night1_duration_s mà chưa thắng thì thua (reason dawn)',
    scenario: {
      random_motes: false,
      random_shades: false,
      motes: [],
      time_left_s: 0.5,
    },
    ticks: 60,
    check(lines) {
      const over = lines.find((l) => l.type === 'event' && l.name === 'game_over');
      assert(over && over.data.result === 'lost' && over.data.reason === 'dawn', 'expected lost/dawn');
      const end = lines[lines.length - 1];
      assert(end.state === 'lost', `end state ${end.state}`);
      return `lost/dawn at tick ${over.tick}, end.ticks=${end.ticks}`;
    },
  },
  {
    name: '08-win-walkthrough',
    about: 'Đi bộ nhặt đủ 15 đom đóm, nạp 5 đèn, thắng (all_lit) và cộng điểm cuối đêm',
    scenario: walk.scenario,
    inputs: walk.inputs,
    ticks: 4800,
    check(lines) {
      const over = lines.find((l) => l.type === 'event' && l.name === 'game_over');
      assert(over && over.data.result === 'won', 'walkthrough must win');
      const end = lines[lines.length - 1];
      const lit = lines
        .filter((l) => l.type === 'event' && l.name === 'lantern_lit')
        .map((l) => l.data.lantern_id);
      const picked = lines.filter((l) => l.type === 'event' && l.name === 'mote_picked');
      const deposits = lines.filter((l) => l.type === 'event' && l.name === 'deposit');
      assert(lit.length === 5, `expected 5 lit lanterns, got ${lit.length}`);
      assert(picked.length === 15, `expected 15 motes collected, got ${picked.length}`);
      assert(deposits.length === 5 && deposits.every((d) => d.data.amount === 3), 'each lantern must receive 3 motes');
      assert(end.state === 'won', `end state ${end.state}`);
      assert(end.ticks <= 4800, 'must finish inside night 1');
      return `won at tick ${over.tick} (${(over.tick / 60).toFixed(1)}s), score=${end.score}, collected=${picked.length}, lit=${lit.join(',')}`;
    },
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runCase(testCase) {
  const caseDir = path.join(casesDir, testCase.name);
  fs.mkdirSync(caseDir, { recursive: true });
  const scenarioPath = path.join(caseDir, 'scenario.json');
  const inputsPath = path.join(caseDir, 'inputs.json');
  const outPath = path.join(caseDir, 'output.jsonl');
  if (testCase.scenario) fs.writeFileSync(scenarioPath, `${JSON.stringify(testCase.scenario, null, 2)}\n`);
  if (testCase.inputs) fs.writeFileSync(inputsPath, `${JSON.stringify(testCase.inputs, null, 2)}\n`);

  const args = ['--seed', String(testCase.seed ?? 7), '--night', '1', '--ticks', String(testCase.ticks), '--out', outPath];
  if (testCase.scenario) args.push('--scenario', scenarioPath);
  if (testCase.inputs) args.push('--inputs', inputsPath);
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert(result.status === 0, `headless exit ${result.status}: ${result.stderr}`);

  const lines = fs
    .readFileSync(outPath, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  const detail = testCase.check(lines);
  return { name: testCase.name, about: testCase.about, detail, args, lines };
}

const results = [];
let failed = false;
for (const testCase of CASES) {
  try {
    const result = runCase(testCase);
    results.push({ ...result, ok: true });
    console.log(`PASS  ${result.name}  ${result.detail}`);
  } catch (err) {
    failed = true;
    results.push({ name: testCase.name, about: testCase.about, ok: false, detail: err.message });
    console.error(`FAIL  ${testCase.name}  ${err.message}`);
  }
}

// Determinism: two identical CLI runs must produce byte-identical files.
try {
  const dir = path.join(casesDir, '09-determinism');
  fs.mkdirSync(dir, { recursive: true });
  const scenario = path.join(dir, 'scenario.json');
  const inputs = path.join(dir, 'inputs.json');
  fs.writeFileSync(
    scenario,
    `${JSON.stringify(
      {
        random_motes: true,
        random_shades: true,
        motes: [[2, 0, 3]],
        shades: [{ pos: [12, 0, -4] }],
        time_left_s: 120,
      },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(
    inputs,
    `${JSON.stringify(
      {
        frames: [
          { tick: 0, move: [1, 0], cam_yaw_deg: 30 },
          { tick: 40, move: [0, 1] },
          { tick: 80, pulse: true },
          { tick: 90, pulse: false, interact: true },
        ],
      },
      null,
      2,
    )}\n`,
  );
  const hashes = [];
  for (const run of ['a', 'b']) {
    const out = path.join(dir, `run-${run}.jsonl`);
    const result = spawnSync(
      process.execPath,
      [cli, '--seed', '99', '--night', '1', '--ticks', '400', '--scenario', scenario, '--inputs', inputs, '--out', out],
      { encoding: 'utf8' },
    );
    assert(result.status === 0, `determinism run ${run} failed: ${result.stderr}`);
    hashes.push(crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex'));
  }
  assert(hashes[0] === hashes[1], 'two runs with the same seed differ');
  results.push({
    name: '09-determinism',
    about: 'Cùng seed + scenario + inputs cho output giống hệt (sha256)',
    ok: true,
    detail: `sha256=${hashes[0].slice(0, 16)}…`,
  });
  console.log(`PASS  09-determinism  sha256=${hashes[0].slice(0, 16)}…`);
} catch (err) {
  failed = true;
  results.push({ name: '09-determinism', about: 'Tính tất định', ok: false, detail: err.message });
  console.error(`FAIL  09-determinism  ${err.message}`);
}

// Write a human-readable summary next to the raw outputs.
const rows = results
  .map((r) => `| ${r.ok ? 'PASS' : 'FAIL'} | ${r.name} | ${r.about} | ${r.detail} |`)
  .join('\n');
const summary = `# Bằng chứng Phase 1 — Test Contract v1.0

Sinh tự động bằng \`npm run verify\` (chạy \`tools/headless.mjs\` thật, không sửa tay output).
Mỗi case có \`scenario.json\`, \`inputs.json\` và \`output.jsonl\` trong \`cases/<tên>/\`.

| Kết quả | Case | Yêu cầu được chứng minh | Kết quả đo được |
|---|---|---|---|
${rows}

## Cách chạy lại

\`\`\`bash
npm install
npm test        # 33 unit + CLI test
npm run verify  # chạy lại toàn bộ bằng chứng này
\`\`\`

Máy chạy: Windows 11, Node ${process.version}. Contract không phụ thuộc GPU ở chế độ headless.
`;
fs.writeFileSync(path.join(proofDir, 'README.md'), summary);

console.log(`\nProof written to docs/proof/phase-1/ (${results.filter((r) => r.ok).length}/${results.length} passed)`);
if (failed) process.exitCode = 1;
