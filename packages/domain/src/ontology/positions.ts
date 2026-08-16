/**
 * Canonical fielding positions (BUILD.md §6).
 *
 * COORDINATE SYSTEM
 * Top-down. Origin at the **striker's stumps**. `+Y` toward the bowler's end
 * (0°). Angles increase **clockwise** from above. Metres.
 *
 *                        0° (bowler / straight)
 *                          |
 *      270° (leg square) --+-- 90° (off square)
 *                          |
 *                       180° (keeper / behind)
 *
 * Right-hand batter: off side 0°–180°, leg side 180°–360°.
 * Left-hand batter: mirror with `θ' = (360 − θ) mod 360`.
 *
 * **Stored once, in the RHB frame. Mirrored at render.** Never duplicate this
 * table for left-handers — see `geometry/mirror.ts`.
 */

export type Side = 'off' | 'leg' | 'straight';

export interface FieldingPosition {
  id: PositionId;
  label: string;
  /** Phones use this almost always — 'DBSL' not 'Deep Backward Square Leg'. */
  shortLabel: string;
  /** 0–360, RHB frame. */
  angleDeg: number;
  radiusM: number;
  side: Side;
  /** For the two-behind-square-leg rule (§7). */
  behindSquare: boolean;
  catching: boolean;
  aliases: string[];
}

/**
 * Behind square is the half-plane behind the striker's popping crease — the
 * line running through 90° and 270°. Everything between them going via 180°
 * (the keeper) is behind; everything via 0° (the bowler) is in front.
 *
 * Exactly square (90°, 270°) is *not* behind. The leg-side restriction counts
 * fielders behind square, and a fielder square of the wicket does not count.
 */
export const isBehindSquare = (angleDeg: number): boolean => {
  const a = ((angleDeg % 360) + 360) % 360;
  return a > 90 && a < 270;
};

/** Off/leg/straight from an RHB-frame angle. */
export const sideOf = (angleDeg: number): Side => {
  const a = ((angleDeg % 360) + 360) % 360;
  if (a === 0 || a === 180) return 'straight';
  return a < 180 ? 'off' : 'leg';
};

interface PositionSeed {
  id: string;
  label: string;
  shortLabel: string;
  angleDeg: number;
  radiusM: number;
  catching?: boolean;
  aliases?: string[];
}

/**
 * The anchors in §6 are reproduced exactly. The remainder are interpolated in
 * the same frame — §6 names them and leaves the coordinates to be filled in.
 *
 * // VERIFY: only the eighteen anchors given in BUILD.md §6 are authoritative.
 * The rest are plausible placements consistent with those anchors, not measured
 * values, and a coach should sanity-check the diagram at M1's acceptance step.
 * Logged as OQ-003.
 */
