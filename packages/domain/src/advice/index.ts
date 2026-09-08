/**
 * Deterministic advice (BUILD.md §0, §6).
 *
 * **No model.** Everything here is computed from the field, the ontology and
 * the relation graph — so it is exact, instant, free, and cannot hallucinate a
 * cricket fact.
 *
 * It deliberately returns **options spanning a risk range, never a single best
 * answer**. §0 is the commitment that shapes everything: there is no single
 * correct answer to a cricket tactical question, and the product never presents
 * itself as an oracle. A function called `bestShot` would be a lie the code
 * tells the user.
 *
 * The `because`/`unless` strings are assembled from facts about the field, not
 * generated prose. `unless` always names a concrete consequence — §10 rule 2
 * applies to any suggestion output, whatever produces it.
 */

import { positionCoversZone, shotScoresToZone } from '../ontology/relations';
import { type PositionId, positionById } from '../ontology/positions';
import {
  SCORING_ZONES,
  SHOT_RISK,
  SHOT_LABELS,
  ZONE_LABELS,
  type ScoringZone,
  type ShotType,
} from '../ontology/shots';
import { isInsideCircle } from '../geometry';
import { type FieldSetting } from '../rules';
import { type ScenarioState } from '../scenario/types';

export type Risk = 'low' | 'medium' | 'high';

/* ------------------------------------------------------------------------- */
/* Reading the field                                                         */
/* ------------------------------------------------------------------------- */

export interface ZoneCover {
  zone: ScoringZone;
  /** Outside the circle — these are what stop a boundary. */
  deep: PositionId[];
  /** Inside the circle and not a close catcher — these save the single. */
  ring: PositionId[];
  /**
   * Slips, gully, bat-pad. Counted separately because they stop **neither** a
   * boundary nor a single: a first slip standing at 13m is in the third-man
   * sector but saves nothing hit to the third-man rope.
   */
  catching: PositionId[];
}

export interface FieldRead {
  /** All eight zones, in clockwise order. */
  cover: ZoneCover[];
  /** Zones with no deep fielder — where the boundary is available. */
  gaps: ScoringZone[];
  /** Zones with nobody at all, deep or ring. */
  open: ScoringZone[];
  /** Zones with two or more genuine fielders. Where the captain is worried. */
  doubled: ScoringZone[];
}

/**
 * Depth matters as much as angle.
 *
 * An earlier version counted any fielder in a sector as covering it, which
 * credited a slip cordon with protecting the third-man boundary and reported a
 * day-five Test field as having no gaps at all. A catching field has enormous
 * gaps — that is the trade it makes.
 */
export const readField = (field: FieldSetting): FieldRead => {
  const cover: ZoneCover[] = SCORING_ZONES.map((zone) => ({
    zone,
    deep: [],
    ring: [],
    catching: [],
  }));

  for (const fielder of field.fielders) {
    if (fielder.role !== 'fielder') continue;
    const zone = positionCoversZone[fielder.positionId];
    const bucket = cover.find((c) => c.zone === zone);
    if (!bucket) continue;

    if (positionById(fielder.positionId).catching) bucket.catching.push(fielder.positionId);
    else if (isInsideCircle(fielder.at)) bucket.ring.push(fielder.positionId);
    else bucket.deep.push(fielder.positionId);
  }

  return {
    cover,
    gaps: cover.filter((c) => c.deep.length === 0).map((c) => c.zone),
    open: cover.filter((c) => c.deep.length === 0 && c.ring.length === 0).map((c) => c.zone),
    doubled: cover.filter((c) => c.deep.length + c.ring.length >= 2).map((c) => c.zone),
  };
};

/**
 * The two zones either side of this one. Zones tile the circle clockwise, so
 * adjacency is just the neighbouring index — and a neighbouring fielder is what
 * actually cuts off a mistimed shot.
 */
export const adjacentZones = (zone: ScoringZone): ScoringZone[] => {
  const i = SCORING_ZONES.indexOf(zone);
  const n = SCORING_ZONES.length;
  return [SCORING_ZONES[(i - 1 + n) % n]!, SCORING_ZONES[(i + 1) % n]!];
};

