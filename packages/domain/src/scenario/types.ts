/**
 * ScenarioState and friends (BUILD.md §9).
 *
 * Derived values — `phase`, `requiredRate`, `currentRate`, `pressureIndex`,
 * `ballsLeft` — are **never stored**. They live in `derive.ts` as functions, and
 * the apps expose them as selectors.
 */

import { type Vec2 } from '../geometry';
import { type Intent, type Length, type Line, type Variation, type BowlerType } from '../ontology/deliveries';
import {
  type Archetype,
  type BallCondition,
  type Format,
  type Handedness,
  type PitchType,
  type Role,
} from '../ontology/match';
import { type ScoringZone, type ShotType } from '../ontology/shots';
import { type PositionId } from '../ontology/positions';
import { type FieldSetting } from '../rules';

export type Extra = 'wide' | 'no_ball' | 'bye' | 'leg_bye';

export interface DeliveryRecord {
  over: number;
  ball: 1 | 2 | 3 | 4 | 5 | 6;
  length: Length;
  line: Line;
  variation: Variation;
  runs: number;
  wicket: boolean;
  extra?: Extra;
}

export interface BowlerState {
  type: BowlerType;
  avgSpeedKph: number;
  swingDeg: number;
  seamDeg: number;
  spinDeg: number;
  /**
   * 0–100. Teaches the single most important idea in the product and needs no
   * data (§3 M3) — it is why a yorker is a different decision for different
   * bowlers. Given prominence in the builder, not a bottom-of-Advanced slot.
   */
  executionReliability: number;
  oversBowled: number;
  oversRemaining: number;
}

export interface BatterState {
  handedness: Handedness;
  archetype: Archetype;
  ballsFaced: number;
  runs: number;
  aggression: number;
}

export interface GroundState {
  straightM: number;
  squareM: number;
}

export interface ScenarioState {
  schemaVersion: 1;
  id: string;
  /** Shown on the preset card. Not part of the tactical state. */
  title: string;

  format: Format;
  innings: 1 | 2 | 3 | 4;
  /** Completed overs, 0-indexed. */
  over: number;
  ball: 1 | 2 | 3 | 4 | 5 | 6;
  score: number;
  wicketsLost: number;
  target: number | null;
  ballsRemaining: number | null;

  pitch: PitchType;
  pitchWear: number;
  cloudCover: number;
  dew: number;
  ballAgeOvers: number;
  ballCondition: BallCondition;
  ground: GroundState;
  lights: boolean;

  bowler: BowlerState;
  striker: BatterState;
  nonStriker: { handedness: Handedness; archetype: Archetype };

  field: FieldSetting;
  /** At most 12 — the Over Tape shows the last twelve deliveries (§5). */
  lastDeliveries: DeliveryRecord[];

  freeHit?: boolean;
  /** A Super Over is a one-over match with no powerplay (§7, OQ-111). */
  superOver?: boolean;
}

/* ------------------------------------------------------------------------- */
/* Decision (§9)                                                             */
/* ------------------------------------------------------------------------- */

export interface FieldChangeIntent {
  position: PositionId;
  action: 'push_back' | 'bring_up' | 'finer' | 'squarer';
}

export type Decision =
  | {
      role: 'BOWLER';
      delivery: { length: Length; line: Line; variation: Variation; targetSpeedKph: number };
      fieldChanges: FieldChangeIntent[];
      intent: Intent;
      confidence: 1 | 2 | 3 | 4 | 5;
    }
  | {
      role: 'BATTER';
      shot: ShotType;
      targetZone: ScoringZone;
      risk: 'low' | 'medium' | 'high';
      intent: 'rotate' | 'attack' | 'defend' | 'target_bowler';
    }
  | {
      role: 'CAPTAIN';
      bowlerId: string;
      fieldChanges: FieldChangeIntent[];
      overPlan: Intent[];
      matchupTarget: 'striker' | 'nonstriker' | 'neither';
    }
  | { role: 'KEEPER'; standing: 'up' | 'back'; depthM: number; angleDeg: number }
  | { role: 'FIELDER'; positionId: PositionId; offsetM: Vec2; anticipation: ShotType[] };

/* ------------------------------------------------------------------------- */
/* Suggestion — identical in Phase 1 and Phase 2 (§9)                        */
/* ------------------------------------------------------------------------- */

export interface Suggestion {
  id: string;
  option: {
    length: Length;
    line: Line;
    variation: Variation;
    intent: Intent;
    fieldChanges: FieldChangeIntent[];
  };
  /** One sentence: why this works here. */
  because: string;
  /** One sentence: when it fails. Mandatory and specific (§10 rule 2). */
  unless: string;
  risk: 'low' | 'medium' | 'high';
  source: 'model' | 'observed' | 'coach';
  confidence: 'high' | 'contested';
  contestedBy?: string;
}

export interface DecisionRecord {
  id: string;
  scenarioHash: string;
  role: Role;
  decision: Decision;
  /** Empty in v0.1 — nothing answers the user yet (§1). */
  suggestionsShown: Suggestion[];
  msToDecide: number;
  createdAt: string;
  schemaVersion: 1;
}
