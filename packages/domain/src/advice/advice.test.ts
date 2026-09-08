import { describe, expect, it } from 'vitest';

import { polarToVec } from '../geometry';
import { positionById } from '../ontology/positions';
import { PRESETS, presetById } from '../scenario/presets';
import { SCORING_ZONES } from '../ontology/shots';
import { adjacentZones, batterOptions, bowlerRead, readField } from './index';

const superOver = presetById('super_over')!;
const dayFive = presetById('day_five_rough')!;
const tailender = presetById('tailender_on_strike')!;

describe('readField', () => {
  it('accounts for every zone exactly once', () => {
    const read = readField(superOver.field);
    expect(read.cover.map((c) => c.zone)).toEqual([...SCORING_ZONES]);
  });

  it('excludes the keeper — he saves nothing square', () => {
    const read = readField(superOver.field);
    const everyone = read.cover.flatMap((c) => [...c.deep, ...c.ring, ...c.catching]);
    expect(everyone).not.toContain('wicketkeeper');
    // Nine fielders plus a keeper; only the nine are placed in zones.
    expect(everyone).toHaveLength(9);
  });

  it('finds the boundary gaps in a death field', () => {
    // Five out: long off, long on, deep midwicket, deep square leg, third man.
    // So the rope is unguarded through cover, point and fine leg.
    const read = readField(superOver.field);
    expect(read.gaps).toEqual(['cover', 'point', 'fine_leg']);
  });

  it('counts a slip as neither deep nor ring', () => {
    // A day-five catching field looks crowded but protects almost no boundary.
    const read = readField(dayFive.field);
    const slips = read.cover.flatMap((c) => c.catching);
    expect(slips).toContain('first_slip');
    expect(slips).toContain('silly_point');
    // Only square leg and deep midwicket are actually out there.
    expect(read.gaps.length).toBeGreaterThanOrEqual(5);
  });

  it('reports zones with more than one genuine fielder', () => {
    const read = readField(superOver.field);
    expect(read.doubled).toContain('straight_off');
    expect(read.doubled).toContain('midwicket');
  });
});

describe('adjacentZones', () => {
  it('returns the two neighbours, wrapping the circle', () => {
    expect(adjacentZones('point')).toEqual(['cover', 'third_man']);
    expect(adjacentZones('straight_off')).toEqual(['straight_on', 'cover']);
    expect(adjacentZones('straight_on')).toEqual(['midwicket', 'straight_off']);
  });

  it('is symmetric — if a is next to b, b is next to a', () => {
    for (const zone of SCORING_ZONES) {
      for (const neighbour of adjacentZones(zone)) {
        expect(adjacentZones(neighbour)).toContain(zone);
      }
    }
  });
});

describe('batterOptions', () => {
  it('offers options that span the risk range, never one answer', () => {
    const options = batterOptions(superOver);
    expect(options.length).toBeGreaterThanOrEqual(2);
    // Genuinely different outcomes, not three shades of the same shot.
    expect(new Set(options.map((o) => o.risk)).size).toBe(options.length);
  });

  it('only ever targets an undefended zone', () => {
    for (const preset of PRESETS) {
      const gaps = readField(preset.field).gaps;
      for (const option of batterOptions(preset)) {
        expect(gaps, `${preset.id}/${option.shot}`).toContain(option.targetZone);
      }
    }
  });

  it('gives every option a specific consequence, never "executes badly"', () => {
    for (const preset of PRESETS) {
      for (const option of batterOptions(preset)) {
        expect(option.unless.split(/\s+/).length).toBeGreaterThanOrEqual(8);
        expect(option.unless.toLowerCase()).not.toContain('execut');
        expect(option.because).toContain('unguarded');
      }
    }
  });

  it('states no numbers — the anti-slop rule applies to computed text too', () => {
    for (const preset of PRESETS) {
      for (const option of batterOptions(preset)) {
        expect(`${option.because} ${option.unless}`).not.toMatch(/\d/);
      }
    }
  });

  it('names the fielder next door when there is one', () => {
    // Day five has a packed off side; a gap next to a guarded zone should say so.
    const options = batterOptions(dayFive);
    expect(options.length).toBeGreaterThan(0);
    expect(options.some((o) => /covers the ground next to it/.test(o.unless))).toBe(true);
  });

  it('returns nothing when a sweeper guards every boundary', () => {
    const covered = {
      ...superOver,
      field: {
        fielders: SCORING_ZONES.map((zone, i) => ({
          id: `z${i}`,
          // One canonical position sitting in each zone.
          positionId: (
            {
              straight_off: 'long_off',
              cover: 'deep_cover',
              point: 'deep_point',
              third_man: 'third_man',
              fine_leg: 'fine_leg',
              square_leg: 'deep_square_leg',
              midwicket: 'deep_midwicket',
              straight_on: 'long_on',
            } as const
          )[zone],
          at: (() => {
            const id = (
              {
                straight_off: 'long_off',
                cover: 'deep_cover',
                point: 'deep_point',
                third_man: 'third_man',
                fine_leg: 'fine_leg',
                square_leg: 'deep_square_leg',
                midwicket: 'deep_midwicket',
                straight_on: 'long_on',
              } as const
            )[zone];
            const p = positionById(id);
            return polarToVec(p.angleDeg, p.radiusM);
          })(),
          role: 'fielder' as const,
        })),
      },
    };
    expect(readField(covered.field).gaps).toEqual([]);
    expect(batterOptions(covered)).toEqual([]);
  });
});

describe('bowlerRead', () => {
  it('splits the field into protected and exposed, covering all zones', () => {
    const read = bowlerRead(superOver);
    expect([...read.protected, ...read.exposed].sort()).toEqual([...SCORING_ZONES].sort());
  });

  it('flags a bowler who cannot be trusted with a yorker', () => {
    // The tailender scenario has a bowler on 45 reliability.
    expect(tailender.bowler.executionReliability).toBeLessThan(50);
    const read = bowlerRead(tailender);
    expect(read.precisionViable).toBe(false);
    expect(read.executionNote).toContain('low full toss');
  });

  it('opens up the precision balls for a reliable bowler', () => {
    const read = bowlerRead(superOver);
    expect(read.precisionViable).toBe(true);
  });
});
