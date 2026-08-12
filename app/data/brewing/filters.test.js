import { describe, it, expect } from 'vitest';
import {
  filtersForDevice, boostersForDevice, getFilterAdjustment, getFilterShape,
  FILTER_SPEEDS, shiftTimeLabel,
} from './filters';
import { buildRecipe } from '../../lib/recipe-engine/index';

describe('filter knowledge well — shape gating', () => {
  it('offers cone papers on a V60 and flat papers on an Orea', () => {
    const v60 = filtersForDevice('V60 02').map(f => f.id);
    expect(v60).toContain('sibarist_fast');
    expect(v60).toContain('sibarist_slow');      // SLOW is cone-only
    const orea = filtersForDevice('Orea V4').map(f => f.id);
    expect(orea).toContain('sibarist_fast');
    expect(orea).not.toContain('sibarist_slow'); // no slow flat in the lineup
  });

  it('offers no papers for paperless brewers', () => {
    expect(filtersForDevice('Moka Pot')).toEqual([]);
    expect(filtersForDevice('French Press')).toEqual([]);
    expect(filtersForDevice('Toddy Cold Brew')).toEqual([]);
    expect(getFilterShape('Home Machine')).toBeNull();
  });

  it('sizes boosters to the brewer', () => {
    const kalita = boostersForDevice('Kalita Wave 185').map(b => b.id);
    expect(kalita).toContain('booster_45');
    expect(kalita).not.toContain('booster_63');
    const bigBoy = boostersForDevice('Orea Big Boy').map(b => b.id);
    expect(bigBoy).toContain('booster_63');
    const v60 = boostersForDevice('V60 02').map(b => b.id);
    expect(v60).toContain('booster_cone');
    expect(boostersForDevice('AeroPress')).toEqual([]); // disc — no booster
  });
});

describe('filter knowledge well — adjustments', () => {
  it('fast paper reads notably finer; slow reads slightly coarser', () => {
    const fast = getFilterAdjustment('sibarist_fast', 'none', 'V60 02');
    const slow = getFilterAdjustment('sibarist_slow', 'none', 'V60 02');
    expect(fast.grindTDelta).toBeLessThan(0);
    expect(fast.grindTDelta).toBe(FILTER_SPEEDS.fast.grindTDelta);
    expect(slow.grindTDelta).toBeGreaterThan(0);
    expect(fast.notes.length).toBeGreaterThan(0);
  });

  it('a booster adds a small finer nudge on top of the paper', () => {
    const plain = getFilterAdjustment('standard', 'none', 'Orea V3');
    const boosted = getFilterAdjustment('standard', 'booster_45', 'Orea V3');
    expect(plain.grindTDelta).toBe(0);
    expect(boosted.grindTDelta).toBeLessThan(0);
    expect(boosted.boosted).toBe(true);
  });

  it('is neutral for unknown ids, mismatched shapes, and paperless devices', () => {
    expect(getFilterAdjustment('sibarist_fast', 'none', 'Moka Pot').grindTDelta).toBe(0);
    // SLOW is cone-only — on a flat Orea it resolves to standard.
    expect(getFilterAdjustment('sibarist_slow', 'none', 'Orea V4').grindTDelta).toBe(0);
    expect(getFilterAdjustment('nonsense', 'nonsense', 'V60 02').grindTDelta).toBe(0);
    // A booster that doesn't fit the device is ignored.
    expect(getFilterAdjustment('standard', 'booster_63', 'Kalita Wave 155').boosted).toBe(false);
  });
});

describe('filter calibration — the paper must be visible in the recipe', () => {
  const coffee = { name: 'Cal Lot', roastLevel: 'Medium', origin: 'Colombia', process: 'Washed' };
  const base = { device: 'V60 02', grinder: 'Comandante C40', targetWeight: 300 };
  const clicks = (r) => parseInt(r.grindSetting.match(/Start: (\d+) clicks/)[1], 10);

  it('FAST moves a stepped grinder at least 2 clicks finer (Sibarist guidance)', () => {
    const std = buildRecipe({ coffeeData: coffee, brewData: base });
    const fast = buildRecipe({ coffeeData: coffee, brewData: { ...base, filter: 'sibarist_fast' } });
    expect(clicks(std) - clicks(fast)).toBeGreaterThanOrEqual(2);
  });

  it('B3 moves at least 1 click finer', () => {
    const std = buildRecipe({ coffeeData: coffee, brewData: base });
    const b3 = buildRecipe({ coffeeData: coffee, brewData: { ...base, filter: 'sibarist_b3' } });
    expect(clicks(std) - clicks(b3)).toBeGreaterThanOrEqual(1);
  });

  it('FAST shortens the displayed brew window; SLOW stretches it', () => {
    const std = buildRecipe({ coffeeData: coffee, brewData: base });
    const fast = buildRecipe({ coffeeData: coffee, brewData: { ...base, filter: 'sibarist_fast' } });
    const slow = buildRecipe({ coffeeData: coffee, brewData: { ...base, filter: 'sibarist_slow' } });
    expect(std.totalTime).toBe('2:30–3:30');
    expect(fast.totalTime).toBe('1:50–2:40');
    expect(slow.totalTime).toBe('3:10–4:20');
  });

  it('maker timelines keep their own clock — Kasuya window is untouched by paper', () => {
    const kasuya = buildRecipe({ coffeeData: coffee, brewData: { ...base, brewMethod: 'kasuya46', filter: 'sibarist_fast' } });
    expect(kasuya.totalTime).toBe('3:00–3:45');
    // ...but the paper still speaks in the notes and moves the grind.
    expect(kasuya.brewingNotes.join(' ')).toMatch(/fast-flow paper/i);
  });

  it('brew steps pace themselves inside the shortened window', () => {
    const fast = buildRecipe({ coffeeData: coffee, brewData: { ...base, filter: 'sibarist_fast' } });
    const times = fast.brewSteps.map(s => s.target).join(' ').match(/(\d+):([0-5]\d)/g) || [];
    const secs = times.map(t => { const [m, s] = t.split(':').map(Number); return m * 60 + s; });
    // Every timed cue must land inside the compressed 2:40 upper bound.
    expect(Math.max(...secs)).toBeLessThanOrEqual(160);
  });

  it('shiftTimeLabel scales m:ss and leaves other formats alone', () => {
    expect(shiftTimeLabel('2:30–3:30', 0.75)).toBe('1:50–2:40');
    expect(shiftTimeLabel('2:30–3:30', 1.25)).toBe('3:10–4:20');
    expect(shiftTimeLabel('~2:00', 0.75)).toBe('~1:30');
    expect(shiftTimeLabel('25–35s', 0.75)).toBe('25–35s');
    expect(shiftTimeLabel('12–18 hours', 1.25)).toBe('12–18 hours');
    expect(shiftTimeLabel('2:30–3:30', null)).toBe('2:30–3:30');
  });
});
