/**
 * The typed relation graph (BUILD.md §6).
 *
 * Composed, these answer *does the field protect the zones this delivery
 * invites?* A 6–3 off-side field with a leg-stump yorker is incoherent, and
 * code can say so with no model involved.
 *
 * §6 asks for a light version in v0.1 as a **non-blocking advisory chip**.
 */

import { type Length, type Line } from './deliveries';
import { POSITIONS, type PositionId } from './positions';
import { type ScoringZone, type ShotType, zoneOfAngle } from './shots';

/**
 * Which zone each fielding position covers. Derived from its angle rather than
 * hand-listed — a position at 307° covers midwicket by construction, and the
 * two can never drift apart.
 */
export const positionCoversZone: Record<PositionId, ScoringZone> = Object.fromEntries(
  POSITIONS.map((p) => [p.id, zoneOfAngle(p.angleDeg)]),
) as Record<PositionId, ScoringZone>;

/** Every position currently sitting in a given zone. */
export const positionsInZone = (zone: ScoringZone): PositionId[] =>
  POSITIONS.filter((p) => positionCoversZone[p.id] === zone).map((p) => p.id);

type DeliveryKey = `${Length}:${Line}`;

export const deliveryKey = (length: Length, line: Line): DeliveryKey => `${length}:${line}`;

/**
 * Which shots a length/line invites. Not exhaustive — it names the shots a
 * competent batter is *most likely* to play, which is what the coherence check
 * needs.
 *
 * // VERIFY: this mapping is reasoned, not observed. Phase 2 replaces it with
 * clusters from WATCH_NOTES.md (§11). Logged as OQ-004.
 */
export const deliveryInvitesShot: Partial<Record<DeliveryKey, readonly ShotType[]>> = {
  'yorker:off_stump': ['defend', 'flick'],
  'yorker:middle': ['defend', 'flick'],
  'yorker:leg_stump': ['flick', 'glance'],
  'yorker:wide_off': ['defend', 'late_cut'],
  'full:off_stump': ['cover_drive', 'straight_drive', 'defend'],
  'full:fourth_stump': ['cover_drive', 'square_drive'],
  'full:fifth_stump': ['cover_drive', 'square_drive', 'leave'],
  'full:middle': ['straight_drive', 'on_drive', 'flick'],
  'full:leg_stump': ['on_drive', 'flick', 'loft_leg'],
  'full:down_leg': ['glance', 'flick', 'sweep'],
  'full_toss:middle': ['loft_straight', 'slog', 'flick'],
  'full_toss:down_leg': ['flick', 'slog_sweep'],
  'good:off_stump': ['defend', 'cover_drive'],
  'good:fourth_stump': ['defend', 'leave', 'square_drive'],
  'good:fifth_stump': ['leave', 'cut', 'square_drive'],
  'good:middle': ['defend', 'flick', 'on_drive'],
  'good:leg_stump': ['flick', 'glance', 'sweep'],
  'back_of_length:off_stump': ['defend', 'cut', 'pull'],
  'back_of_length:fifth_stump': ['cut', 'late_cut', 'leave'],
  'back_of_length:middle': ['pull', 'defend'],
  'back_of_length:leg_stump': ['pull', 'flick'],
  'short:off_stump': ['pull', 'cut', 'upper_cut'],
  'short:fifth_stump': ['cut', 'upper_cut', 'leave'],
  'short:middle': ['pull', 'hook'],
  'short:leg_stump': ['pull', 'hook', 'ramp'],
  'short:down_leg': ['hook', 'ramp', 'glance'],
  'bouncer:middle': ['hook', 'ramp', 'leave'],
  'bouncer:off_stump': ['upper_cut', 'leave', 'pull'],
  'bouncer:leg_stump': ['hook', 'ramp'],
};

/** Where each shot scores. */
export const shotScoresToZone: Record<ShotType, readonly ScoringZone[]> = {
  leave: [],
  defend: [],
  straight_drive: ['straight_off', 'straight_on'],
  cover_drive: ['cover'],
  on_drive: ['straight_on'],
  square_drive: ['cover', 'point'],
  cut: ['point'],
  late_cut: ['third_man'],
  upper_cut: ['third_man'],
  pull: ['square_leg', 'midwicket'],
  hook: ['fine_leg', 'square_leg'],
  sweep: ['square_leg', 'fine_leg'],
  slog_sweep: ['midwicket', 'square_leg'],
  reverse_sweep: ['point', 'third_man'],
  glance: ['fine_leg'],
  flick: ['midwicket', 'square_leg'],
  ramp: ['third_man', 'fine_leg'],
  scoop: ['fine_leg', 'straight_on'],
  loft_straight: ['straight_off', 'straight_on'],
  loft_leg: ['midwicket'],
  slog: ['midwicket', 'straight_on'],
};

/** The zones a given delivery is most likely to be scored into. */
export const zonesInvitedBy = (length: Length, line: Line): ScoringZone[] => {
  const shots = deliveryInvitesShot[deliveryKey(length, line)] ?? [];
  const zones = new Set<ScoringZone>();
  for (const shot of shots) {
    for (const zone of shotScoresToZone[shot]) zones.add(zone);
  }
  return [...zones];
};

export interface CoherenceGap {
  zone: ScoringZone;
  /** The shots that would score there off this ball. */
  via: ShotType[];
}

/**
 * Non-blocking advisory: which invited zones this field leaves unprotected.
 *
 * An empty array means the field covers everything the ball invites. It never
 * blocks the user — §7's principle applies here too: tell them what is
 * incoherent and why, do not prevent it.
 */
export const coherenceGaps = (
  length: Length,
  line: Line,
  fieldPositions: readonly PositionId[],
): CoherenceGap[] => {
  const covered = new Set(fieldPositions.map((id) => positionCoversZone[id]));
  const shots = deliveryInvitesShot[deliveryKey(length, line)] ?? [];

  const byZone = new Map<ScoringZone, ShotType[]>();
  for (const shot of shots) {
    for (const zone of shotScoresToZone[shot]) {
      if (covered.has(zone)) continue;
      byZone.set(zone, [...(byZone.get(zone) ?? []), shot]);
    }
  }

  return [...byZone].map(([zone, via]) => ({ zone, via }));
};
