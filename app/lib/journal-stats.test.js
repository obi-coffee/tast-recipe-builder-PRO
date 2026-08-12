import { describe, it, expect } from 'vitest';
import {
  entryScore, journalStats, averagesBy, dialInJourneys, palateProfile, topFlavors, consistency,
} from './journal-stats';

const brewEntry = (over = {}) => ({
  id: Math.random().toString(36).slice(2), kind: 'brew', createdAt: '2026-08-01T10:00:00Z',
  rating: null, notes: '', coffeeData: { name: 'Yirg', roaster: 'Heart', roastLevel: 'Light', process: 'Washed' },
  brewData: { device: 'V60 02', grinder: 'Comandante C40' }, recipe: {}, ...over,
});
const tenScale = (rating, over = {}) => brewEntry({ rating, recipe: { logMeta: { scale: 10, flavors: [] }, ...over.recipeExtra }, ...over });

describe('journal stats — score normalization', () => {
  it('treats legacy star ratings as 5-scale and marked entries as 10-scale', () => {
    expect(entryScore(brewEntry({ rating: 4 }))).toBe(8);        // legacy 4★ → 8/10
    expect(entryScore(tenScale(8.5))).toBe(8.5);                 // marked 10-scale stays
    expect(entryScore(brewEntry({ rating: null }))).toBeNull();
    expect(entryScore(brewEntry({ rating: 7 }))).toBe(7);        // unmarked >5 was already 10-scale
  });

  it('reads cupping entries through the cupping blob', () => {
    const cup = brewEntry({ kind: 'cupping', rating: 9, recipe: { cupping: { scale: 10, attributes: { Aroma: 8 }, flavors: ['Floral'] } } });
    expect(entryScore(cup)).toBe(9);
  });
});

describe('journal stats — aggregates', () => {
  const entries = [
    tenScale(6, { createdAt: '2026-08-01T10:00:00Z' }),
    tenScale(7.5, { createdAt: '2026-08-02T10:00:00Z', recipe: { logMeta: { scale: 10 }, adjusted: true } }),
    tenScale(8.5, { createdAt: '2026-08-03T10:00:00Z' }),
    tenScale(8, { createdAt: '2026-08-04T10:00:00Z', coffeeData: { name: 'Brazil', roaster: 'Onyx', roastLevel: 'Medium', process: 'Natural' } }),
    brewEntry({ kind: 'cupping', rating: 9, createdAt: '2026-08-05T10:00:00Z', recipe: { cupping: { scale: 10, attributes: { Aroma: 8, Acidity: 7 }, flavors: ['Floral', 'Citrus'] } } }),
  ];

  it('computes the tile row', () => {
    const s = journalStats(entries);
    expect(s.brews).toBe(5);
    expect(s.scored).toBe(5);
    expect(s.coffees).toBe(2);
    expect(s.cuppings).toBe(1);
    expect(s.avgScore).toBeCloseTo(7.8, 1);
  });

  it('groups averages by roast level, best first', () => {
    const rows = averagesBy(entries, e => e.coffeeData?.roastLevel);
    expect(rows[0].avg).toBeGreaterThanOrEqual(rows[rows.length - 1].avg);
    const light = rows.find(r => r.key === 'Light');
    expect(light.count).toBe(4); // 3 brews + 1 cupping of the Yirg
  });

  it('builds the dial-in journey (cuppings excluded) with the score delta', () => {
    const js = dialInJourneys(entries);
    const yirg = js.find(j => j.coffee === 'Yirg');
    expect(yirg.brews.length).toBe(3);
    expect(yirg.delta).toBe(2.5); // 6 → 8.5
    expect(yirg.brews.some(b => b.adjusted)).toBe(true);
  });

  it('averages cupping attributes into the palate profile', () => {
    const p = palateProfile(entries);
    expect(p.sessions).toBe(1);
    expect(p.attributes.Aroma).toBe(8);
  });

  it('counts flavor tags and measures consistency', () => {
    expect(topFlavors(entries)[0].flavor).toBe('Floral');
    const c = consistency(entries);
    expect(c[0].spread).toBe(2.5);
  });
});
