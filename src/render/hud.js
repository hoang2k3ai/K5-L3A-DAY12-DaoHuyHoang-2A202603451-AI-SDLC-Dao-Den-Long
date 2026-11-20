// HUD, menus and the between-night flow.
//
// Everything here is presentation only. The simulation never reads the DOM.
import { TUNING } from '../sim/config.js';
import { Vector3 } from 'three';

const REASONS = {
  dawn: 'Trời đã sáng nhưng đảo vẫn chìm trong sương tối.',
  no_flames: 'Ánh sáng của Mây đã tắt hẳn.',
  all_lit: 'Cả đảo đã bừng sáng.',
};

const NIGHT_TEXT = {
  1: {
    title: 'Đảo Bến',
    subtitle: 'Đêm 1 · 5 phút',
    intro:
      'Hòn đảo đầu tiên. Nhặt đom đóm, nạp đủ 10 con vào mỗi Đèn Lồng Lớn rồi thắp sáng cả năm ngọn đèn trước khi trời sáng.',
  },
  2: {
    title: 'Đảo Cau',
    subtitle: 'Đêm 2 · 5 phút 30',
    intro:
      'Hai hòn đảo nối bằng cầu và bệ phóng. Gió Lạc bắt đầu xuất hiện: giữ trên 5 đom đóm và nó sẽ đuổi theo bạn.',
  },
  3: {
    title: 'Đảo Chuông',
    subtitle: 'Đêm 3 · 6 phút',
    intro:
      'Ruộng bậc thang, tháp chuông và những cơn Gió Lạc. Bóng Mực nhanh hơn, đừng để mất hết ánh sáng.',
  },
};

