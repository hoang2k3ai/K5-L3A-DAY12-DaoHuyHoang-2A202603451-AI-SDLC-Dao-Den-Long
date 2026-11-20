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
