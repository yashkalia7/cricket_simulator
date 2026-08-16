/**
 * Fielding restrictions (BUILD.md §7).
 *
 * Pure, synchronous, exhaustively tested. **Never a model.**
 *
 * Every rule carries provenance because playing conditions change. Each ships
 * `verified: false` until a human has checked it against the *current* ICC
 * playing conditions — see docs/OPEN_QUESTIONS.md OQ-101..OQ-110. A wrong
 * fielding restriction is a credibility-ending bug in this product (§4).
 */

import { isInsideCircle, type Vec2 } from '../geometry';
import { type Format, type Handedness } from '../ontology/match';
import { type PositionId } from '../ontology/positions';

export type FielderRole = 'keeper' | 'bowler' | 'fielder';

export interface Fielder {
  /** Stable identity across drags, so violations can point at a marker. */
  id: string;
  /** Nearest canonical position — a label, not a constraint on `at`. */
  positionId: PositionId;
  /** Actual location in metres, ground-fixed RHB frame. */
  at: Vec2;
  role: FielderRole;
}

export interface FieldSetting {
  fielders: Fielder[];
}

/** The slice of match state the rules need. A ScenarioState satisfies this. */
export interface MatchState {
  format: Format;
  /** Completed overs, 0-indexed. Over 0 is the first over. */
  over: number;
  strikerHandedness: Handedness;
  /** A Super Over has no powerplay — see `maxOutsideCircle`. */
  superOver?: boolean;
  freeHit?: boolean;
  /** Whether the batters crossed on the previous delivery. */
  battersCrossed?: boolean;
  /** The field as it stood for the previous delivery, for the free-hit lock. */
  previousField?: FieldSetting;
}

export type ViolationSeverity = 'illegal' | 'advisory';

export interface Violation {
  restrictionId: string;
  /** Names the rule in the user's language — rendered in the HUD chip. */
  message: string;
  /** Fielder ids to ring in sodium. */
  offendingFielderIds: string[];
  citation: string;
  /** False until a human checked the rule against source. Shown in the UI. */
  verified: boolean;
  severity: ViolationSeverity;
}

export interface Restriction {
  id: string;
  appliesTo: readonly Format[];
  predicate: (state: MatchState, field: FieldSetting) => Violation | null;
  citation: string;
  effectiveFrom: string;
  verified: boolean;
}

/* ------------------------------------------------------------------------- */
/* Side and circle helpers                                                   */
/* ------------------------------------------------------------------------- */

/**
 * Which sign of `x` is the leg side.
 *
 * Positions are stored in a **ground-fixed** frame where `+x` is the off side
 * *for a right-hander*. A left-hander standing at the same end has their leg
 * side on `+x` — the ground does not move, the batter turns around.
 */
export const legSideSign = (handedness: Handedness): 1 | -1 =>
  handedness === 'RHB' ? -1 : 1;

export const isOnLegSide = (at: Vec2, handedness: Handedness): boolean => {
  const sign = legSideSign(handedness);
  return sign === -1 ? at.x < 0 : at.x > 0;
};

/**
 * Behind square is behind the popping-crease line through the striker, which in
 * this frame is `y < 0`. Exactly square does not count.
 */
export const isBehindSquareAt = (at: Vec2): boolean => at.y < 0;

/** Bowler and keeper are excluded from all outside-circle counts (§7). */
const countsForCircle = (f: Fielder): boolean => f.role === 'fielder';

export const fieldersOutsideCircle = (field: FieldSetting): Fielder[] =>
  field.fielders.filter((f) => countsForCircle(f) && !isInsideCircle(f.at));

/* ------------------------------------------------------------------------- */
/* Circle allowances                                                         */
/* ------------------------------------------------------------------------- */

/**
 * Maximum fielders permitted outside the circle, or `null` where the format
 * imposes no circle restriction.
 *
 * `over` is 0-indexed: over 0 is the first over of the innings, so the T20
 * powerplay is overs 0–5 inclusive.
 */
export const maxOutsideCircle = (
  format: Format,
  over: number,
  superOver = false,
): number | null => {
  if (format === 'TEST') return null;

  // A Super Over is a one-over match played under the *final over's*
  // restrictions — there is no powerplay, so `over: 0` must not be read as one.
  // // VERIFY: OQ-111.
  if (superOver) return 5;

  if (format === 'T20') return over < 6 ? 2 : 5;
  // ODI
  if (over < 10) return 2;
  if (over < 40) return 4;
  return 5;
};

/* ------------------------------------------------------------------------- */
/* The restrictions                                                          */
/* ------------------------------------------------------------------------- */

const ALL_FORMATS: readonly Format[] = ['T20', 'ODI', 'TEST'];

/**
 * // VERIFY: every value below is transcribed from BUILD.md §7, which states
 * explicitly that these may not be current. `verified: false` until checked
 * against the current ICC playing conditions. OQ-101..OQ-110.
 */
