/**
 * Water intelligence — part of the tāst knowledge well.
 *
 * Water is ~98% of the cup. Its mineral content (general hardness) changes how
 * fast and how much coffee extracts:
 *   - Soft / low-mineral water UNDER-extracts (there's little for the coffee to
 *     bind to) → brew a touch finer and hotter to compensate.
 *   - Hard / high-mineral water OVER-extracts bitterness and scales equipment →
 *     ease off with a coarser grind and cooler water.
 *   - "Balanced" is the SCA sweet spot (~150 ppm total hardness) and needs no
 *     correction.
 *
 * This is a one-time user setting (not per-coffee). When it's unknown we don't
 * touch the numbers — we only offer general guidance in the notes.
 *
 * Source: SCA water standard (target ~150 mg/L, GH/KH balance); Hendon &
 * Colonna-Dashwood, "Water for Coffee".
 */

export const WATER_PROFILES = {
  soft: {
    label: 'Soft / low-mineral',
    grindTDelta: -0.03, tempDelta: +1,
    note: 'Your soft water has little for the coffee to grab onto, so it tends to under-extract — we grind a hair finer and nudge the water hotter to pull the sweetness through.',
  },
  balanced: {
    label: 'Balanced (~150 ppm)',
    grindTDelta: 0, tempDelta: 0,
    note: 'Balanced water (around 150 ppm) is the extraction sweet spot — nothing to correct here; this recipe is tuned straight to the coffee.',
  },
  hard: {
    label: 'Hard / high-mineral',
    grindTDelta: +0.03, tempDelta: -1,
    note: 'Hard water over-extracts bitterness (and scales your kit), so we grind a touch coarser and ease the temperature down. A simple filter jug makes a bigger difference here than any grind tweak.',
  },
  unknown: {
    label: 'Not sure',
    grindTDelta: 0, tempDelta: 0,
    note: 'Water is most of the cup: brew with clean filtered water around 150 ppm. Distilled tastes flat, hard tap turns it chalky. Set your water type in Settings and we’ll tune to it.',
  },
};

export function getWaterAdjustment(profile = 'unknown') {
  return WATER_PROFILES[profile] || WATER_PROFILES.unknown;
}
