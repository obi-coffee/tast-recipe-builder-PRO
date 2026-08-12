import { describe, it, expect } from 'vitest';
import { scaleRecipe, recipeToModel } from './recipe-scale';

const sample = () => ({
  dose: '18g', water: '300g', ratio: '1:16.8', temperature: '93', totalTime: '2:30–3:30',
  grindSetting: 'Start: 24 clicks. Range: 22 clicks–32 clicks.',
  brewSteps: [
    { step: 'Rinse & Bloom', target: '45g · 0:00', technique: 'Rinse the filter, add 18g of coffee, then pour 45g to saturate.' },
    { step: 'Pour 1', target: '150g · 1:15', technique: 'Pour to 150g in slow circles.' },
    { step: 'Drawdown', target: '300g', technique: 'Let the bed draw down fully.' },
  ],
});

describe('recipe-scale', () => {
  it('reads the editable model from a recipe', () => {
    const m = recipeToModel(sample());
    expect(m.dose).toBe(18);
    expect(m.ratio).toBeCloseTo(16.8, 5);
  });

  it('editing dose holds ratio and scales water + all pour targets', () => {
    const r = scaleRecipe(sample(), { dose: 36, ratio: 16.8 });
    expect(r.dose).toBe('36g');
    expect(r.water).toBe('605g');       // 36 × 16.8 = 604.8 → 605
    expect(r.ratio).toBe('1:16.8');
    const targets = r.brewSteps.map(s => s.target);
    expect(targets[0]).toMatch(/^91g/);  // bloom 45 → ~91
    expect(targets[2]).toBe('605g');     // drawdown matches water
    // dose-gram in technique scales with dose, not water
    expect(r.brewSteps[0].technique).toContain('add 36g of coffee');
  });

  it('editing the ratio holds the dose and only scales water-based grams', () => {
    const r = scaleRecipe(sample(), { dose: 18, ratio: 14 });
    expect(r.dose).toBe('18g');
    expect(r.water).toBe('252g');        // 18 × 14
    expect(r.ratio).toBe('1:14.0');
    expect(r.brewSteps[2].target).toBe('252g');
    // dose stays put in the prose; water pour scales
    expect(r.brewSteps[0].technique).toContain('add 18g of coffee');
    expect(r.brewSteps[1].technique).toContain('Pour to 126g'); // 150 × 0.84
  });

  it('editing water (via implied ratio) recomputes consistently', () => {
    // Water-edit is modeled as dose = water/ratio with ratio held; here we
    // emulate the resulting model directly.
    const r = scaleRecipe(sample(), { dose: 20, ratio: 16.8 });
    expect(r.water).toBe('336g');        // 20 × 16.8
    expect(r.dose).toBe('20g');
  });

  it('is deterministic', () => {
    const a = scaleRecipe(sample(), { dose: 22, ratio: 16.0 });
    const b = scaleRecipe(sample(), { dose: 22, ratio: 16.0 });
    expect(a).toEqual(b);
  });
});
