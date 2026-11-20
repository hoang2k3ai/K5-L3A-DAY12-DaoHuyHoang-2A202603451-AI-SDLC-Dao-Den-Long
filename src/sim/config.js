// Tunable numbers. These are the single source of truth and must match
// game.contract.json (the grader generates test situations from them).
// Standard tuning for Test Contract v1.2.
export const TUNING = Object.freeze({
  player_speed: 6.0, // m/s
  carry_capacity: 10, // motes
  lantern_cost: 10, // motes per lantern
  lantern_count_night1: 5,
  pickup_radius: 1.0, // m, horizontal
  interact_radius: 2.0, // m, horizontal
  pulse_cost: 3, // motes spent per pulse
  pulse_radius: 5.0, // m, 3D distance to the shade centre
  night1_duration_s: 240,
  night2_duration_s: 270,
  night3_duration_s: 300,
  flames: 3, // player light / health pool, refilled every night
  invuln_s: 1.5, // 90 ticks
  hit_drop_ratio: 0.5, // floor(carried * ratio) motes dropped on a hit
  pulse_stun_s: 2.0, // 120 ticks
  pulse_push_m: 4.0, // over the first 15 ticks of the stun
  pulse_cooldown_s: 3.0, // 180 ticks
  safe_radius: 6.0, // around a lit lantern
  shade_speed: 4.0, // m/s (Night 3 uses 4.5 from WORLD)
  shade_hit_radius: 1.0, // m, horizontal
  fall_enabled: true,
  dash_speed: 14.0, // m/s
  dash_duration_s: 0.2, // 12 ticks
  dash_cooldown_s: 1.5, // 90 ticks, measured from dash start
  fuel_max: 100,
  fuel_decay_per_s: 1,
  fuel_per_mote: 10,
  relight_cost: 5,
  win_ratio: 0.6,
  drain_per_s: 5,
  low_fuel_threshold: 30,
  capacity_max: 20,
  score: Object.freeze({
    per_mote: 5,
    per_lantern: 100, // first light
    per_relight: 40,
    per_stun: 5, // per shade hit by one pulse
    per_drain_stun: 15,
    per_dawn_lantern: 50,
    per_flame_left: 50, // win bonus
  }),
});

// Constants that are not part of the Test Contract tuning block.
export const WORLD = Object.freeze({
  gravity: 20, // m/s^2
  jump_speed: 7, // m/s
  dash_ticks: 12, // 0.2 s
  dash_cooldown_ticks: 90, // 1.5 s
  invuln_ticks: 90,
  pulse_stun_ticks: 120,
  pulse_push_ticks: 15,
  pulse_push_step: 4 / 15, // m per tick, total 4 m
  safe_push_step: 0.5, // m per tick when a lantern pushes a shade out
  shade_speed_night3: 4.5,
  shade_wander_speed: 1.5,
  shade_spawn_fade_ticks: 30,
  shade_recoil_ticks: 60,
  shade_recoil_m: 2,
  shade_detect_m: 12,
  shade_give_up_m: 18,
  shade_drain_radius: 2,
  shade_drain_interrupt_radius: 6,
  shade_height_tolerance: 1.5,
  drifter_speed: 7,
  drifter_idle_speed: 2,
  drifter_max: 2,
  drifter_spawn_first_tick: 1200,
  drifter_spawn_interval: 1200,
  drifter_detect_m: 15,
  drifter_detect_carried: 5,
  drifter_steal_radius: 1.2,
  drifter_steal_max: 3,
  drifter_flee_ticks: 240,
  drifter_remove_ticks: 120,
  charm_duration_ticks: 600,
  charm_respawn_ticks: 2700,
  charm_speed: 7.2,
  mote_initial: 20,
  mote_cap: 30,
  mote_spawn_interval: 240,
  mote_drop_ttl_ticks: 480,
  mote_drop_min: 1.5,
  mote_drop_max: 2.5,
  fall_y: -10,
  fall_wait_ticks: 60,
  wind_push_speed: 2,
  step_tolerance: 0.6,
  player_radius: 0.4,
});
