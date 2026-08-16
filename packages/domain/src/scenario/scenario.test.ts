import { describe, expect, it } from 'vitest';

import { isInsideBoundary } from '../geometry';
import { evaluateField } from '../rules';
import {
  canonicalJson,
  decodeScenario,
  encodeScenario,
  hashScenario,
  validateScenario,
} from './codec';
import {
  ballsLeft,
  chaseLabel,
  currentRate,
  deliveryGlyph,
  overBallLabel,
  phase,
  pressureIndex,
  requiredRate,
  runsRequired,
  scoreLabel,
  wicketsInHand,
} from './derive';
import { PRESETS, PRESET_PROMPTS, presetById } from './presets';

const superOver = presetById('super_over')!;
const chase = presetById('death_chase')!;
const dayFive = presetById('day_five_rough')!;

describe('presets', () => {
  it('ships the six named in BUILD.md §3', () => {
    expect(PRESETS).toHaveLength(6);
    expect(PRESETS.map((p) => p.id).sort()).toEqual([
      'day_five_rough',
      'death_chase',
      'new_ball_lights',
      'powerplay_left_hander',
      'super_over',
      'tailender_on_strike',
    ]);
  });

  it('validates every preset against the schema', () => {
    for (const preset of PRESETS) {
      const result = validateScenario(preset);
      if (!result.ok) throw new Error(`${preset.id}: ${result.issues.join(', ')}`);
      expect(result.ok).toBe(true);
    }
  });

  it('gives every preset a real tactical question', () => {
    for (const preset of PRESETS) {
      const prompt = PRESET_PROMPTS[preset.id];
      expect(prompt, preset.id).toBeTruthy();
      expect(prompt!.length).toBeGreaterThan(20);
    }
  });

  it('keeps the Over Tape within twelve deliveries', () => {
    for (const preset of PRESETS) {
      expect(preset.lastDeliveries.length).toBeLessThanOrEqual(12);
    }
  });

  it('gives every preset a legal field', () => {
    // A preset that ships with an illegal field would teach the wrong thing on
    // first launch.
    for (const preset of PRESETS) {
      const violations = evaluateField(
        {
          format: preset.format,
          over: preset.over,
          strikerHandedness: preset.striker.handedness,
          superOver: preset.superOver,
        },
        preset.field,
      );
      expect(violations.map((v) => v.message), preset.id).toEqual([]);
    }
  });

  it('never places a fielder outside the boundary', () => {
    // Regression: the canonical anchors are generic (deep square leg at 66m),
    // but `death_chase` has a 58m square boundary — so DSL and third man were
    // rendered standing off the field. Found by looking at the ground, not by a
    // unit test, which is why this one exists.
    for (const preset of PRESETS) {
      for (const fielder of preset.field.fielders) {
        expect(
          isInsideBoundary(fielder.at, preset.ground),
          `${preset.id}: ${fielder.positionId}`,
        ).toBe(true);
      }
    }
  });

  it('always includes a keeper, excluded from circle counts', () => {
    for (const preset of PRESETS) {
      const keepers = preset.field.fielders.filter((f) => f.role === 'keeper');
      expect(keepers, preset.id).toHaveLength(1);
    }
  });
});

