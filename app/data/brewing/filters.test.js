import { describe, it, expect } from 'vitest';
import {
  filtersForDevice, boostersForDevice, getFilterAdjustment, getFilterShape,
  FILTER_SPEEDS,
} from './filters';

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
