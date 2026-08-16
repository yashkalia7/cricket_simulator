import { describe, expect, it } from 'vitest';

import { INNER_CIRCLE_RADIUS_M, PITCH_LENGTH_M, type Vec2 } from '../geometry';
import {
  RESTRICTIONS,
  evaluateField,
  fieldersOutsideCircle,
  isFieldLegal,
  isOnLegSide,
  legalActions,
  maxOutsideCircle,
  unverifiedRestrictions,
  type FieldSetting,
  type Fielder,
  type MatchState,
} from './index';

/** Deep inside the circle, alongside the pitch. */
const INSIDE: Vec2 = { x: 5, y: 10 };
/** Comfortably outside the capsule on the off side. */
const outsideOff = (n: number): Vec2 => ({ x: INNER_CIRCLE_RADIUS_M + 10 + n, y: 10 });
/** Comfortably outside the capsule on the leg side. */
const outsideLeg = (n: number): Vec2 => ({ x: -(INNER_CIRCLE_RADIUS_M + 10 + n), y: 10 });

let seq = 0;
const fielder = (at: Vec2, role: Fielder['role'] = 'fielder'): Fielder => ({
  id: `f${seq++}`,
  positionId: 'point',
  at,
  role,
});

const field = (...fielders: Fielder[]): FieldSetting => ({ fielders });

const state = (over: number, over_rides: Partial<MatchState> = {}): MatchState => ({
  format: 'T20',
  over,
  strikerHandedness: 'RHB',
  ...over_rides,
});

