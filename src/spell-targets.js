// Read-only targeting for the two optional guidance spells.
export function guidanceTargets(world, action) {
  const player = world.player;
  const source = action === 'motes' ? world.motes : world.lanterns.filter((lamp) => !lamp.lit);
  return source.map((target) => ({
    target,
    distance: Math.hypot(target.x - player.x, target.y - player.y, target.z - player.z),
  })).sort((a, b) => a.distance - b.distance).slice(0, action === 'motes' ? 3 : 1);
}
