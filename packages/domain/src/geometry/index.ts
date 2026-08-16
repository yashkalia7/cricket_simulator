/**
 * Ground geometry (BUILD.md §6).
 *
 * Pure functions, shared by every renderer so both apps agree pixel-for-pixel.
 * Metres throughout; screen conversion happens only in `worldToScreen`.
 */

import { POSITIONS, type PositionId } from '../ontology/positions';

export interface Vec2 {
  x: number;
  y: number;
}

/** Distance between the two sets of stumps. 22 yards. */
export const PITCH_LENGTH_M = 20.12;

/**
 * Inner-circle radius. 30 yards.
 *
 * // VERIFY: whether the current playing conditions state 30 yards or 27.43m,
 * and which the app should round to. OQ-101 in OPEN_QUESTIONS.md.
 */
export const INNER_CIRCLE_RADIUS_M = 27.43;

/** Bowler's stumps, in the striker-origin frame. */
export const BOWLER_END: Vec2 = { x: 0, y: PITCH_LENGTH_M };

export interface GroundDimensions {
  /** Boundary distance straight down the ground. */
  straightM: number;
  /** Boundary distance square of the wicket. */
  squareM: number;
}

export const DEFAULT_GROUND: GroundDimensions = { straightM: 70, squareM: 64 };

/* ------------------------------------------------------------------------- */
/* Polar <-> cartesian                                                       */
/* ------------------------------------------------------------------------- */

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export const normaliseDeg = (deg: number): number => ((deg % 360) + 360) % 360;

/**
 * Angles increase **clockwise** from 0° = `+Y` (toward the bowler).
 *
 * Clockwise-from-+Y means x = r·sin θ and y = r·cos θ — not the usual
 * counter-clockwise-from-+X convention. Getting this backwards mirrors the
 * entire field, which looks plausible and is completely wrong.
 */
export const polarToVec = (angleDeg: number, radiusM: number): Vec2 => ({
  x: radiusM * Math.sin(toRad(angleDeg)),
  y: radiusM * Math.cos(toRad(angleDeg)),
});

export const vecToPolar = (p: Vec2): { angleDeg: number; radiusM: number } => ({
  angleDeg: normaliseDeg(toDeg(Math.atan2(p.x, p.y))),
  radiusM: Math.hypot(p.x, p.y),
});

/* ------------------------------------------------------------------------- */
/* Handedness mirror                                                         */
/* ------------------------------------------------------------------------- */

/**
 * Left-hand batter mirror: `θ' = (360 − θ) mod 360`.
 *
 * Positions are **stored once** in the RHB frame and mirrored at render (§6).
 * Never duplicate the table.
 */
export const mirrorAngle = (angleDeg: number): number => normaliseDeg(360 - angleDeg);

/** The same mirror in cartesian terms — negate x, keep y. */
export const mirrorVec = (p: Vec2): Vec2 => ({ x: -p.x, y: p.y });

/* ------------------------------------------------------------------------- */
/* Inner circle — a capsule, not a circle                                    */
/* ------------------------------------------------------------------------- */

/**
 * The inner circle is **two semicircles of radius 27.43m centred on the middle
 * stump at each end, joined by lines parallel to the pitch**. A capsule (a
 * stadium shape), *not* a circle centred on the pitch midpoint.
 *
 * §6 calls this the most commonly wrong thing in cricket apps, so the test
 * suite checks the join seam and both poles explicitly.
 *
 * Implemented as distance-to-segment: a point is inside iff its perpendicular
 * distance to the segment between the two sets of stumps is within the radius.
 */
export const distanceToPitchAxis = (p: Vec2): number => {
  // Segment from (0,0) to (0, PITCH_LENGTH_M) — clamp t to the segment.
  const t = Math.max(0, Math.min(1, p.y / PITCH_LENGTH_M));
  const closest: Vec2 = { x: 0, y: t * PITCH_LENGTH_M };
  return Math.hypot(p.x - closest.x, p.y - closest.y);
};

export const isInsideCircle = (
  p: Vec2,
  radiusM: number = INNER_CIRCLE_RADIUS_M,
): boolean => distanceToPitchAxis(p) <= radiusM;

/** Distance from the striker's stumps — the origin. */
export const distanceFromBat = (p: Vec2): number => Math.hypot(p.x, p.y);

/* ------------------------------------------------------------------------- */
/* Boundary — an ellipse                                                     */
/* ------------------------------------------------------------------------- */

/**
 * Boundary radius at a given angle, for an ellipse with semi-axis `straightM`
 * along the pitch and `squareM` across it.
 *
 * Ground size is a first-class scenario parameter — it materially changes
 * correct tactics (§6), so this is never a constant.
 */
