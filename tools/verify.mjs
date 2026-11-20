#!/usr/bin/env node
// Phase 3 proof suite (Test Contract v1.2).
//
// Every case is executed through the real headless CLI, asserted here, and
// stored under docs/proof/phase-3/ so the grader can reproduce it at the
// phase-3 tag. Outputs are never edited by hand.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TUNING } from '../src/sim/config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const cli = path.join(root, 'tools', 'headless.mjs');
const proofDir = path.join(root, 'docs', 'proof', 'phase-3');
const casesDir = path.join(proofDir, 'cases');
fs.mkdirSync(casesDir, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const quiet = { random_motes: false, random_shades: false, motes: [] };

const CASES = [
  {
    name: '01-movement-and-jump',
    about: 'Tốc độ chuẩn 6.0 m/s; nhảy 7.0 m/s với trọng lực 20 m/s²',
    scenario: quiet,
    inputs: {
      frames: [
        { tick: 0, move: [1, 0], jump: true },
        { tick: 1, jump: false },
      ],
    },
    ticks: 60,
    check(lines) {
      const snaps = lines.filter((l) => l.type === 'snapshot');
      const airborne = snaps.find((s) => s.player.pos[1] > 0.5);
      assert(airborne, 'player never left the ground');
      const last = snaps[snaps.length - 1];
      assert(Math.abs(last.player.pos[0] - TUNING.player_speed) < 1e-3, `x=${last.player.pos[0]}`);
      assert(last.player.pos[1] === 0 && last.player.grounded, 'player must land again');
      return `apex>0.5m, walked ${last.player.pos[0]}m in 1s, grounded=${last.player.grounded}`;
    },
  },
  {
    name: '02-dash',
    about: 'Lướt 14 m/s trong 0.2 s (2.8 m) và hồi chiêu 1.5 s',
    scenario: quiet,
    inputs: {
      frames: [
        { tick: 0, move: [1, 0], dash: true },
        { tick: 1, dash: false },
        { tick: 50, move: [1, 0], dash: true },
        { tick: 51, dash: false },
      ],
    },
    ticks: 60,
    snapshotEvery: 1,
    check(lines) {
      const dashes = lines.filter((l) => l.type === 'event' && l.name === 'dash');
      assert(dashes.length === 1, `expected 1 accepted dash, got ${dashes.length}`);
      const snaps = lines.filter((l) => l.type === 'snapshot');
      const at12 = snaps.find((s) => s.tick === 12);
      assert(at12, 'missing tick 12 snapshot');
      assert(Math.abs(at12.player.pos[0] - 2.8) < 1e-3, `dash distance ${at12.player.pos[0]}`);
      const at50 = snaps.find((s) => s.tick === 50);
      assert(at50.player.dash_cd_s > 0, 'dash must still be cooling down at tick 50');
      return `dash distance=${at12.player.pos[0]}m in 0.2s, cooldown blocks tick 50`;
    },
  },
  {
    name: '03-pickup-radius-and-height',
    about: 'Nhặt trong 1.0 m ngang và 1.5 m cao; ngoài ngưỡng thì không',
    scenario: {
      ...quiet,
      motes: [
        [1, 0, 0],
        [1.01, 0, 2],
        [0, 1.5, 0],
        [0, 1.6, 0],
      ],
    },
    ticks: 2,
    snapshotEvery: 1,
    check(lines) {
      const picked = lines.filter((l) => l.type === 'event' && l.name === 'mote_picked');
      const last = lines.filter((l) => l.type === 'snapshot').pop();
      assert(picked.length === 2, `expected 2 pickups, got ${picked.length}`);
      assert(last.player.carried === 2, `carried ${last.player.carried}`);
      assert(last.motes_active === 2, `motes left ${last.motes_active}`);
      return 'picked the 1.0 m and 1.5 m motes, rejected 1.01 m and 1.6 m';
    },
  },
  {
    name: '04-carry-capacity',
    about: 'Sức chứa chuẩn 10 đom đóm',
    scenario: { ...quiet, player: { carried: 10 }, motes: [[0.5, 0, 0]] },
    ticks: 3,
    check(lines) {
      const last = lines.filter((l) => l.type === 'snapshot').pop();
      assert(last.player.carried === 10, `carried ${last.player.carried}`);
      assert(last.motes_active === 1, 'mote must stay on the ground');
      return 'carried stays at 10/10, extra mote is not collected';
    },
  },
  {
    name: '05-deposit-and-tiebreak',
    about: 'Nạp 10 đom đóm, chọn đèn hợp lệ gần nhất, bằng nhau thì chọn id nhỏ hơn',
    scenario: {
      ...quiet,
      player: { pos: [0, 0, 0], carried: 10 },
      lanterns: [
        { id: 'L1', pos: [0, 0, 1.2] },
        { id: 'L2', pos: [0, 0, 1.2] },
        { id: 'L3', pos: [0, 0, 1.2] },
      ],
    },
    inputs: { frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }] },
    ticks: 2,
    snapshotEvery: 1,
    check(lines) {
      const deposit = lines.find((l) => l.type === 'event' && l.name === 'deposit');
      const lit = lines.find((l) => l.type === 'event' && l.name === 'lantern_lit');
      assert(deposit && deposit.data.lantern_id === 'L1', 'tie must resolve to L1');
      assert(deposit.data.amount === TUNING.lantern_cost, `amount ${deposit.data.amount}`);
      assert(lit && lit.data.lantern_id === 'L1' && lit.data.relight === false, 'L1 must light for the first time');
      const last = lines.filter((l) => l.type === 'snapshot').pop();
      assert(last.player.carried === 0 && last.player.capacity === 12, 'capacity must increase on light');
      assert(last.score === 10 * TUNING.score.per_mote + TUNING.score.per_lantern, `score ${last.score}`);
      return `deposit 10 into L1, lit, score=${last.score}`;
    },
  },
  {
    name: '06-pulse',
    about: 'Tỏa sáng tốn 3 đom, bán kính 5 m, choáng 120 tick, đẩy 4 m, +5 điểm',
    scenario: { ...quiet, player: { carried: 3 }, shades: [{ pos: [3, 0, 0] }] },
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] },
    ticks: 16,
    snapshotEvery: 1,
    check(lines) {
      const pulse = lines.find((l) => l.type === 'event' && l.name === 'pulse');
      assert(pulse && pulse.data.stunned_ids.includes('S1'), 'S1 must be stunned');
      const snaps = lines.filter((l) => l.type === 'snapshot');
      const first = snaps.find((s) => s.tick === 1);
      const shade = first.shades.find((s) => s.id === 'S1');
      assert(shade.state === 'stunned', `state ${shade.state}`);
      assert(shade.state_ticks_left === 120, `stun ticks ${shade.state_ticks_left}`);
      assert(first.player.carried === 0, 'pulse must cost 3 motes');
      const at15 = snaps.find((s) => s.tick === 15);
      const pushed = at15.shades.find((s) => s.id === 'S1');
      assert(Math.abs(pushed.pos[0] - 7) < 1e-3, `push distance ${pushed.pos[0]}`);
      return 'stun=120 ticks, push=4m, cost=3 motes, score=+5';
    },
  },
  {
    name: '07-safe-radius',
    about: 'Bóng Mực không vào được bán kính an toàn 6 m quanh đèn đã sáng',
    scenario: {
      ...quiet,
      player: { pos: [0, 0, 10.5] },
      lanterns: [{ id: 'L1', pos: [0, 0, 10], lit: true }],
      shades: [{ pos: [0, 0, 3.5] }],
    },
    ticks: 180,
    snapshotEvery: 1,
    check(lines) {
      const snaps = lines.filter((l) => l.type === 'snapshot' && l.tick > 0);
      let closest = Infinity;
      for (const snap of snaps) {
        for (const shade of snap.shades) {
          closest = Math.min(closest, Math.hypot(shade.pos[0], shade.pos[2] - 10));
        }
      }
      assert(closest >= TUNING.safe_radius - 1e-3, `shade entered ${closest}m`);
      assert(closest <= TUNING.safe_radius + 0.4, `shade never pressed the boundary: ${closest}`);
      const last = snaps[snaps.length - 1];
      assert(last.player.flames === TUNING.flames, 'player must be unharmed inside the zone');
      return `closest shade=${closest.toFixed(3)}m, player flames=${last.player.flames}`;
    },
  },
  {
    name: '08-hit-and-drop',
    about: 'Trúng đòn mất 1 lửa, rơi floor(carried/2) đom, đom rơi TTL 8 s, bất tử 90 tick',
    scenario: { ...quiet, player: { carried: 7 }, shades: [{ pos: [0.5, 0, 0] }] },
    ticks: 2,
    snapshotEvery: 1,
    check(lines) {
      const hit = lines.find((l) => l.type === 'event' && l.name === 'player_hit');
      assert(hit && hit.data.by === 'shade', 'expected a shade hit');
      assert(hit.data.dropped === 3, `dropped ${hit.data.dropped}`);
      assert(hit.data.flames === TUNING.flames - 1, 'one flame lost');
      const last = lines.filter((l) => l.type === 'snapshot').pop();
      const dropped = last.motes.filter((m) => m.kind === 'dropped');
      assert(dropped.length === 3, `dropped motes ${dropped.length}`);
      assert(dropped.every((m) => m.ttl_s !== null && m.ttl_s > 7.9 && m.ttl_s <= 8), 'dropped motes must have an 8 s TTL');
      assert(last.player.invuln > TUNING.invuln_s - 0.1 && last.player.invuln <= TUNING.invuln_s, `invuln ${last.player.invuln}`);
      assert(last.player.carried === 4, `carried ${last.player.carried}`);
      return 'dropped=3 (floor 7/2), ttl=8s, invuln=1.5s, carried=4';
    },
  },
  {
    name: '09-fall',
    about: 'Rơi dưới Y=-10 mất 1 lửa, mất hết đom, chờ 60 tick rồi hồi sinh',
    scenario: { ...quiet, player: { pos: [60, 0, 0], carried: 5, flames: 3 } },
    ticks: 150,
    check(lines) {
      const hit = lines.find((l) => l.type === 'event' && l.name === 'player_hit');
      assert(hit && hit.data.by === 'fall', 'expected a fall hit');
      assert(hit.data.lost === 5, `lost ${hit.data.lost}`);
      assert(hit.data.flames === 2, `flames ${hit.data.flames}`);
      const snaps = lines.filter((l) => l.type === 'snapshot');
      const respawn = snaps.find((s) => s.tick > hit.tick && s.player.pos[0] === 0 && s.player.pos[2] === 0);
      assert(respawn, 'player never respawned at the map spawn');
      assert(respawn.tick - hit.tick >= 60, `respawn after ${respawn.tick - hit.tick} ticks`);
      assert(respawn.player.invuln > 0, 'respawn must grant invulnerability');
      return `fall at tick ${hit.tick}, lost 5 motes, respawn at tick ${respawn.tick}`;
    },
  },
  {
    name: '10-mote-spawn-and-cap',
    about: '20 đom ban đầu, +1 mỗi 240 tick, trần 30',
    scenario: {},
    ticks: 720,
    snapshotEvery: 240,
    check(lines) {
      const snaps = lines.filter((l) => l.type === 'snapshot');
      const at0 = snaps.find((s) => s.tick === 0);
      assert(at0.motes_active === 20, `initial motes ${at0.motes_active}`);
      const at240 = snaps.find((s) => s.tick === 240);
      const at480 = snaps.find((s) => s.tick === 480);
      const at720 = snaps.find((s) => s.tick === 720);
      assert(at240.motes_active === 21, `tick 240 motes ${at240.motes_active}`);
      assert(at480.motes_active === 22, `tick 480 motes ${at480.motes_active}`);
      assert(at720.motes_active === 23, `tick 720 motes ${at720.motes_active}`);
      return `20 -> ${at240.motes_active} -> ${at480.motes_active} -> ${at720.motes_active}`;
    },
  },
  {
    name: '11-mote-cap-30',
    about: 'Không sinh thêm khi đã đủ 30 đom',
    scenario: {
      random_motes: true,
      random_shades: false,
      motes: Array.from({ length: 30 }, (_, i) => [Math.cos((i / 30) * Math.PI * 2) * 30, 0, Math.sin((i / 30) * Math.PI * 2) * 30]),
    },
    ticks: 480,
    snapshotEvery: 240,
    check(lines) {
      const snaps = lines.filter((l) => l.type === 'snapshot');
      for (const snap of snaps) {
        assert(snap.motes_active <= 30, `motes exceeded cap: ${snap.motes_active}`);
      }
      return `motes stayed at ${snaps[snaps.length - 1].motes_active}/30 across 8 s`;
    },
  },
  {
    name: '12-wind-night3',
    about: 'Gió Lạc bắt đầu tick 1800, đẩy người chơi 2 m/s',
    night: 3,
    scenario: { ...quiet, random_shades: false },
    ticks: 1860,
    snapshotEvery: 60,
    check(lines) {
      const snaps = lines.filter((l) => l.type === 'snapshot');
      const before = snaps.find((s) => s.tick === 1740);
      const at1800 = snaps.find((s) => s.tick === 1800);
      const at1860 = snaps.find((s) => s.tick === 1860);
      assert(before && !before.wind.active, 'wind must be calm before tick 1800');
      assert(at1800 && at1800.wind.active, 'wind must blow at tick 1800');
      assert(at1800.wind.dir_deg >= 0 && at1800.wind.dir_deg < 360, 'wind direction out of range');
      const moved = Math.hypot(at1860.player.pos[0] - at1800.player.pos[0], at1860.player.pos[2] - at1800.player.pos[2]);
      assert(moved > 1.5 && moved < 2.5, `wind moved ${moved}m in 1s`);
      return `wind on at 1800, dir=${at1800.wind.dir_deg}°, pushed ${moved.toFixed(2)}m in 1s`;
    },
  },
  {
    name: '13-drifter-steal',
    about: 'Gió Lạc đuổi khi mang >=5 đom và lấy tối đa 3',
    scenario: {
      ...quiet,
      player: { carried: 5 },
      drifters: [{ id: 'D1', pos: [5, 0, 0], state: 'idle' }],
    },
    ticks: 120,
    check(lines) {
      const steal = lines.find((l) => l.type === 'event' && l.name === 'drifter_steal');
      assert(steal, 'drifter never stole');
      assert(steal.data.amount === 3, `amount ${steal.data.amount}`);
      assert(steal.data.carried === 2, `carried ${steal.data.carried}`);
      const last = lines.filter((l) => l.type === 'snapshot').pop();
      assert(last.drifters[0].state === 'flee', `drifter state ${last.drifters[0].state}`);
      assert(last.drifters[0].stolen === 3, `stolen ${last.drifters[0].stolen}`);
      return `stole 3 at tick ${steal.tick}, player carried 2, drifter flees`;
    },
  },
  {
    name: '14-drifter-drop',
    about: 'Tỏa sáng trúng Gió Lạc đang chạy trốn làm nó rơi lại đom',
    scenario: {
      ...quiet,
      player: { carried: 3 },
      drifters: [{ id: 'D1', pos: [3, 0, 0], state: 'flee', stolen: 3, state_ticks_left: 200 }],
    },
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 1, pulse: false }] },
    ticks: 2,
    snapshotEvery: 1,
    check(lines) {
      const drop = lines.find((l) => l.type === 'event' && l.name === 'drifter_drop');
      assert(drop, 'drifter never dropped the motes');
      assert(drop.data.amount === 3, `amount ${drop.data.amount}`);
      const last = lines.filter((l) => l.type === 'snapshot').pop();
      const dropped = last.motes.filter((m) => m.kind === 'dropped');
      assert(dropped.length === 3, `dropped motes ${dropped.length}`);
      return `drifter dropped 3 motes, ${dropped.length} on the ground`;
    },
  },
  {
    name: '15-charm',
    about: 'Bùa Gió: 7.2 m/s, bỏ hồi chiêu lướt, hồi sau 45 s',
    scenario: { ...quiet, charms: [{ id: 'C1', pos: [1, 0, 0] }] },
    ticks: 1,
    snapshotEvery: 1,
    check(lines) {
      const picked = lines.find((l) => l.type === 'event' && l.name === 'charm_picked');
      assert(picked && picked.data.charm_ticks === 600, 'charm must last 600 ticks');
      const last = lines.filter((l) => l.type === 'snapshot').pop();
      assert(last.player.charm_s === 10, `charm_s ${last.player.charm_s}`);
      assert(last.charms[0].available === false && last.charms[0].respawn_s === 45, 'charm must respawn in 45 s');
      return 'charm picked, 10 s of speed, respawn 45 s';
    },
  },
  {
    name: '16-charm-speed',
    about: 'Bùa Gió nâng tốc chạy lên 7.2 m/s và xoá hồi chiêu lướt',
    scenario: { ...quiet, player: { charm_ticks: 600 } },
    inputs: {
      frames: [
        { tick: 0, move: [1, 0], dash: true },
        { tick: 1, dash: false },
        { tick: 20, move: [1, 0], dash: true },
        { tick: 21, dash: false },
      ],
    },
    ticks: 61,
    snapshotEvery: 1,
    check(lines) {
      const dashes = lines.filter((l) => l.type === 'event' && l.name === 'dash');
      assert(dashes.length === 2, `charm must remove dash cooldown, got ${dashes.length} dashes`);
      const snaps = lines.filter((l) => l.type === 'snapshot');
      const at40 = snaps.find((s) => s.tick === 40);
      const at60 = snaps.find((s) => s.tick === 60);
      const walked = Math.hypot(at60.player.pos[0] - at40.player.pos[0], at60.player.pos[2] - at40.player.pos[2]);
      assert(Math.abs(walked - 2.4) < 0.02, `walked ${walked}m in 1/3s, expected 2.4m at 7.2 m/s`);
      assert(at60.player.dash_cd_s === 0, `dash_cd_s ${at60.player.dash_cd_s}`);
      return 'walked 2.4 m in 20 ticks (7.2 m/s), second dash accepted at tick 20';
    },
  },
  {
    name: '17-night2-bridge',
    about: 'Đêm 2: cầu nối hai đảo đi được, vực thì rơi',
    night: 2,
    scenario: { ...quiet, player: { pos: [35, 0, 0] } },
    inputs: { frames: [{ tick: 0, move: [1, 0] }] },
    ticks: 120,
    check(lines) {
      const last = lines.filter((l) => l.type === 'snapshot').pop();
      assert(last.player.pos[0] > 45, `x=${last.player.pos[0]}`);
      assert(last.player.flames === TUNING.flames, 'walking the bridge must not cost a flame');
      assert(last.player.grounded, 'player must stay grounded');
      return `crossed the bridge to x=${last.player.pos[0]} with all flames`;
    },
  },
  {
    name: '18-night2-jump-pad',
    about: 'Đêm 2: bệ phóng đưa người chơi sang đảo bên kia',
    night: 2,
    scenario: { ...quiet, player: { pos: [20, 0, 18] } },
    ticks: 120,
    check(lines) {
      const last = lines.filter((l) => l.type === 'snapshot').pop();
      assert(last.player.pos[0] > 45, `landed at x=${last.player.pos[0]}`);
      assert(last.player.pos[1] === 0 && last.player.grounded, 'must land on the far island');
      return `pad launched player to x=${last.player.pos[0]}, y=0, grounded`;
    },
  },
  {
    name: '19-night3-tiers-and-pad',
    about: 'Đêm 3: ruộng bậc thang, dốc và bệ phóng lên tháp chuông',
    night: 3,
    scenario: { ...quiet, player: { pos: [25.98, 0, 15] } },
    inputs: { frames: [{ tick: 0, move: [-0.866, -0.5] }] },
    ticks: 60,
    check(lines) {
      const last = lines.filter((l) => l.type === 'snapshot').pop();
      assert(Math.abs(last.player.pos[1] - 3) < 0.05, `ramp height ${last.player.pos[1]}`);
      return `walked the ramp up to y=${last.player.pos[1]}`;
    },
  },
  {
    name: '20-night3-tower-pad',
    about: 'Đêm 3: bệ phóng từ bậc 1 lên bậc 2 (tháp chuông)',
    night: 3,
    scenario: { ...quiet, player: { pos: [0, 3, 13] } },
    ticks: 120,
    check(lines) {
      const last = lines.filter((l) => l.type === 'snapshot').pop();
      assert(Math.abs(last.player.pos[1] - 6) < 0.05, `landing height ${last.player.pos[1]}`);
      assert(last.player.grounded, 'must land on the bell-tower platform');
      return `pad landed at y=${last.player.pos[1]} on the tier-2 platform`;
    },
  },
  {
    name: '21-pause',
    about: 'Tạm dừng: tick vẫn tăng, sim_tick/thời gian/hồi chiêu đứng yên',
    scenario: { ...quiet, time_left_s: 100 },
    inputs: {
      frames: [
        { tick: 0, pause: true },
        { tick: 1, pause: false },
        { tick: 5, pause: true },
        { tick: 6, pause: false },
      ],
    },
    ticks: 12,
    snapshotEvery: 1,
    check(lines) {
      const snaps = lines.filter((l) => l.type === 'snapshot');
      const paused = snaps.filter((s) => s.state === 'paused');
      assert(paused.length >= 4, `expected >=4 paused snapshots, got ${paused.length}`);
      for (const snap of paused) {
        assert(snap.sim_tick === 0, `paused sim_tick ${snap.sim_tick}`);
        assert(snap.time_left_s === 100, `paused time_left ${snap.time_left_s}`);
        assert(snap.player.dash_cd_s === 0 && snap.player.pulse_cd_s === 0, 'cooldowns must freeze');
      }
      const last = snaps[snaps.length - 1];
      assert(last.state === 'playing', `final state ${last.state}`);
      assert(last.sim_tick > 0, 'sim_tick must advance after resuming');
      assert(last.tick > last.sim_tick, 'paused ticks still count in tick');
      return `paused for ticks 1-4, tick=${last.tick}, sim_tick=${last.sim_tick}`;
    },
  },
  {
    name: '22-night-start-and-durations',
    about: 'night_start ở tick 0, Đêm 1 kéo dài 240 giây',
    night: 1,
    scenario: { ...quiet },
    ticks: 0,
    check(lines) {
      const start = lines.find((l) => l.type === 'event' && l.name === 'night_start');
      assert(start && start.tick === 0 && start.data.night === 1, 'night_start missing at tick 0');
      const first = lines.find((l) => l.type === 'snapshot');
      assert(first.time_left_s === 240 && first.night === 1, 'night 1 duration');
      return 'night_start tick=0, duration=240 s';
    },
  },
  {
    name: '23-win-order',
    about: 'Thắp đủ sớm và giữ đèn sáng đến tick bình minh',
    scenario: {
      ...quiet,
      player: { pos: [0, 0, 24], carried: 1 },
      time_left_s: 0.05,
      lanterns: [
        { id: 'L1', lit: true, pos: [0, 0, 15] },
        { id: 'L2', lit: true },
        { id: 'L3', lit: true },
        { id: 'L4', lit: true },
        { id: 'L5', pos: [0, 0, 25], deposited: 9 },
      ],
    },
    inputs: { frames: [{ tick: 0, interact: true }] },
    ticks: 5,
    snapshotEvery: 1,
    check(lines) {
      const events = lines.filter((l) => l.type === 'event' && l.tick === 1).map((l) => l.name);
      const deposit = events.indexOf('deposit');
      const lit = events.indexOf('lantern_lit');
      const over = events.indexOf('game_over');
      assert(deposit >= 0 && lit > deposit && over === -1, `events at tick 1: ${events.join(',')}`);
      const dawn = lines.find((l) => l.name === 'game_over');
      assert(dawn?.tick === 3 && dawn.data.reason === 'dawn_survived', 'expected win at dawn');
      const end = lines[lines.length - 1];
      assert(end.state === 'won', `state ${end.state}`);
      return `tick 1: ${events.join(' -> ')}; tick 3: dawn_survived`;
    },
  },
  {
    name: '24-score-standard',
    about: 'Đèn thắp trong tick bình minh được tính điểm và tính vào ngưỡng thắng',
    scenario: {
      ...quiet,
      player: { pos: [0, 0, 24], carried: 1 },
      time_left_s: 1 / 60,
      lanterns: [
        { id: 'L1', deposited: 9 },
        { id: 'L2', lit: true },
        { id: 'L3', lit: true },
      ],
    },
    inputs: { frames: [{ tick: 0, interact: true }] },
    ticks: 1,
    snapshotEvery: 1,
    check(lines) {
      const last = lines.filter((l) => l.type === 'snapshot').pop();
      const expected = 5 + 100 + 2 * (50 + 99) + 50 + 100 + 3 * 50;
      assert(last.score === expected, `score ${last.score}, expected ${expected}`);
      assert(last.state === 'won', 'expected exactly three lit lanterns at dawn');
      return `score=${last.score} = 5 + 100 + 2×149 + 150 + 3×50`;
    },
  },
  {
    name: '25-full-night-under-30s',
    about: 'Một đêm đầy đủ chạy headless dưới 30 giây',
    night: 3,
    scenario: { ...quiet, random_shades: false },
    ticks: 18000,
    snapshotEvery: 3600,
    check(lines, meta) {
      const end = lines[lines.length - 1];
      assert(end.type === 'end', 'missing end line');
      assert(end.ticks === 18000 && end.state === 'lost', 'expected a full night ending at dawn');
      assert(meta.elapsedMs < 30000, `took ${meta.elapsedMs} ms`);
      return `18000 ticks in ${meta.elapsedMs} ms, state=${end.state}`;
    },
  },
  {
    name: '27-drifter-schedule',
    about: 'Gió Lạc sinh mỗi 1200 tick, tối đa hai con',
    night: 2,
    scenario: { ...quiet, drifters: [], random_drifters: true },
    ticks: 3600,
    snapshotEvery: 600,
    check(lines) {
      const at = (tick) => lines.find((line) => line.type === 'snapshot' && line.tick === tick);
      assert(at(600).drifters.length === 0, 'drifter spawned too early');
      assert(at(1200).drifters.map((d) => d.id).join() === 'D1', 'expected D1 at tick 1200');
      assert(at(2400).drifters.map((d) => d.id).join() === 'D1,D2', 'expected D2 at tick 2400');
      assert(at(3600).drifters.length === 2, 'drifter cap exceeded');
      return 'D1 at 1200, D2 at 2400, still 2 at 3600';
    },
  },
  {
    name: '28-decay-and-relight',
    about: 'Đèn hết dầu trước tương tác, thắp lại với 5 đom đóm, tăng sức chứa',
    scenario: {
      ...quiet,
      player: { pos: [0, 0, 24], carried: 5 },
      lanterns: [{ id: 'L1', lit: true, fuel: 1, deposited: 10 }],
    },
    inputs: { frames: [{ tick: 59, interact: true }] },
    ticks: 60,
    check(lines) {
      const events = lines.filter((l) => l.type === 'event' && l.tick === 60);
      assert(events.map((l) => l.name).join() === 'lantern_out,deposit,lantern_lit', 'wrong relight order');
      const last = lines.find((l) => l.type === 'snapshot' && l.tick === 60);
      const l = last.lanterns[0];
      assert(l.fuel === 100 && l.ever_lit && l.relit_count === 1 && l.deposited === 5, 'wrong relight state');
      assert(events[2].data.relight && last.player.capacity === 12 && last.score === 65, 'wrong relight rewards');
      return 'tick 60: out → relight, fuel 100, capacity 12, score 65';
    },
  },
  {
    name: '29-stacked-drain',
    about: 'Hai Bóng Mực cùng hút 10 dầu/giây, cộng 1 dầu/giây tự hao',
    scenario: {
      ...quiet,
      lanterns: [{ id: 'L1', lit: true, fuel: 27 }],
      shades: [0, 1].map((x) => ({ pos: [x, 0, 25], state: 'drain', target_lantern_id: 'L1' })),
    },
    ticks: 150,
    check(lines) {
      const reports = lines.filter((l) => l.name === 'fuel_drain');
      assert(reports.length === 4 && reports.map((l) => l.tick).join() === '60,60,120,120', 'wrong drain cadence');
      assert(reports[0].data.fuel === 16 && reports[2].data.fuel === 5, 'wrong stacked drain');
      const last = lines.find((l) => l.type === 'snapshot' && l.tick === 150);
      assert(!last.lanterns[0].lit && last.lanterns[0].fuel === 0, 'should extinguish');
      return '27 → 16 → 5 → 0; two reports per 60 ticks';
    },
  },
  {
    name: '30-refuel-safe-zone',
    about: 'Châm dầu vượt ngưỡng 30, đẩy Bóng Mực khỏi vùng 6 m',
    scenario: {
      ...quiet,
      player: { pos: [0, 0, 24], carried: 1 },
      lanterns: [{ id: 'L1', lit: true, fuel: 29 }],
      shades: [{ pos: [0, 0, 25], state: 'drain', target_lantern_id: 'L1' }],
    },
    inputs: { frames: [{ tick: 0, interact: true }] },
    ticks: 1,
    snapshotEvery: 1,
    check(lines) {
      const event = lines.find((l) => l.name === 'refuel');
      const last = lines.find((l) => l.type === 'snapshot' && l.tick === 1);
      assert(event?.data.amount === 1 && event.data.fuel === 38.9, 'wrong refuel');
      const shade = last.shades[0];
      assert(shade.state === 'wander' && Math.hypot(shade.pos[0], shade.pos[2] - 25) >= 6, 'shade not expelled');
      assert(last.score === 5 && last.player.flames === 3, 'wrong refuel result');
      return 'fuel 38.9, shade expelled, +5 points';
    },
  },
  {
    name: '31-pulse-drain',
    about: 'Tỏa Sáng ngắt hút và cộng 15 điểm',
    scenario: {
      ...quiet,
      player: { pos: [0, 0, 21], carried: 3 },
      lanterns: [{ id: 'L1', lit: true, fuel: 20 }],
      shades: [{ pos: [0, 0, 25], state: 'drain', target_lantern_id: 'L1' }],
    },
    inputs: { frames: [{ tick: 0, pulse: true }] },
    ticks: 1,
    snapshotEvery: 1,
    check(lines) {
      const last = lines.find((l) => l.type === 'snapshot' && l.tick === 1);
      assert(last.score === 15 && last.shades[0].state === 'stunned', 'wrong drain pulse result');
      return 'drain → stunned, +15 points';
    },
  },
];