/* ------------------------------------------------------------------------- */
/* Batter options                                                            */
/* ------------------------------------------------------------------------- */

export interface BatterOption {
  shot: ShotType;
  targetZone: ScoringZone;
  risk: Risk;
  because: string;
  unless: string;
}

const RISK_ORDER: Risk[] = ['low', 'medium', 'high'];

/**
 * What a mistimed shot of this risk actually becomes. Stated as a consequence,
 * never as "unless he executes badly" — §10 rule 2 rejects that explicitly.
 */
const MISCUE: Record<Risk, string> = {
  low: 'played too early it goes straight to him',
  medium: 'not quite middled it goes flat and catchable',
  high: 'off the top edge it goes up rather than away',
};

/** The same miscue, phrased for a gap with nobody nearby at all. */
const MISCUE_ALONE: Record<Risk, string> = {
  low: 'it is still only a single if the shot is early',
  medium: 'a flat mistimed one carries to whoever runs across',
  high: 'a top edge hangs long enough for someone to get under it',
};

const namedFielders = (ids: readonly PositionId[]): string => {
  const names = ids.map((id) => positionById(id).label.toLowerCase());
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

/**
 * Two or three shots that score into a gap in this field, chosen to **span the
 * risk range** rather than to nominate a winner.
 *
 * The user picks. That is the product (§0).
 */
export const batterOptions = (scenario: ScenarioState): BatterOption[] => {
  const read = readField(scenario.field);
  if (read.gaps.length === 0) return [];

  const candidates: BatterOption[] = [];

  for (const shot of Object.keys(shotScoresToZone) as ShotType[]) {
    for (const zone of shotScoresToZone[shot]) {
      if (!read.gaps.includes(zone)) continue;

      const guardedNeighbours = adjacentZones(zone)
        .map((z) => read.cover.find((c) => c.zone === z))
        .filter((c): c is ZoneCover => c !== undefined && c.deep.length > 0);

      const risk = SHOT_RISK[shot];

      const neighbourIds = guardedNeighbours.flatMap((c) => c.deep);
      const verb = neighbourIds.length > 1 ? 'cover' : 'covers';

      const unless =
        neighbourIds.length > 0
          ? `${namedFielders(neighbourIds)} ${verb} the ground next to it — ${MISCUE[risk]}.`
          : `Nobody is protecting that side of the ground, but ${MISCUE_ALONE[risk]}.`;

      candidates.push({
        shot,
        targetZone: zone,
        risk,
        because: `${ZONE_LABELS[zone]} is unguarded on the boundary, and the ${SHOT_LABELS[shot].toLowerCase()} goes there.`,
        unless: unless.charAt(0).toUpperCase() + unless.slice(1),
      });
    }
  }

  // One option per risk level, so the user is choosing between genuinely
  // different outcomes rather than three shades of the same shot (§10 rule 1).
  const spanned: BatterOption[] = [];
  for (const risk of RISK_ORDER) {
    const pick = candidates.find((c) => c.risk === risk);
    if (pick) spanned.push(pick);
  }
  return spanned;
};

/* ------------------------------------------------------------------------- */
/* Bowler options                                                            */
/* ------------------------------------------------------------------------- */

export interface BowlerRead {
  /** Zones this field protects. */
  protected: ScoringZone[];
  /** Zones it does not. Bowl away from these, or move somebody. */
  exposed: ScoringZone[];
  /**
   * Whether the bowler can be trusted with a precision ball. §10 rule 4: below
   * 50, options requiring precision carry high risk.
   */
  precisionViable: boolean;
  executionNote: string;
}

export const bowlerRead = (scenario: ScenarioState): BowlerRead => {
  const read = readField(scenario.field);
  const reliability = scenario.bowler.executionReliability;

  const executionNote =
    reliability < 50
      ? 'Below the level where a yorker is a plan rather than a hope — a miss is a low full toss.'
      : reliability > 75
        ? 'Reliable enough that a yorker or a wide yorker is a real option.'
        : 'Middling execution: the precision balls are available but not guaranteed.';

  return {
    protected: read.cover.filter((c) => c.deep.length > 0).map((c) => c.zone),
    exposed: read.gaps,
    precisionViable: reliability >= 50,
    executionNote,
  };
};
