/**
 * Shots and scoring zones (BUILD.md §6).
 *
 * Zones are eight 45° sectors in the RHB frame, using the same angular
 * convention as `positions.ts` — 0° straight down the ground, increasing
 * clockwise. They mirror for a left-hander exactly as positions do.
 */

export const SCORING_ZONES = [
  'straight_off',
  'cover',
  'point',
  'third_man',
  'fine_leg',
  'square_leg',
  'midwicket',
  'straight_on',
] as const;
export type ScoringZone = (typeof SCORING_ZONES)[number];

/**
 * Sector bounds, [fromDeg, toDeg) clockwise in the RHB frame. They tile 0–360
 * exhaustively.
 *
 * Deliberately **not** eight equal 45° slices. The bounds are set so that each
 * canonical fielding position falls in the zone that shares its name — third
 * man (132°) must land in `third_man`, not in `point`. With equal slices it
 * did, and the coherence advisory then told the user "invites third man —
 * nobody there" while a third man was standing right there.
 */
export const ZONE_SECTORS: Record<ScoringZone, readonly [number, number]> = {
  straight_off: [0, 30],
  cover: [30, 75],
  point: [75, 120],
  third_man: [120, 180],
  fine_leg: [180, 240],
  square_leg: [240, 285],
  midwicket: [285, 330],
  straight_on: [330, 360],
};

export const ZONE_LABELS: Record<ScoringZone, string> = {
  straight_off: 'Straight / long off',
  cover: 'Cover',
  point: 'Point',
  third_man: 'Third man',
  fine_leg: 'Fine leg',
  square_leg: 'Square leg',
  midwicket: 'Midwicket',
  straight_on: 'Straight / long on',
};

/** Which sector an RHB-frame angle falls in. */
export const zoneOfAngle = (angleDeg: number): ScoringZone => {
  const a = ((angleDeg % 360) + 360) % 360;
  const found = SCORING_ZONES.find((z) => {
    const [from, to] = ZONE_SECTORS[z];
    return a >= from && a < to;
  });
  // The sectors tile 0–360 exhaustively, so this is unreachable; the fallback
  // exists because the type system cannot see that.
  return found ?? 'straight_off';
};

export const SHOT_TYPES = [
  'leave',
  'defend',
  'straight_drive',
  'cover_drive',
  'on_drive',
  'square_drive',
  'cut',
  'late_cut',
  'upper_cut',
  'pull',
  'hook',
  'sweep',
  'slog_sweep',
  'reverse_sweep',
  'glance',
  'flick',
  'ramp',
  'scoop',
  'loft_straight',
  'loft_leg',
  'slog',
] as const;
export type ShotType = (typeof SHOT_TYPES)[number];

export const SHOT_LABELS: Record<ShotType, string> = {
  leave: 'Leave',
  defend: 'Defend',
  straight_drive: 'Straight drive',
  cover_drive: 'Cover drive',
  on_drive: 'On drive',
  square_drive: 'Square drive',
  cut: 'Cut',
  late_cut: 'Late cut',
  upper_cut: 'Upper cut',
  pull: 'Pull',
  hook: 'Hook',
  sweep: 'Sweep',
  slog_sweep: 'Slog sweep',
  reverse_sweep: 'Reverse sweep',
  glance: 'Glance',
  flick: 'Flick',
  ramp: 'Ramp',
  scoop: 'Scoop',
  loft_straight: 'Loft straight',
  loft_leg: 'Loft over midwicket',
  slog: 'Slog',
};

/** Risk ordering, used to sort chips and to sanity-check a batter decision. */
export const SHOT_RISK: Record<ShotType, 'low' | 'medium' | 'high'> = {
  leave: 'low',
  defend: 'low',
  straight_drive: 'medium',
  cover_drive: 'medium',
  on_drive: 'medium',
  square_drive: 'medium',
  cut: 'medium',
  late_cut: 'medium',
  upper_cut: 'high',
  pull: 'medium',
  hook: 'high',
  sweep: 'medium',
  slog_sweep: 'high',
  reverse_sweep: 'high',
  glance: 'low',
  flick: 'low',
  ramp: 'high',
  scoop: 'high',
  loft_straight: 'high',
  loft_leg: 'high',
  slog: 'high',
};
