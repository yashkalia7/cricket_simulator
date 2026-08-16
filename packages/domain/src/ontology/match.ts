/**
 * Match shape: formats, phases, conditions, batter archetypes (BUILD.md §6, §9).
 */

export const FORMATS = ['T20', 'ODI', 'TEST'] as const;
export type Format = (typeof FORMATS)[number];

export const FORMAT_LABELS: Record<Format, string> = {
  T20: 'T20',
  ODI: 'ODI',
  TEST: 'Test',
};

/** Balls in a completed innings, or null where there is no fixed limit. */
export const FORMAT_OVERS: Record<Format, number | null> = {
  T20: 20,
  ODI: 50,
  TEST: null,
};

export const PHASES = ['powerplay', 'middle', 'death', 'new_ball', 'session'] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_LABELS: Record<Phase, string> = {
  powerplay: 'Powerplay',
  middle: 'Middle overs',
  death: 'Death overs',
  new_ball: 'New ball',
  session: 'Session',
};

/**
 * Phase is **derived, never stored** (§9). It is a function of format and how
 * many overs are gone.
 */
export const phaseOf = (format: Format, oversCompleted: number): Phase => {
  if (format === 'TEST') return oversCompleted < 10 ? 'new_ball' : 'session';
  if (format === 'T20') {
    if (oversCompleted < 6) return 'powerplay';
    return oversCompleted < 16 ? 'middle' : 'death';
  }
  if (oversCompleted < 10) return 'powerplay';
  return oversCompleted < 40 ? 'middle' : 'death';
};

export const PITCH_TYPES = ['green', 'hard', 'flat', 'dry', 'dusty', 'cracked'] as const;
export type PitchType = (typeof PITCH_TYPES)[number];

export const PITCH_LABELS: Record<PitchType, string> = {
  green: 'Green',
  hard: 'Hard',
  flat: 'Flat',
  dry: 'Dry',
  dusty: 'Dusty',
  cracked: 'Cracked',
};

export const BALL_CONDITIONS = ['new', 'scuffed', 'soft', 'reversing'] as const;
export type BallCondition = (typeof BALL_CONDITIONS)[number];

export const BALL_CONDITION_LABELS: Record<BallCondition, string> = {
  new: 'New',
  scuffed: 'Scuffed',
  soft: 'Soft',
  reversing: 'Reversing',
};

export const ARCHETYPES = ['anchor', 'aggressor', 'finisher', 'allrounder', 'tailender'] as const;
export type Archetype = (typeof ARCHETYPES)[number];

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  anchor: 'Anchor',
  aggressor: 'Aggressor',
  finisher: 'Finisher',
  allrounder: 'All-rounder',
  tailender: 'Tailender',
};

export const HANDEDNESS = ['RHB', 'LHB'] as const;
export type Handedness = (typeof HANDEDNESS)[number];

export const ROLES = ['BOWLER', 'BATTER', 'CAPTAIN', 'KEEPER', 'FIELDER'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  BOWLER: 'Bowler',
  BATTER: 'Batter',
  CAPTAIN: 'Captain',
  KEEPER: 'Keeper',
  FIELDER: 'Fielder',
};
