import { POSITIONS, type PositionId } from '@cricket/domain';

/**
 * Lookup maps built once from the ontology.
 *
 * §4: every domain concept comes from `packages/domain/ontology`. These are
 * derived from `POSITIONS`, never hand-written, so a new position cannot appear
 * on the ground without a label.
 */
export const POSITION_SHORT: Record<PositionId, string> = Object.fromEntries(
  POSITIONS.map((p) => [p.id, p.shortLabel]),
) as Record<PositionId, string>;

export const POSITION_LABEL: Record<PositionId, string> = Object.fromEntries(
  POSITIONS.map((p) => [p.id, p.label]),
) as Record<PositionId, string>;
