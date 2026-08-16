/**
 * Delivery taxonomy (BUILD.md §6).
 *
 * These unions are the controlled vocabulary. No component anywhere may declare
 * a string literal for a length, line, variation or intent — §4.
 */

export const LENGTHS = [
  'full_toss',
  'yorker',
  'full',
  'good',
  'back_of_length',
  'short',
  'bouncer',
] as const;
export type Length = (typeof LENGTHS)[number];

export const LINES = [
  'wide_off',
  'fifth_stump',
  'fourth_stump',
  'off_stump',
  'middle',
  'leg_stump',
  'down_leg',
] as const;
export type Line = (typeof LINES)[number];

export const VARIATIONS = [
  'stock',
  'slower_ball',
  'cutter',
  'knuckle',
  'wide_yorker',
  'arm_ball',
  'googly',
  'carrom',
  'slider',
  'topspinner',
  'doosra',
] as const;
export type Variation = (typeof VARIATIONS)[number];

/**
 * Intent is what separates a good decision from a lucky one. It is the field
 * Phase 2 grades on (§6) — a boundary conceded off a ball that was trying to
 * buy a wicket is not the same mistake as one conceded while containing.
 */
export const INTENTS = [
  'attack_wicket',
  'contain',
  'deny_boundary',
  'set_up_next',
  'probe',
] as const;
export type Intent = (typeof INTENTS)[number];

export const BOWLER_TYPES = [
  'right_fast',
  'left_fast',
  'right_fast_medium',
  'left_fast_medium',
  'off_spin',
  'leg_spin',
  'left_orthodox',
  'left_wrist',
] as const;
export type BowlerType = (typeof BOWLER_TYPES)[number];

export const isSpinner = (type: BowlerType): boolean =>
  type === 'off_spin' || type === 'leg_spin' || type === 'left_orthodox' || type === 'left_wrist';

/** Variations only a spinner can bowl, and vice versa. */
const SPIN_ONLY: ReadonlySet<Variation> = new Set([
  'arm_ball',
  'googly',
  'carrom',
  'slider',
  'topspinner',
  'doosra',
]);
const PACE_ONLY: ReadonlySet<Variation> = new Set(['knuckle', 'wide_yorker']);

/**
 * Whether a bowler of this type can plausibly bowl this variation. Used to keep
 * the delivery composer from offering a seamer a doosra.
 */
export const canBowl = (type: BowlerType, variation: Variation): boolean => {
  if (variation === 'stock' || variation === 'slower_ball' || variation === 'cutter') return true;
  return isSpinner(type) ? SPIN_ONLY.has(variation) : PACE_ONLY.has(variation);
};

export const LENGTH_LABELS: Record<Length, string> = {
  full_toss: 'Full toss',
  yorker: 'Yorker',
  full: 'Full',
  good: 'Good',
  back_of_length: 'Back of a length',
  short: 'Short',
  bouncer: 'Bouncer',
};

export const LINE_LABELS: Record<Line, string> = {
  wide_off: 'Wide outside off',
  fifth_stump: 'Fifth stump',
  fourth_stump: 'Fourth stump',
  off_stump: 'Off stump',
  middle: 'Middle',
  leg_stump: 'Leg stump',
  down_leg: 'Down leg',
};

export const VARIATION_LABELS: Record<Variation, string> = {
  stock: 'Stock ball',
  slower_ball: 'Slower ball',
  cutter: 'Cutter',
  knuckle: 'Knuckle ball',
  wide_yorker: 'Wide yorker',
  arm_ball: 'Arm ball',
  googly: 'Googly',
  carrom: 'Carrom ball',
  slider: 'Slider',
  topspinner: 'Topspinner',
  doosra: 'Doosra',
};

export const INTENT_LABELS: Record<Intent, string> = {
  attack_wicket: 'Attack the wicket',
  contain: 'Contain',
  deny_boundary: 'Deny the boundary',
  set_up_next: 'Set up the next ball',
  probe: 'Probe',
};

export const BOWLER_TYPE_LABELS: Record<BowlerType, string> = {
  right_fast: 'Right-arm fast',
  left_fast: 'Left-arm fast',
  right_fast_medium: 'Right-arm fast-medium',
  left_fast_medium: 'Left-arm fast-medium',
  off_spin: 'Off spin',
  leg_spin: 'Leg spin',
  left_orthodox: 'Left-arm orthodox',
  left_wrist: 'Left-arm wrist spin',
};
