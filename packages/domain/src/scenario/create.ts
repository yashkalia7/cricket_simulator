/**
 * Building a scenario from scratch (BUILD.md §3, M3).
 *
 * The builder collects a handful of choices; everything else takes a
 * defensible default. A user should be able to describe a real situation in
 * under a minute without touching thirty fields.
 *
 * Nothing derived is stored — `phase`, rates and pressure stay functions (§9).
 */

import { type BowlerType } from '../ontology/deliveries';
import { type Archetype, type Format, type Handedness } from '../ontology/match';
import { FIELD_TEMPLATES, fieldOf, type FieldTemplateId } from './presets';
import { type ScenarioState } from './types';

export interface ScenarioDraft {
  format: Format;
  over: number;
  ball: 1 | 2 | 3 | 4 | 5 | 6;
  score: number;
  wicketsLost: number;
  /** null when batting first — there is no chase. */
  target: number | null;
  bowlerType: BowlerType;
  /** 0–100. The single most important input in the product (§3 M3). */
  executionReliability: number;
  strikerHandedness: Handedness;
  strikerArchetype: Archetype;
  strikerRuns: number;
  strikerBalls: number;
  fieldTemplate: FieldTemplateId;
  straightM: number;
  squareM: number;
}

export const DEFAULT_DRAFT: ScenarioDraft = {
  format: 'T20',
  over: 17,
  ball: 3,
  score: 148,
  wicketsLost: 5,
  target: 180,
  bowlerType: 'right_fast',
  executionReliability: 65,
  strikerHandedness: 'RHB',
  strikerArchetype: 'finisher',
  strikerRuns: 32,
  strikerBalls: 19,
  fieldTemplate: 'death',
  straightM: 70,
  squareM: 64,
};

/** Typical release speed, so the user never has to think about it. */
const SPEED: Record<BowlerType, number> = {
  right_fast: 143,
  left_fast: 141,
  right_fast_medium: 133,
  left_fast_medium: 131,
  off_spin: 88,
  leg_spin: 85,
  left_orthodox: 87,
  left_wrist: 84,
};

const isSpin = (t: BowlerType): boolean =>
  t === 'off_spin' || t === 'leg_spin' || t === 'left_orthodox' || t === 'left_wrist';

/** Balls left in the innings for a limited-overs format. */
const ballsLeftIn = (format: Format, over: number, ball: number): number | null => {
  if (format === 'TEST') return null;
  const total = format === 'T20' ? 120 : 300;
  return Math.max(0, total - (over * 6 + ball));
};

export const createScenario = (draft: ScenarioDraft): ScenarioState => {
  const ground = { straightM: draft.straightM, squareM: draft.squareM };
  const spin = isSpin(draft.bowlerType);

  return {
    schemaVersion: 1,
    id: 'custom',
    title: 'Your situation',

    format: draft.format,
    innings: draft.target === null ? 1 : 2,
    over: draft.over,
    ball: draft.ball,
    score: draft.score,
    wicketsLost: draft.wicketsLost,
    target: draft.target,
    ballsRemaining: ballsLeftIn(draft.format, draft.over, draft.ball),

    pitch: 'hard',
    pitchWear: Math.min(100, draft.over * 3),
    cloudCover: 20,
    dew: 0,
    ballAgeOvers: draft.over + draft.ball / 6,
    ballCondition: draft.over < 5 ? 'new' : draft.over < 25 ? 'scuffed' : 'soft',
    ground,
    lights: false,

    bowler: {
      type: draft.bowlerType,
      avgSpeedKph: SPEED[draft.bowlerType],
      swingDeg: spin ? 0 : 2,
      seamDeg: spin ? 0 : 2,
      spinDeg: spin ? 5 : 0,
      executionReliability: draft.executionReliability,
      oversBowled: 2,
      oversRemaining: 1,
    },

    striker: {
      handedness: draft.strikerHandedness,
      archetype: draft.strikerArchetype,
      ballsFaced: draft.strikerBalls,
      runs: draft.strikerRuns,
      aggression:
        draft.strikerArchetype === 'aggressor' || draft.strikerArchetype === 'finisher' ? 85 : 40,
    },

    nonStriker: { handedness: 'RHB', archetype: 'allrounder' },

    field: fieldOf(FIELD_TEMPLATES[draft.fieldTemplate].ids, ground),
    lastDeliveries: [],
  };
};