const SEEDS: PositionSeed[] = [
  // ---- behind the wicket, close catchers -------------------------------- //
  { id: 'wicketkeeper', label: 'Wicketkeeper', shortLabel: 'WK', angleDeg: 180, radiusM: 14, catching: true, aliases: ['keeper'] },
  { id: 'first_slip', label: 'First Slip', shortLabel: '1S', angleDeg: 172, radiusM: 13, catching: true, aliases: ['slip'] },
  { id: 'second_slip', label: 'Second Slip', shortLabel: '2S', angleDeg: 168, radiusM: 13.5, catching: true },
  { id: 'third_slip', label: 'Third Slip', shortLabel: '3S', angleDeg: 164, radiusM: 14, catching: true },
  { id: 'fourth_slip', label: 'Fourth Slip', shortLabel: '4S', angleDeg: 160, radiusM: 14.5, catching: true },
  { id: 'fly_slip', label: 'Fly Slip', shortLabel: 'FLY', angleDeg: 150, radiusM: 26, catching: true },
  { id: 'gully', label: 'Gully', shortLabel: 'GUL', angleDeg: 108, radiusM: 22, catching: true },
  { id: 'leg_slip', label: 'Leg Slip', shortLabel: 'LS', angleDeg: 192, radiusM: 13, catching: true },
  { id: 'leg_gully', label: 'Leg Gully', shortLabel: 'LG', angleDeg: 200, radiusM: 16, catching: true },

  // ---- bat-pad ----------------------------------------------------------- //
  { id: 'silly_point', label: 'Silly Point', shortLabel: 'SP', angleDeg: 75, radiusM: 8, catching: true },
  { id: 'silly_mid_off', label: 'Silly Mid-off', shortLabel: 'SMO', angleDeg: 30, radiusM: 9, catching: true },
  { id: 'silly_mid_on', label: 'Silly Mid-on', shortLabel: 'SMN', angleDeg: 330, radiusM: 9, catching: true },
  { id: 'short_leg', label: 'Short Leg', shortLabel: 'SL', angleDeg: 285, radiusM: 8, catching: true, aliases: ['bat pad'] },

  // ---- off-side ring ----------------------------------------------------- //
  { id: 'backward_point', label: 'Backward Point', shortLabel: 'BP', angleDeg: 100, radiusM: 38 },
  { id: 'point', label: 'Point', shortLabel: 'PT', angleDeg: 88, radiusM: 38 },
  { id: 'cover_point', label: 'Cover Point', shortLabel: 'CP', angleDeg: 70, radiusM: 38 },
  { id: 'cover', label: 'Cover', shortLabel: 'COV', angleDeg: 55, radiusM: 38 },
  { id: 'extra_cover', label: 'Extra Cover', shortLabel: 'XC', angleDeg: 42, radiusM: 38 },
  { id: 'short_cover', label: 'Short Cover', shortLabel: 'SCV', angleDeg: 55, radiusM: 22 },
  { id: 'short_extra_cover', label: 'Short Extra Cover', shortLabel: 'SXC', angleDeg: 42, radiusM: 22 },
  { id: 'mid_off', label: 'Mid-off', shortLabel: 'MO', angleDeg: 25, radiusM: 33 },
  { id: 'short_mid_off', label: 'Short Mid-off', shortLabel: 'SMO2', angleDeg: 25, radiusM: 22 },
  { id: 'short_third', label: 'Short Third', shortLabel: 'S3', angleDeg: 125, radiusM: 30 },

  // ---- straight ---------------------------------------------------------- //
  { id: 'straight_hit', label: 'Straight Hit', shortLabel: 'STR', angleDeg: 0, radiusM: 70 },

  // ---- leg-side ring ----------------------------------------------------- //
  { id: 'short_fine_leg', label: 'Short Fine Leg', shortLabel: 'SFL', angleDeg: 214, radiusM: 26 },
  { id: 'backward_square_leg', label: 'Backward Square Leg', shortLabel: 'BSL', angleDeg: 250, radiusM: 38 },
  { id: 'square_leg', label: 'Square Leg', shortLabel: 'SQL', angleDeg: 270, radiusM: 38 },
  { id: 'short_midwicket', label: 'Short Midwicket', shortLabel: 'SMW', angleDeg: 307, radiusM: 22 },
  { id: 'midwicket', label: 'Midwicket', shortLabel: 'MW', angleDeg: 307, radiusM: 38 },
  { id: 'mid_on', label: 'Mid-on', shortLabel: 'MN', angleDeg: 335, radiusM: 33 },
  { id: 'short_mid_on', label: 'Short Mid-on', shortLabel: 'SMN2', angleDeg: 335, radiusM: 22 },

  // ---- off-side boundary ------------------------------------------------- //
  { id: 'deep_third', label: 'Deep Third', shortLabel: 'D3', angleDeg: 140, radiusM: 68, aliases: ['fine third'] },
  { id: 'third_man', label: 'Third Man', shortLabel: 'TM', angleDeg: 132, radiusM: 66, aliases: ['third'] },
  { id: 'deep_backward_point', label: 'Deep Backward Point', shortLabel: 'DBP', angleDeg: 100, radiusM: 66 },
  { id: 'deep_point', label: 'Deep Point', shortLabel: 'DP', angleDeg: 88, radiusM: 66 },
  { id: 'deep_cover_point', label: 'Deep Cover Point', shortLabel: 'DCP', angleDeg: 70, radiusM: 66 },
  { id: 'deep_cover', label: 'Deep Cover', shortLabel: 'DC', angleDeg: 55, radiusM: 66, aliases: ['sweeper cover'] },
  { id: 'deep_extra_cover', label: 'Deep Extra Cover', shortLabel: 'DXC', angleDeg: 42, radiusM: 66 },
  { id: 'long_off', label: 'Long Off', shortLabel: 'LO', angleDeg: 20, radiusM: 68 },

  // ---- leg-side boundary -------------------------------------------------- //
  { id: 'long_on', label: 'Long On', shortLabel: 'LN', angleDeg: 340, radiusM: 68 },
  { id: 'cow_corner', label: 'Deep Midwicket (Cow Corner)', shortLabel: 'COW', angleDeg: 320, radiusM: 66, aliases: ['cow corner'] },
  { id: 'deep_midwicket', label: 'Deep Midwicket', shortLabel: 'DMW', angleDeg: 307, radiusM: 66 },
  { id: 'deep_square_leg', label: 'Deep Square Leg', shortLabel: 'DSL', angleDeg: 270, radiusM: 66 },
  { id: 'deep_backward_square_leg', label: 'Deep Backward Square Leg', shortLabel: 'DBSL', angleDeg: 250, radiusM: 66 },
  { id: 'fine_leg', label: 'Fine Leg', shortLabel: 'FL', angleDeg: 214, radiusM: 66 },
  { id: 'long_leg', label: 'Long Leg', shortLabel: 'LL', angleDeg: 200, radiusM: 68 },
];

export const POSITIONS: readonly FieldingPosition[] = SEEDS.map((seed) => ({
  id: seed.id as PositionId,
  label: seed.label,
  shortLabel: seed.shortLabel,
  angleDeg: seed.angleDeg,
  radiusM: seed.radiusM,
  side: sideOf(seed.angleDeg),
  behindSquare: isBehindSquare(seed.angleDeg),
  catching: seed.catching ?? false,
  aliases: seed.aliases ?? [],
}));

/**
 * The id union. Derived from the table so the type and the data can never drift
 * apart — adding a row to SEEDS widens PositionId automatically.
 */
export type PositionId = (typeof SEEDS)[number]['id'];

const BY_ID = new Map<string, FieldingPosition>(POSITIONS.map((p) => [p.id, p]));

export const positionById = (id: PositionId): FieldingPosition => {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown fielding position: ${id}`);
  return found;
};

export const isPositionId = (value: string): value is PositionId => BY_ID.has(value);

/** Resolves 'cow corner', 'keeper', 'fine third' to a canonical id. */
export const positionByAlias = (text: string): FieldingPosition | undefined => {
  const needle = text.trim().toLowerCase();
  return POSITIONS.find(
    (p) =>
      p.id === needle ||
      p.label.toLowerCase() === needle ||
      p.shortLabel.toLowerCase() === needle ||
      p.aliases.some((a) => a.toLowerCase() === needle),
  );
};
