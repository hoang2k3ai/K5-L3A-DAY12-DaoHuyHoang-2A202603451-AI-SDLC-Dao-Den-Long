import { createWorld } from './sim/world.js';
import { makeRng } from './sim/rng.js';

export function benchmarkWorld(seed) {
  const random = makeRng(seed);
  function points(count) {
    const offset = random() * Math.PI * 2;
    return Array.from({ length: count }, (_, i) => {
      const r = 39 * Math.sqrt((i + random()) / count);
      const angle = offset + i * Math.PI * (3 - Math.sqrt(5));
      return [r * Math.cos(angle), 0, r * Math.sin(angle)];
    });
  }
  return createWorld({ seed, night: 1, scenario: {
    random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false,
    shades: points(200).map((pos) => ({ pos, state: 'wander' })),
    motes: points(100),
    lanterns: ['L1', 'L2', 'L3'].map((id) => ({ id, lit: true, fuel: 100 })),
  } });
}

export function benchmarkCamera(seconds) {
  const angle = seconds * Math.PI * 2 / 15;
  return [30 * Math.cos(angle), 15, 30 * Math.sin(angle)];
}

export function frameMetrics(samples) {
  if (!samples.length) throw new Error('Không có khung hình trong khoảng đo');
  const sorted = [...samples].sort((a, b) => a - b);
  const frames = sorted.length;
  const worst = sorted.slice(-Math.ceil(frames * 0.01));
  const sum = (list) => list.reduce((total, duration) => total + duration, 0);
  const round = (value) => Math.round(value * 1000) / 1000;
  return {
    avg_fps: round(1000 * frames / sum(sorted)),
    p1_low_fps: round(1000 * worst.length / sum(worst)),
    frame_ms_p95: round(sorted[Math.ceil(frames * 0.95) - 1]),
    frames,
  };
}
