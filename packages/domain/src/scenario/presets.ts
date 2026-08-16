/**
 * The six preset scenarios (BUILD.md §3, M3).
 *
 * "Most users start and stop here." Each is a real match situation with a
 * specific tactical question, not a slider demo.
 *
 * Every string is real cricket language — no placeholder content (§4).
 */

import { clampToBoundary, polarToVec, type GroundDimensions } from '../geometry';
import { positionById, type PositionId } from '../ontology/positions';
import { type FieldSetting, type Fielder } from '../rules';
import { type ScenarioState } from './types';

/**
 * Builds a field from canonical position ids. The keeper is always present and
 * always excluded from circle counts; the bowler is implicit.
 *
 * Positions are **clamped to the boundary**. The canonical anchors are generic
 * (deep square leg at 66m), but ground size is a first-class scenario parameter
 * (§6) — on a 58m square boundary a 66m anchor would put the fielder outside
 * the rope, which is not a placement anyone can make. Caught by looking at the
 * rendered ground, not by a unit test.
 */
export const fieldOf = (
  ids: readonly PositionId[],
  ground: GroundDimensions,
): FieldSetting => {
  const fielders: Fielder[] = ids.map((id, index) => {
    const position = positionById(id);
    return {
      id: `f${index}`,
      positionId: id,
      at: clampToBoundary(polarToVec(position.angleDeg, position.radiusM), ground),
      role: id === 'wicketkeeper' ? 'keeper' : 'fielder',
    };
  });
  return { fielders };
};

/**
 * Each field is ten entries — keeper plus nine fielders. The bowler is the
 * eleventh and is implicit, since he is excluded from every count anyway (§7).
 *
 * The in-circle fielders use the `short_*` anchors deliberately. §6's ring
 * radii (point, cover, square leg all at 38m) place those positions 30–38m from
 * the pitch axis, which is *outside* the 27.43m circle — so a "ring" built from
 * them is illegal in every limited-overs phase. See OQ-003.
 */

/** T20 death: five out, four saving one. */
const DEATH_FIELD: readonly PositionId[] = [
  'wicketkeeper',
  // out (5)
  'long_off',
  'long_on',
  'deep_midwicket',
  'deep_square_leg',
  'third_man',
  // in (4)
  'mid_off',
  'mid_on',
  'short_cover',
  'short_midwicket',
];

/** Powerplay: two out, slip and gully in. */
const POWERPLAY_FIELD: readonly PositionId[] = [
  'wicketkeeper',
  // out (2)
  'third_man',
  'fine_leg',
  // in (7)
  'first_slip',
  'gully',
  'short_cover',
  'extra_cover',
  'mid_off',
  'mid_on',
  'short_midwicket',
];

/** Test match, spinner, day five: bat-pads, a slip, one sweeper. */
const DAY_FIVE_FIELD: readonly PositionId[] = [
  'wicketkeeper',
  'first_slip',
  'leg_slip',
  'silly_point',
  'short_leg',
  'short_cover',
  'mid_off',
  'mid_on',
  'square_leg',
  'deep_midwicket',
];

/** Powerplay, spin, two out square on either side. */
const MIDDLE_FIELD: readonly PositionId[] = [
  'wicketkeeper',
  // out (2)
  'deep_midwicket',
  'deep_point',
  // in (7)
  'gully',
  'short_cover',
  'extra_cover',
  'mid_off',
  'mid_on',
  'short_midwicket',
  'short_fine_leg',
];

