import { describe, it, expect } from 'vitest';
import { buildRecipe } from './index';

/**
 * Pro update — paper & booster layer invariants.
 * The paper changes the GRIND and the STORY, never the coffee's temperature
 * or ratio; paperless brewers ignore it entirely.
 */

const coffee = (over = {}) => ({
  name: 'Filter Test', origin: 'Colombia', roastLevel: 'Medium', process: 'Washed', ...over,
});
const brew = (over = {}) => ({ grinder: 'Comandante C40', method: 'Pour Over', device: 'V60 02', targetWeight: 300, ...over });

const clicks = (r) => parseFloat(String(r.grindSetting).match(/Start:\s*(\d+(\.\d+)?)/)[1]);

describe('engine — filter paper layer', () => {
  it('fast paper grinds notably finer than standard on the same coffee', () => {
    const std = buildRecipe({ coffeeData: coffee(), brewData: brew() });
    const fast = buildRecipe({ coffeeData: coffee(), brewData: brew({ filter: 'sibarist_fast' }) });
    expect(clicks(fast)).toBeLessThan(clicks(std));
    expect(fast.brewingNotes.join(' ')).toMatch(/fast-flow paper/i);
    // Temperature and ratio are untouched — the paper is about flow, not flavor targets.
    expect(fast.temperature).toBe(std.temperature);
    expect(fast.ratio).toBe(std.ratio);
  });

  it('B3-class paper sits between standard and FAST', () => {
    // Use a wide-band grinder (JX-Pro pour-over: 60–100 clicks) so the B3's
    // smaller nudge survives rounding on the dial.
    const g = { grinder: '1Zpresso JX-Pro' };
    const std = buildRecipe({ coffeeData: coffee(), brewData: brew(g) });
    const b3 = buildRecipe({ coffeeData: coffee(), brewData: brew({ ...g, filter: 'sibarist_b3' }) });
    const fast = buildRecipe({ coffeeData: coffee(), brewData: brew({ ...g, filter: 'sibarist_fast' }) });
    expect(clicks(b3)).toBeLessThan(clicks(std));
    expect(clicks(b3)).toBeGreaterThan(clicks(fast));
  });

  it('slow paper coaches a longer drawdown instead of a grind change downward', () => {
    const slow = buildRecipe({ coffeeData: coffee(), brewData: brew({ filter: 'sibarist_slow' }) });
    expect(slow.brewingNotes.join(' ')).toMatch(/longer|drawdown/i);
  });

  it('suppresses the grind↔time expectation note when a non-standard paper rewrites timing', () => {
    // A light roast on standard paper grinds fine → "slower end" note fires.
    const std = buildRecipe({ coffeeData: coffee({ roastLevel: 'Light' }), brewData: brew() });
    expect(std.brewingNotes.join(' ')).toMatch(/slower end/i);
    // Same coffee on FAST paper: the paper's own note leads; the t-heuristic stays quiet.
    const fast = buildRecipe({ coffeeData: coffee({ roastLevel: 'Light' }), brewData: brew({ filter: 'sibarist_fast' }) });
    expect(fast.brewingNotes.join(' ')).not.toMatch(/slower end of/i);
  });

  it('a booster nudges finer and says so', () => {
    const std = buildRecipe({ coffeeData: coffee(), brewData: brew({ device: 'Orea V3', method: 'Pour Over' }) });
    const boosted = buildRecipe({ coffeeData: coffee(), brewData: brew({ device: 'Orea V3', method: 'Pour Over', booster: 'booster_45' }) });
    expect(clicks(boosted)).toBeLessThanOrEqual(clicks(std));
    expect(boosted.brewingNotes.join(' ')).toMatch(/booster/i);
  });

  it('paperless brewers ignore filter and booster entirely', () => {
    const a = buildRecipe({ coffeeData: coffee(), brewData: brew({ method: 'Espresso', device: 'Moka Pot' }) });
    const b = buildRecipe({ coffeeData: coffee(), brewData: brew({ method: 'Espresso', device: 'Moka Pot', filter: 'sibarist_fast', booster: 'booster_cone' }) });
    expect(a).toEqual(b);
  });

  it('stays deterministic with a paper in play', () => {
    const input = { coffeeData: coffee({ roastLevel: 'Light', process: 'Natural' }), brewData: brew({ filter: 'sibarist_fast', booster: 'booster_cone' }) };
    expect(buildRecipe(input)).toEqual(buildRecipe(input));
  });
});
