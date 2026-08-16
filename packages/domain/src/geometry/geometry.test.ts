import { describe, expect, it } from 'vitest';

import { POSITIONS, isBehindSquare, sideOf } from '../ontology/positions';
import { SCORING_ZONES, ZONE_SECTORS, zoneOfAngle } from '../ontology/shots';
import {
  DEFAULT_GROUND,
  INNER_CIRCLE_RADIUS_M,
  PITCH_LENGTH_M,
  boundaryRadiusAt,
  clampToBoundary,
  distanceFromBat,
  isInsideBoundary,
  isInsideCircle,
  mirrorAngle,
  mirrorVec,
  nearestCanonicalPosition,
  polarToVec,
  screenToWorld,
  vecToPolar,
  worldToScreen,
  type Vec2,
  type Viewport,
} from './index';

const close = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('polar conversion', () => {
  it('puts 0 degrees toward the bowler', () => {
    const p = polarToVec(0, 10);
    close(p.x, 0);
    close(p.y, 10);
  });

  it('puts 90 degrees on the off side (+x) for a right-hander', () => {
    const p = polarToVec(90, 10);
    close(p.x, 10);
    close(p.y, 0);
  });

  it('puts 180 degrees behind the striker', () => {
    const p = polarToVec(180, 10);
    close(p.x, 0);
    close(p.y, -10);
  });

  it('puts 270 degrees on the leg side (-x)', () => {
    const p = polarToVec(270, 10);
    close(p.x, -10);
    close(p.y, 0);
  });

  it('round-trips through vecToPolar', () => {
    for (const angle of [0, 17, 88, 175, 214, 307, 359]) {
      const { angleDeg, radiusM } = vecToPolar(polarToVec(angle, 42));
      close(angleDeg, angle, 1e-9);
      close(radiusM, 42, 1e-9);
    }
  });
});

describe('handedness mirror', () => {
  it('is an involution on angles: mirror(mirror(a)) === a', () => {
    for (const angle of [0, 1, 45, 90, 179, 180, 181, 270, 359]) {
      expect(mirrorAngle(mirrorAngle(angle))).toBeCloseTo(angle, 10);
    }
  });

  it('is an involution on vectors: mirror(mirror(p)) === p', () => {
    const points: Vec2[] = [
      { x: 0, y: 0 },
      { x: 12, y: -4 },
      { x: -30, y: 55 },
      { x: 7.5, y: 20.12 },
    ];
    for (const p of points) {
      expect(mirrorVec(mirrorVec(p))).toEqual(p);
    }
  });

  it('agrees between the angle form and the vector form', () => {
    for (const angle of [12, 88, 214, 307]) {
      const viaAngle = polarToVec(mirrorAngle(angle), 30);
      const viaVector = mirrorVec(polarToVec(angle, 30));
      close(viaAngle.x, viaVector.x, 1e-9);
      close(viaAngle.y, viaVector.y, 1e-9);
    }
  });

  it('maps the off side onto the leg side', () => {
    expect(sideOf(mirrorAngle(88))).toBe('leg');
    expect(sideOf(mirrorAngle(307))).toBe('off');
  });

  it('preserves behind-square-ness', () => {
    for (const angle of [95, 150, 180, 214, 265]) {
      expect(isBehindSquare(mirrorAngle(angle))).toBe(isBehindSquare(angle));
    }
  });
});