export const PRESETS: readonly ScenarioState[] = [
  {
    schemaVersion: 1,
    id: 'super_over',
    title: 'Super Over',
    superOver: true,
    format: 'T20',
    innings: 2,
    over: 0,
    ball: 3,
    score: 8,
    wicketsLost: 0,
    target: 15,
    ballsRemaining: 3,
    pitch: 'flat',
    pitchWear: 30,
    cloudCover: 20,
    dew: 60,
    ballAgeOvers: 0.3,
    ballCondition: 'new',
    ground: { straightM: 68, squareM: 62 },
    lights: true,
    bowler: {
      type: 'right_fast',
      avgSpeedKph: 143,
      swingDeg: 1,
      seamDeg: 1,
      spinDeg: 0,
      executionReliability: 78,
      oversBowled: 0.3,
      oversRemaining: 0.3,
    },
    striker: { handedness: 'RHB', archetype: 'finisher', ballsFaced: 2, runs: 6, aggression: 92 },
    nonStriker: { handedness: 'LHB', archetype: 'aggressor' },
    field: fieldOf(DEATH_FIELD, { straightM: 68, squareM: 62 }),
    lastDeliveries: [
      { over: 0, ball: 1, length: 'yorker', line: 'off_stump', variation: 'stock', runs: 2, wicket: false },
      { over: 0, ball: 2, length: 'full', line: 'middle', variation: 'stock', runs: 6, wicket: false },
      { over: 0, ball: 3, length: 'back_of_length', line: 'off_stump', variation: 'slower_ball', runs: 0, wicket: false },
    ],
  },

  {
    schemaVersion: 1,
    id: 'death_chase',
    title: 'Chase collapse',
    format: 'T20',
    innings: 2,
    over: 17,
    ball: 4,
    score: 148,
    wicketsLost: 6,
    target: 171,
    ballsRemaining: 8,
    pitch: 'hard',
    pitchWear: 55,
    cloudCover: 10,
    dew: 45,
    ballAgeOvers: 17.4,
    ballCondition: 'soft',
    ground: { straightM: 72, squareM: 58 },
    lights: true,
    bowler: {
      type: 'off_spin',
      avgSpeedKph: 88,
      swingDeg: 0,
      seamDeg: 0,
      spinDeg: 5,
      executionReliability: 64,
      oversBowled: 3,
      oversRemaining: 1,
    },
    striker: { handedness: 'RHB', archetype: 'finisher', ballsFaced: 19, runs: 34, aggression: 88 },
    nonStriker: { handedness: 'RHB', archetype: 'tailender' },
    field: fieldOf(DEATH_FIELD, { straightM: 72, squareM: 58 }),
    lastDeliveries: [
      { over: 17, ball: 1, length: 'good', line: 'off_stump', variation: 'stock', runs: 1, wicket: false },
      { over: 17, ball: 2, length: 'full', line: 'middle', variation: 'arm_ball', runs: 4, wicket: false },
      { over: 17, ball: 3, length: 'short', line: 'leg_stump', variation: 'stock', runs: 6, wicket: false },
      { over: 17, ball: 4, length: 'good', line: 'fourth_stump', variation: 'stock', runs: 0, wicket: false },
    ],
  },

  {
    schemaVersion: 1,
    id: 'new_ball_lights',
    title: 'New ball under lights',
    format: 'ODI',
    innings: 2,
    over: 2,
    ball: 2,
    score: 11,
    wicketsLost: 0,
    target: 268,
    ballsRemaining: 286,
    pitch: 'green',
    pitchWear: 5,
    cloudCover: 75,
    dew: 20,
    ballAgeOvers: 2.2,
    ballCondition: 'new',
    ground: { straightM: 74, squareM: 68 },
    lights: true,
    bowler: {
      type: 'right_fast_medium',
      avgSpeedKph: 136,
      swingDeg: 4,
      seamDeg: 3,
      spinDeg: 0,
      executionReliability: 82,
      oversBowled: 2.2,
      oversRemaining: 7.4,
    },
    striker: { handedness: 'RHB', archetype: 'anchor', ballsFaced: 8, runs: 3, aggression: 28 },
    nonStriker: { handedness: 'RHB', archetype: 'aggressor' },
    field: fieldOf(POWERPLAY_FIELD, { straightM: 74, squareM: 68 }),
    lastDeliveries: [
      { over: 2, ball: 1, length: 'good', line: 'fourth_stump', variation: 'stock', runs: 0, wicket: false },
      { over: 2, ball: 2, length: 'full', line: 'fifth_stump', variation: 'stock', runs: 0, wicket: false },
    ],
  },

  {
    schemaVersion: 1,
    id: 'day_five_rough',
    title: 'Day 5 rough',
    format: 'TEST',
    innings: 4,
    over: 78,
    ball: 2,
    score: 196,
    wicketsLost: 6,
    target: 274,
    ballsRemaining: null,
    pitch: 'dusty',
    pitchWear: 92,
    cloudCover: 15,
    dew: 0,
    ballAgeOvers: 34,
    ballCondition: 'scuffed',
    ground: { straightM: 76, squareM: 70 },
    lights: false,
    bowler: {
      type: 'off_spin',
      avgSpeedKph: 87,
      swingDeg: 0,
      seamDeg: 0,
      spinDeg: 9,
      executionReliability: 86,
      oversBowled: 28,
      oversRemaining: 20,
    },
    striker: { handedness: 'LHB', archetype: 'anchor', ballsFaced: 96, runs: 41, aggression: 22 },
    nonStriker: { handedness: 'RHB', archetype: 'tailender' },
    field: fieldOf(DAY_FIVE_FIELD, { straightM: 76, squareM: 70 }),
    lastDeliveries: [
      { over: 77, ball: 5, length: 'good', line: 'off_stump', variation: 'stock', runs: 0, wicket: false },
      { over: 77, ball: 6, length: 'good', line: 'middle', variation: 'arm_ball', runs: 1, wicket: false },
      { over: 78, ball: 1, length: 'full', line: 'off_stump', variation: 'stock', runs: 0, wicket: false },
      { over: 78, ball: 2, length: 'good', line: 'fourth_stump', variation: 'stock', runs: 0, wicket: false },
    ],
  },

  {
    schemaVersion: 1,
    id: 'tailender_on_strike',
    title: 'Tailender on strike',
    format: 'T20',
    innings: 2,
    over: 18,
    ball: 2,
    score: 159,
    wicketsLost: 8,
    target: 178,
    ballsRemaining: 10,
    pitch: 'hard',
    pitchWear: 60,
    cloudCover: 5,
    dew: 55,
    ballAgeOvers: 18.2,
    ballCondition: 'soft',
    ground: { straightM: 66, squareM: 60 },
    lights: true,
    bowler: {
      type: 'left_fast',
      avgSpeedKph: 141,
      swingDeg: 2,
      seamDeg: 1,
      spinDeg: 0,
      executionReliability: 45,
      oversBowled: 3,
      oversRemaining: 1,
    },
    striker: { handedness: 'RHB', archetype: 'tailender', ballsFaced: 3, runs: 1, aggression: 60 },
    nonStriker: { handedness: 'LHB', archetype: 'finisher' },
    field: fieldOf(DEATH_FIELD, { straightM: 66, squareM: 60 }),
    lastDeliveries: [
      { over: 18, ball: 1, length: 'yorker', line: 'wide_off', variation: 'wide_yorker', runs: 1, wicket: false },
      { over: 18, ball: 2, length: 'full_toss', line: 'middle', variation: 'stock', runs: 0, wicket: true },
    ],
  },

  {
    schemaVersion: 1,
    id: 'powerplay_left_hander',
    title: 'Powerplay vs left-hander',
    format: 'T20',
    innings: 1,
    over: 3,
    ball: 1,
    score: 29,
    wicketsLost: 1,
    target: null,
    ballsRemaining: 101,
    pitch: 'flat',
    pitchWear: 15,
    cloudCover: 35,
    dew: 10,
    ballAgeOvers: 3.1,
    ballCondition: 'new',
    ground: { straightM: 70, squareM: 64 },
    lights: false,
    bowler: {
      type: 'off_spin',
      avgSpeedKph: 91,
      swingDeg: 0,
      seamDeg: 0,
      spinDeg: 6,
      executionReliability: 74,
      oversBowled: 1,
      oversRemaining: 3,
    },
    striker: { handedness: 'LHB', archetype: 'aggressor', ballsFaced: 11, runs: 22, aggression: 85 },
    nonStriker: { handedness: 'RHB', archetype: 'anchor' },
    field: fieldOf(MIDDLE_FIELD, { straightM: 70, squareM: 64 }),
    lastDeliveries: [
      { over: 2, ball: 5, length: 'good', line: 'off_stump', variation: 'stock', runs: 1, wicket: false },
      { over: 2, ball: 6, length: 'full', line: 'middle', variation: 'stock', runs: 4, wicket: false },
      { over: 3, ball: 1, length: 'good', line: 'fourth_stump', variation: 'arm_ball', runs: 0, wicket: false },
    ],
  },
];

export const presetById = (id: string): ScenarioState | undefined =>
  PRESETS.find((p) => p.id === id);

/**
 * The question each preset is really asking. Shown under the title on the
 * preset card — it is what makes this a decision gym rather than a state viewer.
 */
export const PRESET_PROMPTS: Record<string, string> = {
  super_over: 'Seven off three, finisher on strike, dew on the ball. What do you bowl?',
  death_chase: 'Set batter, two boundaries in the last three. Your last over of spin.',
  new_ball_lights: 'Overcast, new ball, anchor becalmed. Attack the edge or squeeze?',
  day_five_rough: 'Left-hander dug in, rough outside his off stump, six down.',
  tailender_on_strike: 'Tailender on strike, finisher at the other end. Deny the single?',
  powerplay_left_hander: 'Left-hander swinging, off-spinner into the breeze, two out.',
};
