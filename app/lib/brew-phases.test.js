import { describe, it, expect } from 'vitest';
import { buildPhases, parseGrams, parseStartSec, parseUpperTime } from './brew-phases';

describe('brew-phases helpers', () => {
  it('parses grams from a step target', () => {
    expect(parseGrams('155g · 1:00')).toBe(155);
    expect(parseGrams('300g')).toBe(300);
    expect(parseGrams('4:00')).toBeNull();
    expect(parseGrams('done')).toBeNull();
  });

  it('parses the start time marker', () => {
    expect(parseStartSec('50g · 0:00')).toBe(0);
    expect(parseStartSec('250g · 1:15')).toBe(75);
    expect(parseStartSec('300g')).toBeNull();
  });

  it('takes the upper bound of a time range', () => {
    expect(parseUpperTime('2:30–3:30')).toBe(210);
    expect(parseUpperTime('1:00')).toBe(60);
    expect(parseUpperTime('done')).toBeNull();
  });
});

describe('buildPhases (pour-over with prep)', () => {
  const steps = [
    { step: 'Rinse & dose', target: 'Prep', technique: 'Rinse the filter and add 18g.' },
    { step: 'Bloom', target: '50g · 0:00', technique: 'Bloom.' },
    { step: 'Pour 2', target: '150g · 0:45', technique: 'Pour.' },
    { step: 'Pour 3', target: '250g · 1:15', technique: 'Pour.' },
    { step: 'Pour 4', target: '300g · 1:45', technique: 'Pour.' },
    { step: 'Drawdown', target: '300g', technique: 'Let it draw down.' },
  ];
  const phases = buildPhases(steps, '2:30–3:30');

  it('keeps every step as a phase', () => {
    expect(phases).toHaveLength(6);
  });

  it('classifies the leading rinse/dose step as prep (no water, no time)', () => {
    expect(phases[0].kind).toBe('prep');
    expect(phases[0].label).toBe('Rinse & dose');
    expect(phases[0].grams).toBe(0);
  });

  it('forward-fills cumulative grams from the bloom on', () => {
    expect(phases.map(p => p.grams)).toEqual([0, 50, 150, 250, 300, 300]);
    expect(phases[4].frac).toBe(1);
  });

  it('marks the bloom as the first pour and drawdown as a wait', () => {
    expect(phases.map(p => p.kind)).toEqual(['prep', 'pour', 'pour', 'pour', 'pour', 'wait']);
    expect(phases[1].label).toBe('Pour up to 50g');
    expect(phases[5].label).toBe('Wait');
  });

  it('times the pours from the bloom (0:00) onward', () => {
    // prep default, bloom 0→45, 45→75, 75→105, 105→210 (to total), drawdown default
    expect(phases.map(p => p.dur)).toEqual([20, 45, 30, 30, 105, 20]);
  });
});

describe('buildPhases (full immersion)', () => {
  const steps = [
    { step: 'Add & Steep', target: '250g · 0:00', technique: 'Add all water.' },
    { step: 'Break the Crust', target: '4:00', technique: 'Break the crust.' },
    { step: 'Press', target: '250g', technique: 'Press slowly.' },
  ];
  const phases = buildPhases(steps, '8:00');

  it('treats the single fill as the one pour, rest as waits', () => {
    expect(phases.map(p => p.kind)).toEqual(['pour', 'wait', 'wait']);
    expect(phases[0].frac).toBe(1);
    expect(phases[0].label).toBe('Pour up to 250g');
  });

  it('is resilient to empty input', () => {
    expect(buildPhases([], '2:00')).toEqual([]);
    expect(buildPhases(null)).toEqual([]);
  });
});
