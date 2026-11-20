import { createWorld, stepWorld, drainEvents, startNight, timeLeft } from './sim/world.js';
import { getMap } from './sim/maps.js';
import { createStage } from './render/scene.js';
import { createHud } from './render/hud.js';
import { createSfx } from './render/sfx.js';
import { moveFromKeys } from './input.js';

const stage = createStage(document.getElementById('app'));
const hud = createHud();
const sfx = createSfx();

const NIGHTS = [1, 2, 3];
const SETTINGS_KEY = 'dao-den-long:settings:v2';
const BEST_KEY = 'dao-den-long:best:v2';
const DEFAULT_SETTINGS = { volume: 0.7, muted: false, sensitivity: 1, hints: true };

const keys = new Set();
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

let settings = loadSettings();
let best = Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;

let world = null;
let screen = 'menu'; // menu | intro | playing | paused | settings | result | dawn
let currentNight = 1;
let settingsReturn = 'menu';
let yaw = 0;
let pitch = 0.34;
let distance = 13;
let dragging = false;
let lastPointerX = 0;
let lastPointerY = 0;
let accumulator = 0;
let lastFrame = performance.now();
let windWarning = false;
let countdown = 11;
let nextMusicTick = 0;
const nightScores = new Map();
let resultShown = false;

const params = new URLSearchParams(window.location.search);
const photoMode = params.has('photo');
const photoNight = clamp(Number(params.get('night') ?? 1) || 1, 1, 3);

/* ------------------------------ settings ------------------------------ */

function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
    return { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* private mode: settings simply do not persist */
  }
}

function applySettings() {
  sfx.setVolume(settings.volume);
  sfx.setMuted(settings.muted);
  hud.setHintsVisible(settings.hints);
}

function updateSettings(patch) {
  settings = { ...settings, ...patch };
  saveSettings();
  applySettings();
}

/* ------------------------------- worlds ------------------------------- */

function cameraDefaults(night) {
  yaw = 0;
  pitch = night === 3 ? 0.5 : 0.34;
  distance = night === 1 ? 13 : night === 2 ? 19 : 17;
}

function newWorld(night, seed = (Math.random() * 1e9) | 0) {
  return createWorld({ seed, night });
}

function photoScenario(night) {
  const map = getMap(night);
  const lanterns = map.lanterns.map((l, i) => ({ id: l.id, pos: [l.x, l.y, l.z], lit: i < 3 }));
  const base = map.spawn;
  return {
    player: { pos: [base.x, base.y, base.z + 6], carried: 4, flames: 3 },
    random_motes: false,
    random_shades: false,
    random_drifters: false,
    motes: [
      [base.x + 3, base.y, base.z + 9],
      [base.x - 4, base.y, base.z + 2],
      [base.x + 6, base.y, base.z - 3],
      [base.x - 7, base.y, base.z - 6],
      [base.x + 2, base.y, base.z + 14],
    ],
    shades: [{ pos: [base.x + 9, base.y, base.z - 6], state: 'chase' }],
    drifters: [{ id: 'D1', pos: [base.x - 8, base.y, base.z + 4], state: 'idle' }],
    charms: map.charm_points.map((c) => ({ id: c.id, pos: [c.x, c.y, c.z] })),
    lanterns,
    time_left_s: map.duration_s - 46,
  };
}

function stagePhoto() {
  world = createWorld({ seed: 12, night: photoNight, scenario: photoScenario(photoNight) });
  cameraDefaults(photoNight);
  distance = photoNight === 2 ? 26 : photoNight === 3 ? 30 : 15;
  hud.showHud(false);
  hud.closeScreen();
}

/* ------------------------------- flow -------------------------------- */

function showMenu() {
  screen = 'menu';
  resultShown = false;
  keys.clear();
  nightScores.clear();
  hud.showHud(false);
  if (!world) world = newWorld(1, 12345);
  hud.showMenu({
    nights: NIGHTS,
    best,
    onSelect: () => showIntro(1),
    onSettings: () => openSettings('menu'),
  });
}

function showIntro(night) {
  screen = 'intro';
  currentNight = night;
  cameraDefaults(night);
  hud.showHud(false);
  hud.showIntro(night, () => beginNight(night));
}

function beginNight(night) {
  sfx.unlock();
  currentNight = night;
  resultShown = false;
  world = newWorld(night);
  cameraDefaults(night);
  accumulator = 0;
  windWarning = false;
  countdown = 11;
  nextMusicTick = 0;
  keys.clear();
  hud.closeScreen();
  hud.showHud(true);
  screen = 'playing';
  startNight(world);
  for (const event of drainEvents(world)) handleEvent(event);
}

function enterPause() {
  if (screen !== 'playing' || !world) return;
  toggleSimPause();
  if (world.state !== 'paused') return;
  screen = 'paused';
  sfx.pause();
  hud.showPause({
    onResume: resumeGame,
    onRestart: () => beginNight(currentNight),
    onSettings: () => openSettings('paused'),
    onMenu: showMenu,
  });
}

function resumeGame() {
  if (screen !== 'paused' || !world) return;
  toggleSimPause();
  if (world.state !== 'playing') return;
  screen = 'playing';
  hud.closeScreen();
}

function toggleSimPause() {
  // The simulation owns the paused state; we feed it one clean press edge.
  world.prevButtons.pause = false;
  world.input.buttons.pause = false;
  keys.clear();
  stepWorld(world, { ...inputState(), pause: true });
  for (const event of drainEvents(world)) handleEvent(event);
}