describe('provenance', () => {
  it('ships every restriction unverified until a human checks the source', () => {
    expect(unverifiedRestrictions()).toHaveLength(RESTRICTIONS.length);
    for (const r of RESTRICTIONS) {
      expect(r.verified).toBe(false);
      expect(r.citation.length).toBeGreaterThan(10);
      expect(r.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('surfaces the unverified flag on every violation it raises', () => {
    const f = field(...Array.from({ length: 6 }, (_, i) => fielder(outsideLeg(i))));
    for (const v of evaluateField(state(10), f)) {
      expect(v.verified).toBe(false);
      expect(v.citation).toBeTruthy();
    }
  });
});

describe('outside-circle limit — both sides of every boundary', () => {
  const outside = (n: number) => field(...Array.from({ length: n }, (_, i) => fielder(outsideOff(i))));

  it('T20 powerplay allows 2, rejects 3', () => {
    expect(isFieldLegal(state(0), outside(2))).toBe(true);
    expect(isFieldLegal(state(0), outside(3))).toBe(false);
    expect(isFieldLegal(state(5), outside(2))).toBe(true);
    expect(isFieldLegal(state(5), outside(3))).toBe(false);
  });

  it('T20 after the powerplay allows 5, rejects 6', () => {
    expect(isFieldLegal(state(6), outside(5))).toBe(true);
    expect(isFieldLegal(state(6), outside(6))).toBe(false);
    expect(isFieldLegal(state(19), outside(5))).toBe(true);
    expect(isFieldLegal(state(19), outside(6))).toBe(false);
  });

  it('switches allowance exactly at the end of over 6', () => {
    expect(maxOutsideCircle('T20', 5)).toBe(2);
    expect(maxOutsideCircle('T20', 6)).toBe(5);
  });

  it('ODI: 2 then 4 then 5, at overs 10 and 40', () => {
    expect(maxOutsideCircle('ODI', 9)).toBe(2);
    expect(maxOutsideCircle('ODI', 10)).toBe(4);
    expect(maxOutsideCircle('ODI', 39)).toBe(4);
    expect(maxOutsideCircle('ODI', 40)).toBe(5);
    expect(maxOutsideCircle('ODI', 49)).toBe(5);
  });

  it('ODI rejects n+1 at each threshold', () => {
    const odi = (over: number) => state(over, { format: 'ODI' });
    expect(isFieldLegal(odi(0), outside(2))).toBe(true);
    expect(isFieldLegal(odi(0), outside(3))).toBe(false);
    expect(isFieldLegal(odi(10), outside(4))).toBe(true);
    expect(isFieldLegal(odi(10), outside(5))).toBe(false);
    expect(isFieldLegal(odi(40), outside(5))).toBe(true);
    expect(isFieldLegal(odi(40), outside(6))).toBe(false);
  });

  it('Test cricket has no circle restriction', () => {
    expect(maxOutsideCircle('TEST', 0)).toBeNull();
    expect(isFieldLegal(state(0, { format: 'TEST' }), outside(9))).toBe(true);
  });

  it('a Super Over has no powerplay, despite being over 0', () => {
    // Caught by a preset test: `over: 0` alone reads as a T20 powerplay and
    // would have made every legitimate Super Over field illegal.
    expect(maxOutsideCircle('T20', 0, false)).toBe(2);
    expect(maxOutsideCircle('T20', 0, true)).toBe(5);

    expect(isFieldLegal(state(0, { superOver: true }), outside(5))).toBe(true);
    expect(isFieldLegal(state(0, { superOver: true }), outside(6))).toBe(false);
  });

  it('names the Super Over rather than "over 1" when it complains', () => {
    const violations = evaluateField(state(0, { superOver: true }), outside(6));
    expect(violations[0]!.message).toContain('Super Over');
  });
});

describe('keeper and bowler exclusion', () => {
  it('does not count them toward the outside-circle limit', () => {
    // Keeper stands well back for a quick — outside the capsule behind the striker.
    const keeper = fielder({ x: 0, y: -(INNER_CIRCLE_RADIUS_M + 5) }, 'keeper');
    const bowler = fielder({ x: 0, y: PITCH_LENGTH_M + INNER_CIRCLE_RADIUS_M + 5 }, 'bowler');

    const f = field(keeper, bowler, fielder(outsideOff(0)), fielder(outsideOff(1)));
    expect(fieldersOutsideCircle(f)).toHaveLength(2);
    expect(isFieldLegal(state(0), f)).toBe(true);
  });

  it('does not count them toward the leg-side limits either', () => {
    const keeper = fielder({ x: -1, y: -12 }, 'keeper');
    const f = field(
      keeper,
      ...Array.from({ length: 2 }, (_, i) => fielder({ x: -20 - i, y: -5 })),
    );
    // Two real fielders behind square on the leg side is legal; the keeper,
    // also behind square and on the leg side, must not tip it to three.
    expect(isFieldLegal(state(10), f)).toBe(true);
  });
});

describe('leg side behind square — max 2', () => {
  const behindLeg = (n: number): Fielder => fielder({ x: -20 - n, y: -6 });

  it('allows 2 and rejects 3', () => {
    expect(isFieldLegal(state(10), field(behindLeg(0), behindLeg(1)))).toBe(true);

    const violations = evaluateField(state(10), field(behindLeg(0), behindLeg(1), behindLeg(2)));
    expect(violations).toHaveLength(1);
    expect(violations[0]!.restrictionId).toBe('leg_side_behind_square_max_2');
    expect(violations[0]!.offendingFielderIds).toHaveLength(3);
  });

  it('does not count a fielder square of the wicket', () => {
    const square = fielder({ x: -30, y: 0 });
    expect(isFieldLegal(state(10), field(behindLeg(0), behindLeg(1), square))).toBe(true);
  });

  it('does not count fielders behind square on the off side', () => {
    const offBehind = [fielder({ x: 20, y: -6 }), fielder({ x: 24, y: -8 })];
    expect(isFieldLegal(state(10), field(behindLeg(0), behindLeg(1), ...offBehind))).toBe(true);
  });

  it('follows the batter: the same field flips legality for a left-hander', () => {
    // Three fielders at negative x are behind square on the LEG side for a RHB,
    // but on the OFF side for a LHB.
    const f = field(behindLeg(0), behindLeg(1), behindLeg(2));
    expect(isFieldLegal(state(10), f)).toBe(false);
    expect(isFieldLegal(state(10, { strikerHandedness: 'LHB' }), f)).toBe(true);
  });

  it('identifies leg side by handedness', () => {
    expect(isOnLegSide({ x: -10, y: 0 }, 'RHB')).toBe(true);
    expect(isOnLegSide({ x: 10, y: 0 }, 'RHB')).toBe(false);
    expect(isOnLegSide({ x: -10, y: 0 }, 'LHB')).toBe(false);
    expect(isOnLegSide({ x: 10, y: 0 }, 'LHB')).toBe(true);
  });
});

describe('leg side — max 5', () => {
  const onLeg = (n: number): Fielder => fielder({ x: -15 - n, y: 6 + n });

  it('allows 5 and rejects 6', () => {
    const five = field(...Array.from({ length: 5 }, (_, i) => onLeg(i)));
    expect(evaluateField(state(10), five).some((v) => v.restrictionId === 'leg_side_max_5')).toBe(
      false,
    );

    const six = field(...Array.from({ length: 6 }, (_, i) => onLeg(i)));
    expect(evaluateField(state(10), six).some((v) => v.restrictionId === 'leg_side_max_5')).toBe(
      true,
    );
  });
});

describe('free hit', () => {
  const before = field(fielder(INSIDE));

  it('permits an unchanged field', () => {
    const previousField = before;
    const same: FieldSetting = { fielders: previousField.fielders.map((f) => ({ ...f })) };
    expect(isFieldLegal(state(10, { freeHit: true, previousField }), same)).toBe(true);
  });

  it('rejects a moved fielder', () => {
    const previousField = before;
    const moved: FieldSetting = {
      fielders: previousField.fielders.map((f) => ({ ...f, at: { x: 30, y: 20 } })),
    };
    const violations = evaluateField(state(10, { freeHit: true, previousField }), moved);
    expect(violations.map((v) => v.restrictionId)).toContain('free_hit_field_locked');
  });

  it('permits a change when the batters crossed', () => {
    const previousField = before;
    const moved: FieldSetting = {
      fielders: previousField.fielders.map((f) => ({ ...f, at: { x: 30, y: 20 } })),
    };
    const s = state(10, { freeHit: true, previousField, battersCrossed: true });
    expect(evaluateField(s, moved).map((v) => v.restrictionId)).not.toContain(
      'free_hit_field_locked',
    );
  });

  it('does nothing when it is not a free hit', () => {
    const previousField = before;
    const moved: FieldSetting = {
      fielders: previousField.fielders.map((f) => ({ ...f, at: { x: 30, y: 20 } })),
    };
    expect(isFieldLegal(state(10, { freeHit: false, previousField }), moved)).toBe(true);
  });
});

describe('legalActions', () => {
  it('keeps only the moves that leave the field legal', () => {
    // Powerplay: 2 already outside, so moving a third out is illegal.
    const inner = fielder(INSIDE);
    const f = field(fielder(outsideOff(0)), fielder(outsideOff(1)), inner);

    const candidates = [
      { fielderId: inner.id, to: { x: 8, y: 12 } }, // stays inside — fine
      { fielderId: inner.id, to: outsideOff(5) }, // third one out — illegal
    ];

    const legal = legalActions(state(0), f, candidates);
    expect(legal).toHaveLength(1);
    expect(legal[0]!.to).toEqual({ x: 8, y: 12 });
  });
});

describe('multiple violations', () => {
  it('reports each broken rule separately', () => {
    // 6 on the leg side, 4 of them behind square, in a T20 powerplay, all deep.
    const legDeep = Array.from({ length: 6 }, (_, i) =>
      fielder({ x: -(INNER_CIRCLE_RADIUS_M + 5 + i), y: i < 4 ? -8 : 8 }),
    );
    const violations = evaluateField(state(0), field(...legDeep));
    const ids = violations.map((v) => v.restrictionId).sort();

    expect(ids).toEqual([
      'leg_side_behind_square_max_2',
      'leg_side_max_5',
      'outside_circle_limit',
    ]);
  });
});
