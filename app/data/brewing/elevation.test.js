import { describe, it, expect } from 'vitest';
import { parseElevation, getElevationAdjustment } from './elevation';

describe('parseElevation', () => {
  it('parses MASL and metre ranges (midpoint)', () => {
    expect(parseElevation('1900 MASL')).toBe(1900);
    expect(parseElevation('1,600–1,900m')).toBe(1750);
    expect(parseElevation('1800')).toBe(1800);
  });

  it('converts feet to metres', () => {
    expect(Math.round(parseElevation('5,500 ft'))).toBe(1676);
    expect(Math.round(parseElevation('6000 feet'))).toBe(1829);
  });

  it('returns null when no usable elevation is present', () => {
    expect(parseElevation('')).toBeNull();
    expect(parseElevation('unknown')).toBeNull();
  });

  it('feet-denominated elevation still drives a density band', () => {
    // ~5500 ft ≈ 1676 m → dense band (finer grind, hotter water)
    const adj = getElevationAdjustment('5,500 ft');
    expect(adj.density).toBe('dense');
    expect(adj.grindTDelta).toBeLessThan(0);
  });
});