export const boundaryRadiusAt = (angleDeg: number, ground: GroundDimensions): number => {
  const t = toRad(angleDeg);
  const sin = Math.sin(t); // across the pitch  -> squareM
  const cos = Math.cos(t); // along the pitch   -> straightM
  return (
    (ground.straightM * ground.squareM) /
    Math.hypot(ground.squareM * cos, ground.straightM * sin)
  );
};

/**
 * The boundary is measured from the *centre of the pitch*, not the striker's
 * stumps, so the origin sits half a pitch short of centre.
 */
export const PITCH_CENTRE: Vec2 = { x: 0, y: PITCH_LENGTH_M / 2 };

export const isInsideBoundary = (p: Vec2, ground: GroundDimensions): boolean => {
  const dx = p.x - PITCH_CENTRE.x;
  const dy = p.y - PITCH_CENTRE.y;
  return (dx / ground.squareM) ** 2 + (dy / ground.straightM) ** 2 <= 1;
};

/** Pulls a point back inside the boundary along the ray from the pitch centre. */
export const clampToBoundary = (p: Vec2, ground: GroundDimensions): Vec2 => {
  if (isInsideBoundary(p, ground)) return p;
  const dx = p.x - PITCH_CENTRE.x;
  const dy = p.y - PITCH_CENTRE.y;
  const scale = 1 / Math.hypot(dx / ground.squareM, dy / ground.straightM);
  return { x: PITCH_CENTRE.x + dx * scale * 0.985, y: PITCH_CENTRE.y + dy * scale * 0.985 };
};

/* ------------------------------------------------------------------------- */
/* Nearest canonical position                                                */
/* ------------------------------------------------------------------------- */

export interface NearestPosition {
  id: PositionId;
  deltaM: number;
  /** Human-readable offset: 'Deep Cover +4m finer'. */
  description: string;
}

/**
 * Snaps to the **name**, not the coordinate (§6).
 *
 * A user drags freely and still gets a real label. Display "Deep Cover +4m
 * finer", never force the marker onto a preset dot — on a phone this matters
 * more than on desktop, because imprecise fingers still produce meaningful
 * labels.
 */
export const nearestCanonicalPosition = (p: Vec2): NearestPosition => {
  const { angleDeg, radiusM } = vecToPolar(p);

  let best = POSITIONS[0]!;
  let bestDistance = Infinity;

  for (const candidate of POSITIONS) {
    const c = polarToVec(candidate.angleDeg, candidate.radiusM);
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = candidate;
    }
  }

  // Angular difference, signed, in (-180, 180].
  let angleDelta = angleDeg - best.angleDeg;
  if (angleDelta > 180) angleDelta -= 360;
  if (angleDelta <= -180) angleDelta += 360;

  const radial = radiusM - best.radiusM;
  const parts: string[] = [];

  if (Math.abs(radial) >= 2) {
    parts.push(`${radial > 0 ? '+' : ''}${Math.round(radial)}m ${radial > 0 ? 'deeper' : 'squarer'}`);
  }
  if (Math.abs(angleDelta) >= 4) {
    // Increasing angle on the off side runs toward third man (finer); on the
    // leg side it runs toward midwicket (straighter). "Finer" always means
    // toward the keeper.
    const finer = best.side === 'leg' ? angleDelta < 0 : angleDelta > 0;
    parts.push(finer ? 'finer' : 'straighter');
  }

  return {
    id: best.id,
    deltaM: bestDistance,
    description: parts.length ? `${best.label} ${parts.join(' ')}` : best.label,
  };
};

/* ------------------------------------------------------------------------- */
/* World -> screen                                                           */
/* ------------------------------------------------------------------------- */

export interface Viewport {
  width: number;
  height: number;
  /** Metres visible across the shorter screen axis. */
  spanM: number;
  /** Handedness of the striker — mirrors the whole field when 'LHB'. */
  mirrored?: boolean;
}

/**
 * Pure world→screen projection. Lives in domain so both renderers agree
 * pixel-for-pixel (§6).
 *
 * Screen `y` grows downward, world `+Y` runs toward the bowler, so the sign
 * flips: the bowler's end appears above the striker.
 */
export const worldToScreen = (p: Vec2, viewport: Viewport): Vec2 => {
  const scale = Math.min(viewport.width, viewport.height) / viewport.spanM;
  const world = viewport.mirrored ? mirrorVec(p) : p;
  return {
    x: viewport.width / 2 + world.x * scale,
    y: viewport.height / 2 - (world.y - PITCH_CENTRE.y) * scale,
  };
};

/** Exact inverse of `worldToScreen` — used to turn a drag into a position. */
export const screenToWorld = (s: Vec2, viewport: Viewport): Vec2 => {
  const scale = Math.min(viewport.width, viewport.height) / viewport.spanM;
  const world: Vec2 = {
    x: (s.x - viewport.width / 2) / scale,
    y: (viewport.height / 2 - s.y) / scale + PITCH_CENTRE.y,
  };
  return viewport.mirrored ? mirrorVec(world) : world;
};
