import { TUNING } from '../sim/config.js';

const REASONS = {
  dawn: 'Trời đã sáng nhưng đảo vẫn chìm trong sương tối.',
  no_flames: 'Ánh sáng của Mây đã tắt hẳn.',
  all_lit: 'Cả năm Đèn Lồng Lớn đã bừng sáng.',
};

export function createHud() {
  const el = {
    flames: document.getElementById('flames'),
    carried: document.getElementById('carried'),
    lanterns: document.getElementById('lanterns'),
    score: document.getElementById('score'),
    timer: document.getElementById('timer'),
    objective: document.getElementById('objective'),
    overlay: document.getElementById('overlay'),
    title: document.getElementById('overlay-title'),
    text: document.getElementById('overlay-text'),
    restart: document.getElementById('restart'),
    flash: document.getElementById('flash'),
  };

  const pips = [];
  for (let i = 0; i < TUNING.flames; i++) {
    const pip = document.createElement('span');
    pip.className = 'pip';
    el.flames.appendChild(pip);
    pips.push(pip);
  }

  let onRestart = null;
  el.restart.addEventListener('click', () => {
    if (onRestart) onRestart();
  });

  function formatTime(seconds) {
    const clamped = Math.max(0, Math.ceil(seconds));
    const mm = String(Math.floor(clamped / 60)).padStart(2, '0');
    const ss = String(clamped % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function update(world) {
    const p = world.player;
    pips.forEach((pip, index) => {
      pip.classList.toggle('off', index >= p.flames);
    });
    el.carried.textContent = `${p.carried}/${world.tuning.carry_capacity}`;
    const lit = world.lanterns.filter((l) => l.lit).length;
    el.lanterns.textContent = `${lit}/${world.lanterns.length}`;
    el.score.textContent = world.score.toLocaleString('vi-VN');
    el.timer.textContent = formatTime(world.time_start_s - world.tick / 60);
    const left = world.lanterns.length - lit;
    el.objective.textContent =
      world.state === 'won'
        ? 'Đảo đã sáng. Bạn có thể chơi lại để phá kỷ lục.'
        : `Còn ${left} Đèn Lồng Lớn cần thắp. Mang đom đóm tới gần đèn và nhấn E.`;
  }

  function showEnd(world) {
    const won = world.state === 'won';
    el.title.textContent = won ? 'Đêm đã sáng' : 'Sương đen thắng rồi';
    const reason = REASONS[world.end_reason] ?? '';
    el.text.textContent = `${reason} Điểm: ${world.score.toLocaleString('vi-VN')}.`;
    el.overlay.classList.remove('hidden');
  }

  function hideEnd() {
    el.overlay.classList.add('hidden');
  }

  let flashTimer = null;
  function flash() {
    el.flash.classList.add('on');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => el.flash.classList.remove('on'), 110);
  }

  return {
    update,
    showEnd,
    hideEnd,
    flash,
    onRestart(callback) {
      onRestart = callback;
    },
  };
}
