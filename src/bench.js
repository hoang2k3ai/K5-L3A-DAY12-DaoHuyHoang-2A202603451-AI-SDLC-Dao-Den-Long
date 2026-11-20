import { REVISION } from 'three';
import { createStage } from './render/scene.js';
import { stepBenchmark, TICK_RATE } from './sim/world.js';
import { benchmarkCamera, benchmarkWorld, frameMetrics } from './bench-scene.js';

const params = new URLSearchParams(location.search);
const duration = Number(params.get('duration') ?? 30) * 1000;
const world = benchmarkWorld(Number(params.get('seed') ?? 42));
const stage = createStage(document.querySelector('#app'), { benchmark: true });
const samples = [];
let first;
let previous;
let simulated = 0;

function frame(now) {
  first ??= now;
  previous ??= now;
  const elapsed = now - first;
  const delta = now - previous;
  const goal = Math.floor(elapsed * TICK_RATE / 1000);
  while (simulated < goal) {
    stepBenchmark(world);
    simulated++;
  }
  stage.update(world, Math.min(delta / 1000, 0.1), { orbit: benchmarkCamera(elapsed / 1000) });
  stage.render();
  window.benchFirstFrame ??= performance.timeOrigin + performance.now();
  const start = first + 3000;
  const end = start + duration;
  if (now > start && now <= end && delta > 0) samples.push(delta);
  previous = now;
  if (now < end) requestAnimationFrame(frame);
  else window.benchResult = { ...frameMetrics(samples), renderer: `Three.js r${REVISION} / WebGL 2` };
}

requestAnimationFrame(frame);