describe('inner circle is a capsule, not a circle', () => {
  it('contains points beyond the radius at the pitch midpoint if within the capsule', () => {
    // A circle centred on the pitch midpoint with r=27.43 would NOT contain a
    // point 27m square of the *striker*, because that point is ~28.9m from the
    // midpoint. The capsule does.
    const squareOfStriker: Vec2 = { x: 27, y: 0 };
    expect(Math.hypot(27, PITCH_LENGTH_M / 2)).toBeGreaterThan(INNER_CIRCLE_RADIUS_M);
    expect(isInsideCircle(squareOfStriker)).toBe(true);
  });

  it('holds at the join seam — square of each end and of the middle', () => {
    // Along the whole length of the pitch the half-width is exactly the radius.
    for (const y of [0, 5, PITCH_LENGTH_M / 2, 15, PITCH_LENGTH_M]) {
      expect(isInsideCircle({ x: INNER_CIRCLE_RADIUS_M - 0.01, y })).toBe(true);
      expect(isInsideCircle({ x: INNER_CIRCLE_RADIUS_M + 0.01, y })).toBe(false);
      expect(isInsideCircle({ x: -(INNER_CIRCLE_RADIUS_M - 0.01), y })).toBe(true);
      expect(isInsideCircle({ x: -(INNER_CIRCLE_RADIUS_M + 0.01), y })).toBe(false);
    }
  });

  it('holds at both semicircle poles', () => {
    // Striker's end pole
    expect(isInsideCircle({ x: 0, y: -(INNER_CIRCLE_RADIUS_M - 0.01) })).toBe(true);
    expect(isInsideCircle({ x: 0, y: -(INNER_CIRCLE_RADIUS_M + 0.01) })).toBe(false);
    // Bowler's end pole
    expect(isInsideCircle({ x: 0, y: PITCH_LENGTH_M + INNER_CIRCLE_RADIUS_M - 0.01 })).toBe(true);
    expect(isInsideCircle({ x: 0, y: PITCH_LENGTH_M + INNER_CIRCLE_RADIUS_M + 0.01 })).toBe(false);
  });

  it('is symmetric about the pitch axis', () => {
    const p: Vec2 = { x: 20, y: 8 };
    expect(isInsideCircle(p)).toBe(isInsideCircle(mirrorVec(p)));
  });

  it('is longer than it is wide — the defining capsule property', () => {
    const halfLength = PITCH_LENGTH_M / 2 + INNER_CIRCLE_RADIUS_M;
    expect(halfLength).toBeGreaterThan(INNER_CIRCLE_RADIUS_M);
  });
});

describe('boundary', () => {
  it('returns the straight distance down the ground and square distance across', () => {
    close(boundaryRadiusAt(0, DEFAULT_GROUND), DEFAULT_GROUND.straightM, 1e-9);
    close(boundaryRadiusAt(180, DEFAULT_GROUND), DEFAULT_GROUND.straightM, 1e-9);
    close(boundaryRadiusAt(90, DEFAULT_GROUND), DEFAULT_GROUND.squareM, 1e-9);
    close(boundaryRadiusAt(270, DEFAULT_GROUND), DEFAULT_GROUND.squareM, 1e-9);
  });

  it('is between the two axes everywhere else', () => {
    for (const angle of [20, 45, 130, 200, 315]) {
      const r = boundaryRadiusAt(angle, DEFAULT_GROUND);
      expect(r).toBeGreaterThanOrEqual(Math.min(DEFAULT_GROUND.straightM, DEFAULT_GROUND.squareM));
      expect(r).toBeLessThanOrEqual(Math.max(DEFAULT_GROUND.straightM, DEFAULT_GROUND.squareM));
    }
  });

  it('clamps an outside point back inside', () => {
    const outside: Vec2 = { x: 200, y: 200 };
    expect(isInsideBoundary(outside, DEFAULT_GROUND)).toBe(false);
    expect(isInsideBoundary(clampToBoundary(outside, DEFAULT_GROUND), DEFAULT_GROUND)).toBe(true);
  });

  it('leaves an inside point untouched', () => {
    const inside: Vec2 = { x: 3, y: 10 };
    expect(clampToBoundary(inside, DEFAULT_GROUND)).toEqual(inside);
  });
});

describe('nearestCanonicalPosition', () => {
  it('returns each canonical position exactly when given its own coordinates', () => {
    for (const position of POSITIONS) {
      const exact = polarToVec(position.angleDeg, position.radiusM);
      expect(nearestCanonicalPosition(exact).id).toBe(position.id);
    }
  });

  it('is stable under 0.1m jitter', () => {
    // Deterministic jitter pattern — no Math.random, so failures reproduce.
    const offsets = [
      { x: 0.1, y: 0 },
      { x: -0.1, y: 0 },
      { x: 0, y: 0.1 },
      { x: 0, y: -0.1 },
      { x: 0.07, y: 0.07 },
    ];
    for (const position of POSITIONS) {
      const exact = polarToVec(position.angleDeg, position.radiusM);
      for (const offset of offsets) {
        const jittered = { x: exact.x + offset.x, y: exact.y + offset.y };
        expect(nearestCanonicalPosition(jittered).id).toBe(position.id);
      }
    }
  });

  it('describes an offset rather than snapping the coordinate', () => {
    const cover = POSITIONS.find((p) => p.id === 'deep_cover')!;
    const deeper = polarToVec(cover.angleDeg, cover.radiusM + 5);
    const result = nearestCanonicalPosition(deeper);

    expect(result.id).toBe('deep_cover');
    expect(result.description).toContain('Deep Cover');
    expect(result.description).toContain('deeper');
    expect(result.deltaM).toBeGreaterThan(0);
  });

  it('gives the bare label when the point is essentially on the anchor', () => {
    const point = POSITIONS.find((p) => p.id === 'point')!;
    const result = nearestCanonicalPosition(polarToVec(point.angleDeg, point.radiusM));
    expect(result.description).toBe('Point');
  });
});