export function createHud() {
  const el = {
    hud: document.getElementById('hud'),
    nightLabel: document.getElementById('night-label'),
    flames: document.getElementById('flames'),
    carried: document.getElementById('carried'),
    moteSlots: document.getElementById('mote-slots'),
    depositHint: document.getElementById('deposit-hint'),
    arrow: document.getElementById('lantern-arrow'),
    lanterns: document.getElementById('lanterns'),
    score: document.getElementById('score'),
    timer: document.getElementById('timer'),
    dash: document.getElementById('dash'),
    pulse: document.getElementById('pulse'),
    charm: document.getElementById('charm'),
    objective: document.getElementById('objective'),
    hint: document.getElementById('hint'),
    wind: document.getElementById('wind-banner'),
    drifter: document.getElementById('drifter-banner'),
    flash: document.getElementById('flash'),
    overlay: document.getElementById('overlay'),
    card: document.getElementById('card'),
    dawn: document.getElementById('dawn'),
  };

  const pips = [];
  for (let i = 0; i < TUNING.flames; i++) {
    const pip = document.createElement('span');
    pip.className = 'pip';
    el.flames.appendChild(pip);
    pips.push(pip);
  }

  let toastUntil = 0;
  let hintsVisible = true;
  const aim = new Vector3();
  const projected = new Vector3();
  const slots = Array.from({ length: TUNING.carry_capacity }, () => {
    const slot = document.createElement('span');
    slot.className = 'pip mote-slot';
    el.moteSlots.appendChild(slot);
    return slot;
  });

  function formatTime(seconds) {
    const clamped = Math.max(0, Math.ceil(seconds));
    const mm = String(Math.floor(clamped / 60)).padStart(2, '0');
    const ss = String(clamped % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function update(world, camera) {
    const p = world.player;
    const left = Math.max(0, world.duration_s - world.sim_tick / 60);
    const lit = world.lanterns.filter((l) => l.lit).length;
    const charmActive = p.charm_until > world.sim_tick;

    pips.forEach((pip, index) => pip.classList.toggle('off', index >= p.flames));
    el.nightLabel.textContent = `Đêm ${world.night} · ${world.map.name}`;
    el.carried.textContent = `${p.carried}/${world.tuning.carry_capacity}`;
    el.lanterns.textContent = `${lit}/${world.lanterns.length}`;
    el.score.textContent = world.score.toLocaleString('vi-VN');
    el.timer.textContent = formatTime(left);
    el.timer.classList.toggle('urgent', left <= 30);
    slots.forEach((slot, index) => slot.classList.toggle('off', index >= p.carried));
    let target = null;
    let nearest = Infinity;
    let deposit = null;
    let depositDistance = Infinity;
    for (const lantern of world.lanterns) {
      if (lantern.lit) continue;
      const horizontal = Math.hypot(lantern.x - p.x, lantern.z - p.z);
      const distance = Math.hypot(horizontal, lantern.y - p.y);
      if (distance < nearest) {
        target = lantern;
        nearest = distance;
      }
      if (horizontal <= world.tuning.interact_radius && horizontal < depositDistance) {
        deposit = lantern;
        depositDistance = horizontal;
      }
    }
    el.depositHint.classList.toggle('hidden', !deposit || p.falling);
    if (deposit) el.depositHint.textContent = `E — Nạp ánh sáng (${deposit.deposited}/${world.tuning.lantern_cost})`;
    updateArrow(target, camera);

    const dashCd = Math.max(0, (p.dash_ready_at - world.sim_tick) / 60);
    el.dash.textContent = charmActive ? 'sẵn sàng' : dashCd > 0 ? `${dashCd.toFixed(1)}s` : 'sẵn sàng';
    el.dash.classList.toggle('cooling', !charmActive && dashCd > 0);
    const pulseCd = Math.max(0, (p.pulse_ready_at - world.sim_tick) / 60);
    el.pulse.textContent = pulseCd > 0 ? `${pulseCd.toFixed(1)}s` : 'sẵn sàng';
    el.pulse.classList.toggle('cooling', pulseCd > 0);
    el.charm.textContent = charmActive
      ? `Bùa Gió ${Math.ceil((p.charm_until - world.sim_tick) / 60)}s`
      : '—';
    el.charm.classList.toggle('active', charmActive);

    el.wind.classList.toggle('hidden', !world.wind.active && !world.wind.warned);
    if (world.wind.warned && !world.wind.active) el.wind.textContent = 'Sắp có gió mạnh!';
    if (world.wind.active) {
      el.wind.textContent = `Gió mạnh đang thổi về hướng ${Math.round(world.wind.dir_deg)}°`;
    }
    const chasing = world.drifters.filter((d) => d.state === 'chase').length;
    el.drifter.classList.toggle('hidden', chasing === 0);
    if (chasing > 0) el.drifter.textContent = 'Gió Lạc đang đuổi theo bạn!';

    const remaining = world.lanterns.length - lit;
    if (performance.now() < toastUntil) {
      return;
    }
    if (world.state === 'won') {
      el.objective.textContent = 'Đảo đã sáng. Bạn có thể chơi lại hoặc sang đêm tiếp theo.';
    } else if (world.state === 'lost') {
      el.objective.textContent = 'Đêm nay đã khép lại.';
    } else if (remaining === 0) {
      el.objective.textContent = 'Đang kiểm tra ánh sáng cuối cùng…';
    } else {
      el.objective.textContent = `Còn ${remaining} Đèn Lồng Lớn. Mang đủ 10 đom đóm tới gần đèn và nhấn E.`;
    }
    el.hint.classList.toggle('hidden', !hintsVisible);
  }

  function updateArrow(target, camera) {
    el.arrow.classList.add('hidden');
    if (!target) return;
    camera.updateMatrixWorld();
    aim.set(target.x, target.y + 1, target.z).applyMatrix4(camera.matrixWorldInverse);
    projected.copy(aim).applyMatrix4(camera.projectionMatrix);
    if (aim.z < 0 && Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1) return;
    const sign = aim.z < 0 ? 1 : -1;
    const x = projected.x * sign;
    const y = -projected.y * sign;
    const angle = Number.isFinite(x + y) && Math.hypot(x, y) > 0.001 ? Math.atan2(x, -y) : Math.PI;
    el.arrow.style.left = `${50 + Math.sin(angle) * 42}%`;
    el.arrow.style.top = `${50 - Math.cos(angle) * 34}%`;
    el.arrow.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
    el.arrow.classList.remove('hidden');
  }

  /* ------------------------- screens ------------------------- */

  function clearCard() {
    el.card.replaceChildren();
  }

  function add(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const node = template.content.firstElementChild;
    el.card.appendChild(node);
    return node;
  }

  function openScreen(className = '') {
    el.overlay.classList.remove('hidden');
    el.card.className = `card ${className}`.trim();
    clearCard();
  }

  function closeScreen() {
    el.overlay.classList.add('hidden');
    clearCard();
  }

  function button(label, onClick, className = '') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    if (className) btn.className = className;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function actions(...buttons) {
    const row = document.createElement('div');
    row.className = 'actions';
    for (const btn of buttons) if (btn) row.appendChild(btn);
    return row;
  }

  function showMenu({ nights, onSelect, onSettings, best }) {
    openScreen('menu-card');
    add(`<p class="eyebrow">Đảo Đèn Lồng</p>`);
    add(`<h1>Ba hòn đảo, ba đêm</h1>`);
    add(
      `<p class="lede">Nhặt đom đóm, thắp sáng Đèn Lồng Lớn và giữ ánh sáng qua ba đêm. Mỗi đêm có bản đồ và luật chơi riêng.</p>`,
    );
    const list = document.createElement('div');
    list.className = 'night-list';
    for (const night of nights) {
      const info = NIGHT_TEXT[night];
      const card = document.createElement('div');
      card.className = 'night-card';
      card.innerHTML = `<span class="night-no">Đêm ${night}</span><span class="night-name">${info.title}</span><span class="night-time">${info.subtitle}</span>`;
      list.appendChild(card);
    }
    el.card.appendChild(list);
    if (best > 0) add(`<p class="meta">Kỷ lục hiện tại: ${best.toLocaleString('vi-VN')} điểm</p>`);
    el.card.appendChild(actions(button('Bắt đầu', onSelect, 'primary'), button('Cài đặt', onSettings, 'ghost')));
  }

  function showIntro(night, onStart) {
    const info = NIGHT_TEXT[night];
    openScreen('intro-card');
    add(`<p class="eyebrow">${info.subtitle}</p>`);
    add(`<h1>${info.title}</h1>`);
    add(`<p class="lede"><strong>Ông Đăng</strong> — “${info.intro}”</p>`);
    add(
      `<p class="meta">Mục tiêu: thắp sáng toàn bộ ${night === 1 ? 5 : night === 2 ? 6 : 7} Đèn Lồng Lớn. Mỗi đèn cần 10 đom đóm.</p>`,
    );
    el.card.appendChild(actions(button('Bắt đầu', onStart, 'primary')));
  }

  function showPause({ onResume, onRestart, onSettings, onMenu }) {
    openScreen('pause-card');
    add(`<p class="eyebrow">Tạm dừng</p>`);
    add(`<h1>Đêm đang đợi</h1>`);
    add(`<p class="lede">Đồng hồ và mọi chuyển động đã đứng yên.</p>`);
    el.card.appendChild(
      actions(
        button('Tiếp tục', onResume, 'primary'),
        button('Chơi lại', onRestart),
        button('Cài đặt', onSettings),
        button('Về menu', onMenu, 'ghost'),
      ),
    );
  }

  function showSettings(settings, onChange, onBack) {
    openScreen('settings-card');
    add(`<p class="eyebrow">Cài đặt</p>`);
    add(`<h1>Tuỳ chỉnh</h1>`);

    const form = document.createElement('div');
    form.className = 'settings';

    const volumeRow = document.createElement('label');
    volumeRow.className = 'setting';
    volumeRow.innerHTML = `<span>Âm lượng</span>`;
    const volume = document.createElement('input');
    volume.type = 'range';
    volume.min = '0';
    volume.max = '100';
    volume.value = String(Math.round(settings.volume * 100));
    volume.addEventListener('input', () => onChange({ volume: Number(volume.value) / 100 }));
    volumeRow.appendChild(volume);

    const muteRow = document.createElement('label');
    muteRow.className = 'setting';
    muteRow.innerHTML = `<span>Tắt tiếng</span>`;
    const mute = document.createElement('input');
    mute.type = 'checkbox';
    mute.checked = settings.muted;
    mute.addEventListener('change', () => onChange({ muted: mute.checked }));
    muteRow.appendChild(mute);

    const sensRow = document.createElement('label');
    sensRow.className = 'setting';
    sensRow.innerHTML = `<span>Độ nhạy chuột</span>`;
    const sens = document.createElement('input');
    sens.type = 'range';
    sens.min = '30';
    sens.max = '200';
    sens.value = String(Math.round(settings.sensitivity * 100));
    sens.addEventListener('input', () => onChange({ sensitivity: Number(sens.value) / 100 }));
    sensRow.appendChild(sens);

    const hintsRow = document.createElement('label');
    hintsRow.className = 'setting';
    hintsRow.innerHTML = `<span>Hiện gợi ý điều khiển</span>`;
    const hints = document.createElement('input');
    hints.type = 'checkbox';
    hints.checked = settings.hints;
    hints.addEventListener('change', () => {
      hintsVisible = hints.checked;
      onChange({ hints: hints.checked });
    });
    hintsRow.appendChild(hints);

    form.append(volumeRow, muteRow, sensRow, hintsRow);
    el.card.appendChild(form);
    el.card.appendChild(actions(button('Xong', onBack, 'primary')));
  }

  function showResult({ night, won, reason, score, stats, nextNight, onNext, onReplay, onMenu }) {
    openScreen(won ? 'result-card won' : 'result-card lost');
    add(`<p class="eyebrow">Đêm ${night} · ${NIGHT_TEXT[night].title}</p>`);
    add(`<h1>${won ? 'Đảo đã sáng' : 'Sương đen thắng rồi'}</h1>`);
    add(`<p class="lede">${REASONS[reason] ?? ''}</p>`);
    add(
      `<p class="stats">Điểm: <strong>${score.toLocaleString('vi-VN')}</strong><br />${stats}</p>`,
    );
    const buttons = [];
    if (won && nextNight) buttons.push(button(`Sang đêm ${nextNight}`, onNext, 'primary'));
    buttons.push(button(won ? 'Chơi lại đêm này' : 'Thử lại', onReplay, won && nextNight ? '' : 'primary'));
    buttons.push(button('Về menu', onMenu, 'ghost'));
    el.card.appendChild(actions(...buttons));
  }

  function showDawn(onDone) {
    closeScreen();
    el.dawn.classList.remove('hidden');
    el.dawn.classList.add('run');
    setTimeout(() => {
      el.dawn.classList.remove('run');
      el.dawn.classList.add('hidden');
      onDone();
    }, 2200);
  }

  function showSunrise(total, onMenu) {
    openScreen('result-card won');
    add('<h1>Bình Minh</h1>');
    add(`<p class="stats">Tổng điểm <strong>${total.toLocaleString('vi-VN')}</strong></p>`);
    el.card.appendChild(actions(button('Về menu', onMenu, 'primary')));
  }

  function toast(message, ms = 2600) {
    el.objective.textContent = message;
    toastUntil = performance.now() + ms;
  }

  function flash() {
    el.flash.classList.add('on');
    clearTimeout(flash.timer);
    flash.timer = setTimeout(() => el.flash.classList.remove('on'), 110);
  }

  return {
    update,
    flash,
    toast,
    showMenu,
    showIntro,
    showPause,
    showSettings,
    showResult,
    showDawn,
    showSunrise,
    closeScreen,
    showHud(visible) {
      el.hud.classList.toggle('hidden', !visible);
    },
    setHintsVisible(visible) {
      hintsVisible = visible;
    },
    nightInfo: NIGHT_TEXT,
  };
}
