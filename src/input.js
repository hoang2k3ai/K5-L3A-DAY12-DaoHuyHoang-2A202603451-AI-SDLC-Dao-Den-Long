// Keyboard -> Test Contract input mapping.
//
// The contract fixes this transform (cam_yaw_deg = θ):
//   x' = x·cosθ + z·sinθ
//   z' = -x·sinθ + z·cosθ
// so at θ = 0 the input x maps to world +X. Our third-person camera sits at
// -(sinθ, cosθ)·distance and looks along +(sinθ, cosθ); for that camera the
// screen-right direction is (-cosθ, sinθ), i.e. the contract's x = -strafe.
// Hence strafe keys are negated here. The simulation is untouched, so headless
// runs and the contract tests keep their exact meaning.
export function moveFromKeys(forward, strafe) {
  return [-strafe, forward];
}

export const ACTIONS = Object.freeze({
  up: 'Tiến', down: 'Lùi', left: 'Trái', right: 'Phải', jump: 'Nhảy',
  dash: 'Lướt', interact: 'Tương tác', pulse: 'Tỏa Sáng', pause: 'Tạm dừng',
  motes: 'Tầm Đom', guide: 'Dẫn Đăng',
  lightning: 'Thiểm Lôi', broom: 'Chổi Bay',
});

export const DEFAULT_BINDINGS = Object.freeze({
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  jump: ['Space'], dash: ['ShiftLeft', 'ShiftRight'],
  interact: ['KeyE'], pulse: ['KeyQ'], pause: ['Escape', 'KeyP'],
  motes: ['KeyF'], guide: ['KeyG'],
  lightning: ['KeyX'], broom: ['KeyB'],
});

export function bindingConflict(bindings, action, code) {
  return Object.keys(ACTIONS).find((other) => other !== action && bindings[other].includes(code));
}

export function keyLabel(code) {
  return ({
    Space: 'Space', Escape: 'Esc', ShiftLeft: 'Shift trái', ShiftRight: 'Shift phải',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  })[code] ?? code.replace(/^(Key|Digit)/, '');
}
