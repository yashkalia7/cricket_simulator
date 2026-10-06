import { PRESETS } from '@cricket/domain';
import { describe, expect, it } from 'vitest';

import { groundingFor, validateOptions, type ModelOption } from './suggest';

const ok: ModelOption = {
  id: 'wide_yorker_deny_arc',
  option: { length: 'yorker', line: 'wide_off', variation: 'stock', intent: 'deny_boundary' },
  because: 'He is set and swinging through the line, and the wide yorker removes the arc.',
  unless: 'A missed wide yorker is a low full toss outside off and he frees his arms.',
  risk: 'medium',
  confidence: 'high',
};

const variant = (patch: Partial<ModelOption>): ModelOption[] => [ok, { ...ok, ...patch, id: 'b' }];

describe('validateOptions — §10 rejection rules', () => {
  it('accepts a well-formed pair', () => {
    expect(validateOptions([ok, { ...ok, id: 'b' }])).toEqual([]);
  });

  it('rejects a single option that is not marked contested', () => {
    expect(validateOptions([ok]).join(' ')).toContain('fewer than 2');
  });

  it('accepts a single option when it is marked contested', () => {
    expect(validateOptions([{ ...ok, confidence: 'contested' }])).toEqual([]);
  });

  it('rejects a vague unless', () => {
    expect(validateOptions(variant({ unless: 'Unless he misses.' })).join(' ')).toContain(
      'unless too short',
    );
  });

  it('rejects "executes badly" with no consequence', () => {
    const problems = validateOptions(
      variant({ unless: 'This fails only when the bowler executes it poorly in the moment.' }),
    );
    expect(problems.join(' ')).toContain('without naming a consequence');
  });

  it('allows "execution" when the consequence is named', () => {
    const problems = validateOptions(
      variant({ unless: 'Poor execution turns it into a low full toss that disappears square.' }),
    );
    expect(problems.join(' ')).not.toContain('without naming a consequence');
  });

  it('rejects percentages, averages and strike rates — §10 rule 3', () => {
    expect(validateOptions(variant({ because: 'This works 70% of the time here.' })).join(' ')).toContain('figure');
    expect(validateOptions(variant({ because: 'His average against spin is poor.' })).join(' ')).toContain('figure');
    expect(validateOptions(variant({ because: 'His strike rate collapses here.' })).join(' ')).toContain('figure');
  });

  it('rejects every banned phrase in §10 rule 7', () => {
    for (const phrase of [
      'bowl to your field',
      'hard lengths',
      'take pace off',
      'mix it up',
      'keep it simple',
      'channel outside off',
    ]) {
      expect(validateOptions(variant({ because: `Just ${phrase} and he struggles.` })).join(' ')).toContain(
        phrase,
      );
    }
  });

  it('rejects a length, line, variation or intent outside the ontology', () => {
    expect(validateOptions(variant({ option: { ...ok.option, length: 'half_volley' } })).join(' ')).toContain('unknown length');
    expect(validateOptions(variant({ option: { ...ok.option, line: 'outside_edge' } })).join(' ')).toContain('unknown line');
    expect(validateOptions(variant({ option: { ...ok.option, variation: 'flipper' } })).join(' ')).toContain('unknown variation');
    expect(validateOptions(variant({ option: { ...ok.option, intent: 'get_him_out' } })).join(' ')).toContain('unknown intent');
  });
});

describe('groundingFor', () => {
  it('states the computed facts the model must not contradict', () => {
    const text = groundingFor(PRESETS[1]!);
    expect(text).toContain('Boundary UNGUARDED in:');
    expect(text).toContain('Boundary protected in:');
    expect(text).toContain('executionReliability');
    expect(text).toContain('Do not contradict them');
  });

  it('says plainly when the field is legal', () => {
    expect(groundingFor(PRESETS[0]!)).toContain('This field is legal.');
  });

  it('includes the chase equation when chasing and says so when not', () => {
    const chasing = PRESETS.find((p) => p.target !== null)!;
    const first = PRESETS.find((p) => p.target === null)!;
    expect(groundingFor(chasing)).toContain('Chase:');
    expect(groundingFor(first)).toContain('Batting first');
  });

  it('never leaks a secret-shaped string', () => {
    for (const preset of PRESETS) {
      expect(groundingFor(preset)).not.toMatch(/sk-|Bearer |password/i);
    }
  });
});