function openSettings(from) {
  settingsReturn = from;
  const previous = screen;
  screen = 'settings';
  hud.showSettings(settings, updateSettings, () => {
    if (settingsReturn === 'paused') {
      screen = 'paused';
      hud.showPause({
        onResume: resumeGame,
        onRestart: () => beginNight(currentNight),
        onSettings: () => openSettings('paused'),
        onMenu: showMenu,
      });
    } else {
      screen = previous === 'settings' ? 'menu' : previous;
      showMenu();
    }
  });
}

function showResult() {
  if (resultShown) return;
  resultShown = true;
  screen = 'result';
  const won = world.state === 'won';
  const lit = world.lanterns.filter((l) => l.lit).length;
  const remaining = Math.max(0, timeLeft(world));
  const seconds = Math.ceil(remaining);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  if (won) nightScores.set(currentNight, world.score);
  const total = [...nightScores.values()].reduce((sum, score) => sum + score, 0);
  if (won && currentNight === 3) {
    if (total > best) {
      best = total;
      try {
        localStorage.setItem(BEST_KEY, String(best));
      } catch {
        /* ignore */
      }
    }
    hud.showSunrise(total, showMenu);
    return;
  }
  hud.showResult({
    night: currentNight,
    won,
    reason: world.end_reason,
    score: world.score,
    stats: `Đèn đã thắp: ${lit}/${world.lanterns.length} · Thời gian còn lại: ${mm}:${ss} · Ánh sáng: ${Math.max(0, world.player.flames)}/${world.tuning.flames}`,
    nextNight: currentNight < 3 ? currentNight + 1 : null,
    onNext: () => showIntro(currentNight + 1),
    onReplay: () => beginNight(currentNight),
    onMenu: showMenu,
  });
}

/* ------------------------------- events ------------------------------- */

function handleEvent(event) {
  switch (event.name) {
    case 'night_start':
      sfx.nightStart();
      hud.toast(`Đêm ${event.data.night} · ${world.map.name}`);
      break;
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
      sfx.pulse();
      break;
    case 'dash':
      sfx.dash();
      break;
    case 'charm_picked':
      sfx.charm();
      hud.toast('Bùa Gió: chạy nhanh hơn và lướt không hồi chiêu!');
      break;
    case 'drifter_steal':
      sfx.steal();
      hud.toast(`Gió Lạc đã lấy ${event.data.amount} đom đóm!`);
      break;
    case 'drifter_drop':
      sfx.drop();
      break;
    case 'player_hit':
      sfx.hit();
      hud.flash();
      break;
    case 'shade_spawned':
      sfx.spawn();
      break;
    case 'paused':
      sfx.pause();
      break;
    case 'resumed':
      break;
    case 'game_over':
      sfx.end(event.data.result === 'won');
      if (event.data.reason === 'dawn') {
        screen = 'dawn';
        sfx.dawn();
        hud.showDawn(() => showResult());
      } else {
        showResult();
      }
      break;
    default:
      break;
  }
}

/* -------------------------------- input ------------------------------- */

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
    pulse: keys.has('KeyQ'),
    dash: keys.has('ShiftLeft') || keys.has('ShiftRight'),
  };
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') event.preventDefault();
  sfx.unlock();

  if (event.code === 'Escape' || event.code === 'KeyP') {
    if (event.repeat) return;
    if (screen === 'playing') enterPause();
    else if (screen === 'paused') resumeGame();
    return;
  }
  if (event.code === 'KeyM') {
    updateSettings({ muted: !settings.muted });
    return;
  }
  if (event.code === 'KeyR' && (screen === 'playing' || screen === 'paused' || screen === 'result')) {
    beginNight(currentNight);
    return;
  }
  keys.add(event.code);
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
  yaw -= (event.clientX - lastPointerX) * 0.005 * settings.sensitivity;
  pitch = clamp(pitch + (event.clientY - lastPointerY) * 0.003 * settings.sensitivity, 0.05, 0.95);
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
    distance = clamp(distance + event.deltaY * 0.01, 4.5, 26);
  },
  { passive: true },
);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

/* ------------------------------- main loop ---------------------------- */

function frame(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;

  if (!photoMode && world && screen === 'playing' && world.state === 'playing') {
    accumulator += dt;
    let steps = 0;
    while (accumulator >= 1 / 60 && steps < 5) {
      const input = inputState();
      const wasGrounded = world.player.grounded;
      stepWorld(world, input);
      if (input.jump && wasGrounded && world.player.vy > 0) sfx.jump();
      accumulator -= 1 / 60;
      steps += 1;
      for (const event of drainEvents(world)) handleEvent(event);
      if (world.state !== 'playing') break;
    }
    if (steps === 5) accumulator = 0;

    const warning = world.wind.warned && !world.wind.active;
    if (warning && !windWarning) {
      sfx.wind();
    }
    windWarning = warning;
    const seconds = Math.ceil(timeLeft(world));
    if (seconds > 0 && seconds <= 10 && seconds < countdown) {
      sfx.countdown(seconds);
      countdown = seconds;
    }
    if (world.state === 'playing' && world.sim_tick >= nextMusicTick) {
      sfx.music(world.night);
      nextMusicTick = world.sim_tick + 360;
    }
  }

  if (world) {
    stage.update(world, dt, { yaw, pitch, dist: distance });
    if (screen === 'playing') hud.update(world, stage.camera);
  }
  stage.render();
  requestAnimationFrame(frame);
}

applySettings();
if (photoMode) {
  stagePhoto();
} else {
  world = newWorld(1, 12345);
  const playParam = Number(params.get('play'));
  if (NIGHTS.includes(playParam)) beginNight(playParam);
  else showMenu();
}
requestAnimationFrame(frame);
