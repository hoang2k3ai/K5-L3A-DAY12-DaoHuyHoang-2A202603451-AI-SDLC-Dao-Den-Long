import { createWorld, stepWorld, drainEvents } from './sim/world.js';
import { createStage } from './render/scene.js';
import { createHud } from './render/hud.js';
import { createSfx } from './render/sfx.js';
import { moveFromKeys } from './input.js';

const stage = createStage(document.getElementById('app'));
const hud = createHud();
const sfx = createSfx();

const keys = new Set();
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

let world = null;
let yaw = 0;
let pitch = 0.34;
let distance = 9.5;
let dragging = false;
let lastPointerX = 0;
let lastPointerY = 0;
let accumulator = 0;
let lastFrame = performance.now();

// Dev aid: /?photo=1 stages a scenic, frozen frame for screenshots.
// It never runs the simulation, so it cannot be mistaken for gameplay proof.
const params = new URLSearchParams(window.location.search);
const photoMode = params.has('photo');
const PHOTO_SCENARIO = {
  player: { pos: [0, 0, 6], carried: 3, flames: 5 },
  random_motes: false,
  random_shades: false,
  time_left_s: 214,
  motes: [
    [3, 0, 9],
    [-4, 0, 2],
    [6, 0, -3],
    [-7, 0, -6],
    [2, 0, 14],
    [-2, 0, -12],
  ],
  shades: [{ pos: [9, 0, -6] }, { pos: [-11, 0, 3] }],
  lanterns: [
    { id: 'L1', pos: [0, 0, -8], lit: true },
    { id: 'L2', pos: [10, 0, 4], lit: true },
    { id: 'L3', pos: [-10, 0, 6], deposited: 2 },
    { id: 'L4', pos: [8, 0, 14], lit: true },
    { id: 'L5', pos: [-12, 0, -12] },
  ],
};

function start() {
  if (photoMode) {
    world = createWorld({ seed: 12, scenario: PHOTO_SCENARIO });
    yaw = 0.45;
    distance = 13;
    hud.hideEnd();
    hud.update(world);
    return;
  }
  world = createWorld({ seed: (Math.random() * 1e9) | 0 });
  accumulator = 0;
  keys.clear();
  hud.hideEnd();
  hud.update(world);
}

hud.onRestart(start);

function inputState() {
  const forward =
    (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
    (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const strafe =
    (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
    (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  return {
    move: moveFromKeys(forward, strafe),
    cam_yaw_deg: (yaw * 180) / Math.PI,
    jump: keys.has('Space'),
    interact: keys.has('KeyE'),
    pulse: keys.has('KeyQ') || keys.has('ShiftLeft') || keys.has('ShiftRight'),
  };
}

function handleEvent(event) {
  switch (event.name) {
    case 'mote_picked':
      sfx.pickup();
      break;
    case 'deposit':
      sfx.deposit();
      break;
    case 'lantern_lit':
      sfx.lantern();
      break;
    case 'pulse':
      if (event.data.stunned_ids.length > 0) sfx.pulse();
      break;
    case 'player_hit':
      sfx.hit();
      hud.flash();
      break;
    case 'shade_spawned':
      sfx.spawn();
      break;
    case 'game_over':
      sfx.end(event.data.result === 'won');
      hud.showEnd(world);
      break;
    default:
      break;
  }
}

function frame(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;

  if (world.state === 'playing' && !photoMode) {
    accumulator += dt;
    let steps = 0;
    while (accumulator >= 1 / 60 && steps < 5) {
      stepWorld(world, inputState());
      accumulator -= 1 / 60;
      steps += 1;
      for (const event of drainEvents(world)) handleEvent(event);
      if (world.state !== 'playing') break;
    }
    if (steps === 5) accumulator = 0;
  }

  stage.update(world, dt, { yaw, pitch, dist: distance });
  hud.update(world);
  stage.render();
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') event.preventDefault();
  keys.add(event.code);
  sfx.unlock();
  if (event.code === 'KeyR') start();
  if (event.code === 'KeyM') sfx.toggle();
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
});

window.addEventListener('blur', () => keys.clear());

document.addEventListener('visibilitychange', () => {
  lastFrame = performance.now();
});

const canvas = stage.domElement;
canvas.addEventListener('pointerdown', (event) => {
  dragging = true;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
  sfx.unlock();
});
canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  yaw -= (event.clientX - lastPointerX) * 0.005;
  pitch = clamp(pitch + (event.clientY - lastPointerY) * 0.003, 0.05, 0.95);
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
});
canvas.addEventListener('pointerup', (event) => {
  dragging = false;
  canvas.releasePointerCapture?.(event.pointerId);
});
canvas.addEventListener('pointercancel', () => {
  dragging = false;
});
canvas.addEventListener(
  'wheel',
  (event) => {
    distance = clamp(distance + event.deltaY * 0.01, 4.5, 16);
  },
  { passive: true },
);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

start();
requestAnimationFrame(frame);
