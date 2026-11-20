export const LIGHTNING = Object.freeze({ range: 8, halfAngle: Math.PI / 6, cooldown: 240, stun: 90, cost: 2 });
export const BROOM = Object.freeze({ height: 3.5, riseSpeed: 8, duration: 150, cooldown: 480 });

export function lightningHits(player, shade) {
  const dx = shade.x - player.x;
  const dz = shade.z - player.z;
  const distance = Math.hypot(dx, dz);
  if (distance > LIGHTNING.range + 1e-9 || Math.abs(shade.baseY - player.y) > 2) return false;
  const forward = dx * Math.sin(player.facing) + dz * Math.cos(player.facing);
  return forward >= distance * Math.cos(LIGHTNING.halfAngle) - 1e-9;
}