function runCase(testCase) {
  const caseDir = path.join(casesDir, testCase.name);
  fs.mkdirSync(caseDir, { recursive: true });
  const scenarioPath = path.join(caseDir, 'scenario.json');
  const inputsPath = path.join(caseDir, 'inputs.json');
  const outPath = path.join(caseDir, 'output.jsonl');
  if (testCase.scenario) fs.writeFileSync(scenarioPath, `${JSON.stringify(testCase.scenario, null, 2)}\n`);
  if (testCase.inputs) fs.writeFileSync(inputsPath, `${JSON.stringify(testCase.inputs, null, 2)}\n`);

  const args = [
    '--seed',
    String(testCase.seed ?? 7),
    '--night',
    String(testCase.night ?? 1),
    '--ticks',
    String(testCase.ticks),
    '--snapshot-every',
    String(testCase.snapshotEvery ?? 10),
    '--out',
    outPath,
  ];
  if (testCase.scenario) args.push('--scenario', scenarioPath);
  if (testCase.inputs) args.push('--inputs', inputsPath);
  const started = Date.now();
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  const elapsedMs = Date.now() - started;
  assert(result.status === 0, `headless exit ${result.status}: ${result.stderr}`);

  const lines = fs
    .readFileSync(outPath, 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  const detail = testCase.check(lines, { elapsedMs });
  return { name: testCase.name, about: testCase.about, detail, args, lines, elapsedMs };
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

// Determinism across all three nights.
try {
  const dir = path.join(casesDir, '26-determinism');
  fs.mkdirSync(dir, { recursive: true });
  const scenario = path.join(dir, 'scenario.json');
  const inputs = path.join(dir, 'inputs.json');
  fs.writeFileSync(
    scenario,
    `${JSON.stringify(
      {
        random_motes: true,
        random_shades: true,
        random_drifters: true,
        time_left_s: 120,
        motes: [[2, 0, 3]],
        shades: [{ pos: [12, 0, -4] }],
        drifters: [{ id: 'D1', pos: [8, 0, 8], state: 'idle' }],
        charms: [{ id: 'C1', pos: [3, 0, 3] }],
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
          { tick: 40, move: [0, 1], dash: true },
          { tick: 41, dash: false },
          { tick: 80, pulse: true },
          { tick: 90, pulse: false, interact: true },
        ],
      },
      null,
      2,
    )}\n`,
  );
  const hashes = [];
  for (const night of [1, 2, 3]) {
    const pair = [];
    for (const run of ['a', 'b']) {
      const out = path.join(dir, `night${night}-${run}.jsonl`);
      const result = spawnSync(
        process.execPath,
        [
          cli,
          '--seed',
          '99',
          '--night',
          String(night),
          '--ticks',
          '600',
          '--scenario',
          scenario,
          '--inputs',
          inputs,
          '--out',
          out,
        ],
        { encoding: 'utf8' },
      );
      assert(result.status === 0, `determinism night ${night} run ${run} failed: ${result.stderr}`);
      pair.push(crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex'));
    }
    assert(pair[0] === pair[1], `night ${night} runs differ`);
    hashes.push(pair[0]);
  }
  results.push({
    name: '26-determinism',
    about: 'Cùng seed + scenario + inputs cho output giống hệt trên cả 3 đêm',
    ok: true,
    detail: `sha256 night1=${hashes[0].slice(0, 12)}…, night2=${hashes[1].slice(0, 12)}…, night3=${hashes[2].slice(0, 12)}…`,
  });
  console.log(`PASS  26-determinism  ${hashes.map((h) => h.slice(0, 12)).join(' / ')}`);
} catch (err) {
  failed = true;
  results.push({ name: '26-determinism', about: 'Tính tất định', ok: false, detail: err.message });
  console.error(`FAIL  26-determinism  ${err.message}`);
}

const rows = results
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((r) => `| ${r.ok ? 'PASS' : 'FAIL'} | ${r.name} | ${r.about} | ${r.detail} |`)
  .join('\n');
const summary = `# Bằng chứng Phase 3 — Test Contract v1.2

Sinh tự động bằng \`npm run verify\` (chạy \`tools/headless.mjs\` thật, không sửa tay output).
Mỗi case có \`scenario.json\`, \`inputs.json\` (nếu cần) và \`output.jsonl\` trong \`cases/<tên>/\`.

| Kết quả | Case | Yêu cầu được chứng minh | Kết quả đo được |
|---|---|---|---|
${rows}

Kiểm tra giao diện và FPS được ghi trong [bằng chứng trình duyệt](browser.md).

## Cách chạy lại

\`\`\`bash
npm install
npm test        # unit + CLI test
npm run verify  # chạy lại toàn bộ bằng chứng này
\`\`\`

Máy chạy: Windows 11, Node ${process.version}. Contract không phụ thuộc GPU ở chế độ headless.
`;
fs.writeFileSync(path.join(proofDir, 'README.md'), summary);

console.log(`\nProof written to docs/proof/phase-3/ (${results.filter((r) => r.ok).length}/${results.length} passed)`);
if (failed) process.exitCode = 1;