describe('derived values', () => {
  it('never stores what it can compute', () => {
    // The type has no such keys; this asserts the data does not sneak them in.
    for (const preset of PRESETS) {
      const keys = Object.keys(preset);
      for (const derived of ['phase', 'requiredRate', 'currentRate', 'pressureIndex', 'ballsLeft']) {
        expect(keys, preset.id).not.toContain(derived);
      }
    }
  });

  it('computes the chase equation', () => {
    expect(runsRequired(chase)).toBe(23);
    expect(ballsLeft(chase)).toBe(8);
    expect(chaseLabel(chase)).toBe('23 needed off 8');
  });

  it('returns null for a chase equation when not chasing', () => {
    const first = presetById('powerplay_left_hander')!;
    expect(runsRequired(first)).toBeNull();
    expect(chaseLabel(first)).toBeNull();
    expect(requiredRate(first)).toBeNull();
  });

  it('derives phase from format and overs', () => {
    expect(phase(presetById('powerplay_left_hander')!)).toBe('powerplay');
    expect(phase(chase)).toBe('death');
    expect(phase(dayFive)).toBe('session');
    expect(phase(presetById('new_ball_lights')!)).toBe('powerplay');
  });

  it('calls a Super Over the death, not a powerplay', () => {
    // over 0 reads as a T20 powerplay unless superOver is honoured — the same
    // trap as OQ-111, and it was visible in the HUD as "POWERPLAY".
    expect(superOver.over).toBe(0);
    expect(phase(superOver)).toBe('death');
  });

  it('computes rates', () => {
    expect(currentRate(chase)).toBeCloseTo((148 / 106) * 6, 6);
    expect(requiredRate(chase)).toBeCloseTo((23 / 8) * 6, 6);
  });

  it('reports wickets in hand', () => {
    expect(wicketsInHand(chase)).toBe(4);
    expect(wicketsInHand(superOver)).toBe(10);
  });

  it('scores pressure higher in a collapsing chase than a first-innings powerplay', () => {
    const calm = pressureIndex(presetById('powerplay_left_hander')!);
    const tense = pressureIndex(presetById('tailender_on_strike')!);
    expect(tense).toBeGreaterThan(calm);
    for (const preset of PRESETS) {
      const p = pressureIndex(preset);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });

  it('formats the HUD labels', () => {
    expect(scoreLabel(chase)).toBe('148/6');
    expect(overBallLabel(chase)).toBe('17.4');
  });

  it('maps deliveries to Over Tape glyphs', () => {
    expect(deliveryGlyph({ runs: 0, wicket: false })).toBe('•');
    expect(deliveryGlyph({ runs: 4, wicket: false })).toBe('4');
    expect(deliveryGlyph({ runs: 0, wicket: true })).toBe('W');
    expect(deliveryGlyph({ runs: 1, wicket: false, extra: 'wide' })).toBe('wd');
  });
});

describe('codec', () => {
  it('round-trips every preset through encode/decode', () => {
    for (const preset of PRESETS) {
      const decoded = decodeScenario(encodeScenario(preset));
      if (!decoded.ok) throw new Error(`${preset.id}: ${decoded.issues.join(', ')}`);
      expect(decoded.scenario, preset.id).toEqual(preset);
    }
  });

  it('produces URL-safe tokens', () => {
    for (const preset of PRESETS) {
      expect(encodeScenario(preset)).toMatch(/^[A-Za-z0-9\-_]+$/);
    }
  });

  it('rejects a corrupted token rather than throwing', () => {
    const result = decodeScenario('not-a-real-token');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.length).toBeGreaterThan(0);
  });

  it('rejects a structurally invalid scenario with a readable path', () => {
    const broken = { ...superOver, wicketsLost: 47 };
    const result = validateScenario(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.join(' ')).toContain('wicketsLost');
  });

  it('hashes stably regardless of key order', () => {
    const shuffled = Object.fromEntries(Object.entries(superOver).reverse());
    expect(hashScenario(shuffled as typeof superOver)).toBe(hashScenario(superOver));
  });

  it('ignores id and title when hashing — the same situation is the same situation', () => {
    const renamed = { ...superOver, id: 'other', title: 'Something else' };
    expect(hashScenario(renamed)).toBe(hashScenario(superOver));
  });

  it('changes the hash when the tactical state changes', () => {
    expect(hashScenario({ ...superOver, score: 9 })).not.toBe(hashScenario(superOver));
  });

  it('sorts keys canonically', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalJson([{ b: 1, a: 2 }])).toBe('[{"a":2,"b":1}]');
  });
});