describe('worldToScreen', () => {
  const viewport: Viewport = { width: 400, height: 600, spanM: 160 };

  it('round-trips', () => {
    const points: Vec2[] = [
      { x: 0, y: 0 },
      { x: 30, y: 10 },
      { x: -55, y: 66 },
      { x: 12.5, y: -8.25 },
    ];
    for (const p of points) {
      const back = screenToWorld(worldToScreen(p, viewport), viewport);
      close(back.x, p.x, 1e-9);
      close(back.y, p.y, 1e-9);
    }
  });

  it('round-trips when mirrored for a left-hander', () => {
    const mirrored: Viewport = { ...viewport, mirrored: true };
    const p: Vec2 = { x: 24, y: 40 };
    const back = screenToWorld(worldToScreen(p, mirrored), mirrored);
    close(back.x, p.x, 1e-9);
    close(back.y, p.y, 1e-9);
  });

  it('puts the bowler above the striker on screen', () => {
    const striker = worldToScreen({ x: 0, y: 0 }, viewport);
    const bowler = worldToScreen({ x: 0, y: PITCH_LENGTH_M }, viewport);
    expect(bowler.y).toBeLessThan(striker.y);
  });

  it('mirrors the off side to the other half of the screen', () => {
    const rhb = worldToScreen(polarToVec(88, 38), viewport);
    const lhb = worldToScreen(polarToVec(88, 38), { ...viewport, mirrored: true });
    expect(rhb.x).toBeGreaterThan(viewport.width / 2);
    expect(lhb.x).toBeLessThan(viewport.width / 2);
  });
});

describe('distanceFromBat', () => {
  it('measures from the striker stumps at the origin', () => {
    close(distanceFromBat({ x: 3, y: 4 }), 5);
    close(distanceFromBat({ x: 0, y: 0 }), 0);
  });
});

describe('scoring zones align with position names', () => {
  it('puts each eponymous position in its own zone', () => {
    // Regression: with eight equal 45-degree sectors, third man (132 degrees)
    // landed in the `point` zone, so the coherence advisory reported "invites
    // third man - nobody there" with a third man on the field.
    const expected: Record<string, string> = {
      long_off: 'straight_off',
      mid_off: 'straight_off',
      cover: 'cover',
      deep_cover: 'cover',
      extra_cover: 'cover',
      point: 'point',
      deep_point: 'point',
      third_man: 'third_man',
      deep_third: 'third_man',
      fine_leg: 'fine_leg',
      long_leg: 'fine_leg',
      square_leg: 'square_leg',
      deep_square_leg: 'square_leg',
      midwicket: 'midwicket',
      deep_midwicket: 'midwicket',
      cow_corner: 'midwicket',
      long_on: 'straight_on',
      mid_on: 'straight_on',
    };
    for (const [id, zone] of Object.entries(expected)) {
      const position = POSITIONS.find((p) => p.id === id)!;
      expect(zoneOfAngle(position.angleDeg), id).toBe(zone);
    }
  });

  it('tiles the full circle with no gaps or overlaps', () => {
    for (let angle = 0; angle < 360; angle += 1) {
      expect(SCORING_ZONES).toContain(zoneOfAngle(angle));
    }
    const total = SCORING_ZONES.reduce((sum, z) => {
      const [from, to] = ZONE_SECTORS[z];
      return sum + (to - from);
    }, 0);
    expect(total).toBe(360);
  });
});
