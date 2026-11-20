import { createWorld, stepWorld, drainEvents, TICK_RATE } from '../src/sim/world.js';
import { makeRng } from '../src/sim/rng.js';
import { options, writeJson } from './cli-options.mjs';

function rss() {
  globalThis.gc?.();
  return process.memoryUsage.rss() / 1024 ** 2;
}

function play(world, seed) {
  const random = makeRng(seed);
  const input = { move: [0, 0] };
  const limit = world.duration_s * TICK_RATE;
  while (world.state === 'playing' && world.tick < limit) {
    if (world.tick % 30 === 0) {
      const angle = random() * Math.PI * 2;
      input.move = [Math.cos(angle), Math.sin(angle)];
    }
    input.jump = random() < 0.05;
    input.dash = random() < 0.03;
    input.pulse = random() < 0.02;
    input.interact = random() < 0.10;
    stepWorld(world, input);
    if (world.events.length) drainEvents(world);
  }
  return world.state;
}

try {
  const { seed, nights, out } = options(process.argv.slice(2),
    { seed: 7, nights: 10, out: 'soak.json' }, ['seed', 'nights'], ['nights']);
  const start = performance.now();
  let memStart;
  let crashes = 0;
  const results = [];
  for (let i = 0; i < nights; i++) {
    try {
      const world = createWorld({ seed: seed + i, night: i % 3 + 1 });
      if (i === 0) memStart = rss();
      results.push(play(world, seed + i));
    } catch (error) {
      crashes++;
      results.push('crash');
      console.error(error.message);
    }
  }
  const memEnd = rss();
  writeJson(out, { nights, crashes, results, mem_start_mb: memStart ?? null,
    mem_end_mb: memEnd, duration_s: (performance.now() - start) / 1000 });
  if (crashes || memEnd > 1.2 * memStart) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = error instanceof TypeError ? 2 : 1;
}
