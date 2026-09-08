import { describe, expect, it } from 'vitest';

import { isInsideBoundary } from '../geometry';
import { evaluateField } from '../rules';
import { validateScenario } from './codec';
import { DEFAULT_DRAFT, createScenario, type ScenarioDraft } from './create';
import { phase } from './derive';
import { FIELD_TEMPLATES, type FieldTemplateId } from './presets';

describe('createScenario', () => {
  it('produces a schema-valid scenario from the defaults', () => {
    const result = validateScenario(createScenario(DEFAULT_DRAFT));
    if (!result.ok) throw new Error(result.issues.join(', '));
    expect(result.ok).toBe(true);
  });

  it('stays valid across every field template and format', () => {
    for (const template of Object.keys(FIELD_TEMPLATES) as FieldTemplateId[]) {
      for (const format of ['T20', 'ODI', 'TEST'] as const) {
        const draft: ScenarioDraft = { ...DEFAULT_DRAFT, fieldTemplate: template, format, over: 8 };
        const result = validateScenario(createScenario(draft));
        if (!result.ok) throw new Error(`${template}/${format}: ${result.issues.join(', ')}`);
      }
    }
  });

  it('keeps every fielder inside the boundary on a small ground', () => {
    const s = createScenario({ ...DEFAULT_DRAFT, straightM: 55, squareM: 50 });
    for (const fielder of s.field.fielders) {
      expect(isInsideBoundary(fielder.at, s.ground), fielder.positionId).toBe(true);
    }
  });

  it('reports an illegal field rather than silently fixing it', () => {
    // A death field in the powerplay is five out when only two are allowed. The
    // builder must let the user do this and then tell them — never block (§7).
    const s = createScenario({ ...DEFAULT_DRAFT, over: 2, fieldTemplate: 'death' });
    const violations = evaluateField(
      { format: s.format, over: s.over, strikerHandedness: s.striker.handedness },
      s.field,
    );
    expect(violations.map((v) => v.restrictionId)).toContain('outside_circle_limit');
  });

  it('sets innings from whether a target was given', () => {
    expect(createScenario({ ...DEFAULT_DRAFT, target: null }).innings).toBe(1);
    expect(createScenario({ ...DEFAULT_DRAFT, target: 180 }).innings).toBe(2);
  });

  it('derives the phase from the over the user picked', () => {
    expect(phase(createScenario({ ...DEFAULT_DRAFT, over: 2 }))).toBe('powerplay');
    expect(phase(createScenario({ ...DEFAULT_DRAFT, over: 17 }))).toBe('death');
  });

  it('computes balls remaining for limited overs and null for a Test', () => {
    expect(createScenario({ ...DEFAULT_DRAFT, over: 17, ball: 3 }).ballsRemaining).toBe(15);
    expect(createScenario({ ...DEFAULT_DRAFT, format: 'TEST' }).ballsRemaining).toBeNull();
  });

  it('gives a spinner spin and a quick seam, without asking the user', () => {
    const quick = createScenario({ ...DEFAULT_DRAFT, bowlerType: 'right_fast' });
    const spinner = createScenario({ ...DEFAULT_DRAFT, bowlerType: 'off_spin' });
    expect(quick.bowler.spinDeg).toBe(0);
    expect(quick.bowler.avgSpeedKph).toBeGreaterThan(130);
    expect(spinner.bowler.spinDeg).toBeGreaterThan(0);
    expect(spinner.bowler.avgSpeedKph).toBeLessThan(100);
  });
});