export const RESTRICTIONS: readonly Restriction[] = [
  {
    id: 'leg_side_behind_square_max_2',
    appliesTo: ALL_FORMATS,
    citation: "ICC Playing Conditions, fielding restrictions — max two behind square on the leg side",
    effectiveFrom: '2024-01-01',
    verified: false,
    predicate: (state, field) => {
      const offenders = field.fielders.filter(
        (f) =>
          countsForCircle(f) &&
          isOnLegSide(f.at, state.strikerHandedness) &&
          isBehindSquareAt(f.at),
      );
      if (offenders.length <= 2) return null;
      return {
        restrictionId: 'leg_side_behind_square_max_2',
        message: `${offenders.length} fielders behind square on the leg side — maximum is 2`,
        offendingFielderIds: offenders.map((f) => f.id),
        citation: "ICC Playing Conditions, fielding restrictions",
        verified: false,
        severity: 'illegal',
      };
    },
  },

  {
    id: 'leg_side_max_5',
    appliesTo: ALL_FORMATS,
    citation: 'ICC Playing Conditions, fielding restrictions — max five on the leg side',
    effectiveFrom: '2024-01-01',
    verified: false,
    predicate: (state, field) => {
      const offenders = field.fielders.filter(
        (f) => countsForCircle(f) && isOnLegSide(f.at, state.strikerHandedness),
      );
      if (offenders.length <= 5) return null;
      return {
        restrictionId: 'leg_side_max_5',
        message: `${offenders.length} fielders on the leg side — maximum is 5`,
        offendingFielderIds: offenders.map((f) => f.id),
        citation: 'ICC Playing Conditions, fielding restrictions',
        verified: false,
        severity: 'illegal',
      };
    },
  },

  {
    id: 'outside_circle_limit',
    appliesTo: ['T20', 'ODI'],
    citation: "ICC Men's T20I / ODI Playing Conditions, powerplay clauses",
    effectiveFrom: '2024-01-01',
    verified: false,
    predicate: (state, field) => {
      const max = maxOutsideCircle(state.format, state.over, state.superOver);
      if (max === null) return null;

      const outside = fieldersOutsideCircle(field);
      if (outside.length <= max) return null;

      const where = state.superOver ? 'the Super Over' : `over ${state.over + 1}`;
      return {
        restrictionId: 'outside_circle_limit',
        message: `${outside.length} fielders outside the circle in ${where} — maximum is ${max}`,
        offendingFielderIds: outside.map((f) => f.id),
        citation: "ICC Men's T20I / ODI Playing Conditions",
        verified: false,
        severity: 'illegal',
      };
    },
  },

  {
    id: 'free_hit_field_locked',
    appliesTo: ALL_FORMATS,
    citation: 'ICC Playing Conditions — free hit, field may not be changed',
    effectiveFrom: '2024-01-01',
    verified: false,
    predicate: (state, field) => {
      if (!state.freeHit || !state.previousField) return null;
      // The field may change if the batters changed ends.
      if (state.battersCrossed) return null;

      const before = new Map(state.previousField.fielders.map((f) => [f.id, f.at]));
      const moved = field.fielders.filter((f) => {
        const was = before.get(f.id);
        if (!was) return true; // a fielder that was not there before
        return Math.hypot(f.at.x - was.x, f.at.y - was.y) > 0.5;
      });

      if (moved.length === 0) return null;
      return {
        restrictionId: 'free_hit_field_locked',
        message: 'Free hit — the field may not change unless the batters changed ends',
        offendingFielderIds: moved.map((f) => f.id),
        citation: 'ICC Playing Conditions — free hit',
        verified: false,
        severity: 'illegal',
      };
    },
  },
];

/* ------------------------------------------------------------------------- */
/* Evaluation                                                                */
/* ------------------------------------------------------------------------- */

/**
 * All violations for this state and field.
 *
 * Violations render live — offending fielders get a sodium ring and the HUD
 * chip turns amber and names the rule. **The user is never blocked** from
 * dragging (§7). They are told what is illegal and why.
 */
export const evaluateField = (state: MatchState, field: FieldSetting): Violation[] =>
  RESTRICTIONS.filter((r) => r.appliesTo.includes(state.format))
    .map((r) => r.predicate(state, field))
    .filter((v): v is Violation => v !== null);

export const isFieldLegal = (state: MatchState, field: FieldSetting): boolean =>
  evaluateField(state, field).length === 0;

export interface FieldChange {
  fielderId: string;
  to: Vec2;
}

/** Applies a change without validating it — validation is a separate concern. */
export const applyFieldChange = (field: FieldSetting, change: FieldChange): FieldSetting => ({
  fielders: field.fielders.map((f) => (f.id === change.fielderId ? { ...f, at: change.to } : f)),
});

/**
 * Which of the candidate moves produce no violation.
 *
 * Used to answer "where *can* this fielder go?" without the caller having to
 * re-run the whole rule set per candidate.
 */
export const legalActions = (
  state: MatchState,
  field: FieldSetting,
  candidates: readonly FieldChange[],
): FieldChange[] =>
  candidates.filter((change) => isFieldLegal(state, applyFieldChange(field, change)));

/** Every unverified rule, for the OPEN_QUESTIONS audit and the UI disclosure. */
export const unverifiedRestrictions = (): Restriction[] =>
  RESTRICTIONS.filter((r) => !r.verified);
