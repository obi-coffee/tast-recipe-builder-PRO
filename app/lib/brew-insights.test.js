import { describe, it, expect } from 'vitest';
import { buildBrewInsights, insightKeyForPhase, coffeeDisplayName } from './brew-insights';

const NOW = Date.parse('2026-08-12T12:00:00Z');

describe('brew insights — the coffee-aware assist', () => {
  it('speaks about freshness at the bloom', () => {
    const gassy = buildBrewInsights({
      coffeeData: { name: 'Fresh Lot', roastedOn: '2026-08-10' },
      brewData: { device: 'V60 02' }, recipe: {}, now: NOW,
    });
    expect(gassy.bloom.join(' ')).toMatch(/CO₂|dome/i);

    const stale = buildBrewInsights({
      coffeeData: { name: 'Old Lot', roastedOn: '2026-05-01' },
      brewData: { device: 'V60 02' }, recipe: {}, now: NOW,
    });
    expect(stale.bloom.join(' ')).toMatch(/don’t expect much rise/i);
  });

  it('warns about natural-process drawdown and fermented aromas', () => {
    const nat = buildBrewInsights({ coffeeData: { process: 'Natural' }, brewData: {}, recipe: {}, now: NOW });
    expect(nat.drawdown.join(' ')).toMatch(/fines|crawl/i);
    const ana = buildBrewInsights({ coffeeData: { process: 'Anaerobic' }, brewData: {}, recipe: {}, now: NOW });
    expect(ana.bloom.join(' ')).toMatch(/wild|boozy/i);
  });

  it('coaches gentle pours for delicate cultivars', () => {
    const gesha = buildBrewInsights({ coffeeData: { variety: 'Gesha' }, brewData: {}, recipe: {}, now: NOW });
    expect(gesha.pour.join(' ')).toMatch(/delicate|low and slow/i);
  });

  it('sets drawdown expectations for fast paper and boosters', () => {
    const out = buildBrewInsights({
      coffeeData: {},
      brewData: { device: 'V60 02', filter: 'sibarist_fast', booster: 'booster_cone' },
      recipe: {}, now: NOW,
    });
    expect(out.drawdown.join(' ')).toMatch(/fast paper|quicker/i);
    expect(out.drawdown.join(' ')).toMatch(/booster/i);
  });

  it('tells you what to taste for at the finish', () => {
    const out = buildBrewInsights({
      coffeeData: { name: 'Yirg' }, brewData: {},
      recipe: { flavorNotes: ['Floral', 'Citrus', 'Stone fruit'], adjusted: true }, now: NOW,
    });
    expect(out.finish.join(' ')).toMatch(/floral, citrus, stone fruit/);
    expect(out.finish.join(' ')).toMatch(/saved correction/i);
  });

  it('coaches bed-state pouring when a maker recipe meets a non-standard paper', () => {
    const brewData = { device: 'Orea V4', grinder: 'Comandante C40', filter: 'sibarist_fast' };
    const maker = buildBrewInsights({
      coffeeData: { name: 'Dara Lot' }, brewData,
      recipe: { method: 'orea_v4_dara' }, now: NOW,
    });
    expect(maker.pour.join(' ')).toMatch(/pour on the bed, not the timestamp/i);
    // Slow paper flips the coaching direction (cone brewer — SLOW is cone-only).
    const slow = buildBrewInsights({
      coffeeData: { name: 'Kasuya Lot' },
      brewData: { device: 'V60 02', grinder: 'Comandante C40', filter: 'sibarist_slow' },
      recipe: { method: 'kasuya46' }, now: NOW,
    });
    expect(slow.pour.join(' ')).toMatch(/let the bed nearly clear/i);
    // Balanced method or standard paper → no line.
    const balanced = buildBrewInsights({ coffeeData: {}, brewData, recipe: { method: 'balanced' }, now: NOW });
    expect(balanced.pour.join(' ')).not.toMatch(/timestamp/i);
    const stdPaper = buildBrewInsights({
      coffeeData: {}, brewData: { device: 'Orea V4', filter: 'standard' },
      recipe: { method: 'orea_v4_dara' }, now: NOW,
    });
    expect(stdPaper.pour.join(' ')).not.toMatch(/timestamp/i);
  });

  it('affirms agitation for washed coffees on pour over', () => {
    const out = buildBrewInsights({
      coffeeData: { name: 'Kenya AA', process: 'Washed', roastLevel: 'Light' },
      brewData: { device: 'V60 02' }, recipe: {}, now: NOW,
    });
    expect(out.pour.join(' ')).toMatch(/faster, tighter spirals/i);
    expect(out.wait.join(' ')).toMatch(/confident swirl/i);
  });

  it('tempers washed agitation on a dark roast', () => {
    const out = buildBrewInsights({
      coffeeData: { name: 'Dark Lot', process: 'Washed', roastLevel: 'Dark' },
      brewData: { device: 'V60 02' }, recipe: {}, now: NOW,
    });
    expect(out.pour.join(' ')).toMatch(/brisk and brief/i);
    expect(out.pour.join(' ')).not.toMatch(/faster, tighter spirals/i);
  });

  it('keeps naturals and ferments gentle on pour over', () => {
    const nat = buildBrewInsights({
      coffeeData: { process: 'Natural', roastLevel: 'Medium' },
      brewData: { device: 'V60 02' }, recipe: {}, now: NOW,
    });
    expect(nat.pour.join(' ')).toMatch(/low and slow/i);
    const ana = buildBrewInsights({
      coffeeData: { process: 'Anaerobic Natural' },
      brewData: { device: 'Orea V4' }, recipe: {}, now: NOW,
    });
    expect(ana.pour.join(' ')).toMatch(/minimal agitation/i);
  });

  it('a delicate variety overrides even a washed process toward gentleness', () => {
    const out = buildBrewInsights({
      coffeeData: { variety: 'Gesha', process: 'Washed', roastLevel: 'Light' },
      brewData: { device: 'V60 02' }, recipe: {}, now: NOW,
    });
    const all = [...out.pour, ...out.wait].join(' ');
    expect(all).toMatch(/overrides the playbook/i);
    expect(all).not.toMatch(/faster, tighter spirals/i);
  });

  it('speaks the immersion verb: stirs, not spirals', () => {
    const fp = buildBrewInsights({
      coffeeData: { process: 'Washed' },
      brewData: { device: 'French Press' }, recipe: {}, now: NOW,
    });
    expect(fp.wait.join(' ')).toMatch(/crust.*stir with intent/i);
    const ap = buildBrewInsights({
      coffeeData: { process: 'Natural' },
      brewData: { device: 'AeroPress' }, recipe: {}, now: NOW,
    });
    expect(ap.pour.join(' ')).toMatch(/stirs to the minimum/i);
  });

  it('stays silent for styles with no brew-along', () => {
    const out = buildBrewInsights({
      coffeeData: { process: 'Washed', roastLevel: 'Light' },
      brewData: { device: 'Moka Pot' }, recipe: {}, now: NOW,
    });
    expect(out.pour.join(' ')).not.toMatch(/spiral|stir/i);
  });

  it('returns empty buckets for a sparse coffee — the generic voice takes over', () => {
    const out = buildBrewInsights({ coffeeData: {}, brewData: {}, recipe: {}, now: NOW });
    expect(out.bloom).toEqual([]);
    expect(out.pour).toEqual([]);
    expect(out.prep).toEqual([]);
  });

  it('classifies phases into insight buckets', () => {
    expect(insightKeyForPhase({ kind: 'prep', name: 'Rinse & dose' }, 0)).toBe('prep');
    expect(insightKeyForPhase({ kind: 'pour', name: 'Bloom' }, 0)).toBe('bloom');
    expect(insightKeyForPhase({ kind: 'pour', name: 'Pour 2' }, 2)).toBe('pour');
    expect(insightKeyForPhase({ kind: 'wait', name: 'Drawdown' }, 5)).toBe('drawdown');
    expect(insightKeyForPhase({ kind: 'wait', name: 'Steep' }, 3)).toBe('wait');
  });

  it('names the coffee it can', () => {
    expect(coffeeDisplayName({ name: 'Lot 4' })).toBe('Lot 4');
    expect(coffeeDisplayName({ origin: 'Kenya', variety: 'SL28' })).toBe('Kenya SL28');
    expect(coffeeDisplayName({})).toBe('this coffee');
  });
});
