// Tunable numbers. These are the single source of truth and must match
// game.contract.json (the grader generates test situations from them).
export const TUNING = Object.freeze({
  player_speed: 6, // m/s
  carry_capacity: 5, // motes
  lantern_cost: 3, // motes per lantern
  lantern_count_night1: 5,
  pickup_radius: 1.2, // m
  interact_radius: 2.5, // m
  pulse_cost: 1, // flames spent per pulse
  pulse_radius: 6, // m
  night1_duration_s: 300,
  flames: 5, // player light / health pool
  invuln_s: 1.5,
  hit_drop_ratio: 0.5, // fraction of carried motes dropped on hit (floor)
  pulse_stun_s: 3,
  pulse_push_m: 3,
  pulse_cooldown_s: 2,
  safe_radius: 4, // shades cannot enter this radius around a lit lantern
  shade_speed: 2.5, // m/s
  shade_hit_radius: 0.9, // m
  fall_enabled: true,
  score: Object.freeze({
    per_mote: 10,
    per_lantern: 100,
    per_stun: 15,
    per_second_left: 2,
    per_flame_left: 50,
  }),
});

// World constants that are not part of the Test Contract tuning block.
export const WORLD = Object.freeze({
  island_radius: 28, // m, round island; walking past this edge is a fall
  gravity: 22, // m/s^2
  jump_speed: 7, // m/s
  respawn_invuln_s: 2,
  mote_initial: 24,
  mote_respawn_s: 8,
  shade_initial: 2,
  shade_max: 5,
  shade_spawn_every_s: 40,
  lantern_ring_radius: 20,
});
