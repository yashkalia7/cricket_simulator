/**
 * Derived scenario values (BUILD.md §9).
 *
 * **Never stored.** Every one of these is a function of ScenarioState, and the
 * apps expose them as Zustand selectors. Storing any of them creates two
 * sources of truth that drift the moment a user edits one field.
 */

import { FORMAT_OVERS, phaseOf, type Phase } from '../ontology/match';
import { type ScenarioState } from './types';

/** Legal balls bowled so far in the innings. */
export const ballsBowled = (s: ScenarioState): number => s.over * 6 + s.ball;

/**
 * A Super Over is over 0, which `phaseOf` would read as a powerplay — the same
 * trap that made every legitimate Super Over field illegal (OQ-111). It is a
 * one-over match played under the final over's conditions, so it is death.
 */
export const phase = (s: ScenarioState): Phase =>
  s.superOver ? 'death' : phaseOf(s.format, s.over);

/**
 * Balls left in the innings. `null` in a format with no fixed limit, or where
 * the scenario does not pin one down.
 */
export const ballsLeft = (s: ScenarioState): number | null => {
  if (s.ballsRemaining !== null) return s.ballsRemaining;
  const overs = FORMAT_OVERS[s.format];
  if (overs === null) return null;
  return overs * 6 - ballsBowled(s);
};

/** Runs still needed to win. `null` when not chasing. */
export const runsRequired = (s: ScenarioState): number | null =>
  s.target === null ? null : Math.max(0, s.target - s.score);

/** Runs per over the batting side is scoring. */
export const currentRate = (s: ScenarioState): number => {
  const balls = ballsBowled(s);
  return balls === 0 ? 0 : (s.score / balls) * 6;
};

/** Runs per over still required. `null` when not chasing. */
export const requiredRate = (s: ScenarioState): number | null => {
  const need = runsRequired(s);
  const left = ballsLeft(s);
  if (need === null || left === null || left <= 0) return null;
  return (need / left) * 6;
};

export const wicketsInHand = (s: ScenarioState): number => 10 - s.wicketsLost;

/**
 * A blunt 0–100 composite of how much trouble the batting side is in.
 *
 * Deliberately crude and deliberately **not** presented as a probability. It
 * orders scenarios for the preset list and drives one HUD accent; it is never
 * shown as a number to the user, because §10 rule 3 forbids inventing figures
 * and the same reasoning applies to the app's own arithmetic.
 */
export const pressureIndex = (s: ScenarioState): number => {
  const rr = requiredRate(s);
  const cr = currentRate(s);
  const left = ballsLeft(s);

  // Chasing: how far the required rate outruns what they are managing.
  const rateGap = rr === null ? 0 : clamp01((rr - Math.max(cr, 4)) / 9);

  // Wickets: falls away fast below five in hand.
  const wicketPressure = clamp01((s.wicketsLost - 3) / 6);

  // Time: the last few overs of a chase are worth more than the middle.
  const timePressure = rr === null || left === null ? 0 : clamp01((36 - left) / 36);

  return Math.round(100 * clamp01(0.5 * rateGap + 0.3 * wicketPressure + 0.2 * timePressure));
};

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/** '19.1' — the conventional over.ball display. */
export const overBallLabel = (s: ScenarioState): string => `${s.over}.${s.ball}`;

/** '147/4' — the hero of the HUD (§5). */
export const scoreLabel = (s: ScenarioState): string => `${s.score}/${s.wicketsLost}`;

/**
 * The one-line chase equation, or null when not chasing.
 * '22 needed off 8'
 */
export const chaseLabel = (s: ScenarioState): string | null => {
  const need = runsRequired(s);
  const left = ballsLeft(s);
  if (need === null || left === null) return null;
  return `${need} needed off ${left}`;
};

/** Over Tape glyph for a delivery (§5). */
export const deliveryGlyph = (d: {
  runs: number;
  wicket: boolean;
  extra?: string;
}): string => {
  if (d.wicket) return 'W';
  if (d.extra === 'wide') return 'wd';
  if (d.extra === 'no_ball') return 'nb';
  if (d.runs === 0) return '•';
  return String(d.runs);
};
