/**
 * Roast freshness intelligence — part of the tāst knowledge well.
 *
 * Days since roast strongly affect the bloom (CO₂ off-gassing) and, past peak,
 * solubility. Given an optional "roasted on" date, we nudge the bloom size and
 * time, and (for stale coffee) the grind. With no date, this layer is skipped.
 *
 * Conventional specialty-coffee resting/peak windows: a few days to settle,
 * roughly 1–3 weeks at peak for filter, tailing off after ~4–6 weeks.
 */

export const FRESHNESS_BANDS = [
  { maxDays: 4,  label: 'just roasted', bloomRatioDelta: +0.5, bloomSecondsDelta: +10, grindTDelta: 0,
    note: 'Just roasted and still gassy — a bigger, longer bloom lets the CO₂ escape so water can reach the coffee evenly.' },
  { maxDays: 21, label: 'peak',         bloomRatioDelta: 0,    bloomSecondsDelta: 0,   grindTDelta: 0, note: '' },
  { maxDays: 45, label: 'settling',     bloomRatioDelta: -0.25, bloomSecondsDelta: 0,  grindTDelta: 0,
    note: 'Past its freshest — a slightly smaller bloom is plenty now.' },
  { maxDays: Infinity, label: 'past peak', bloomRatioDelta: -0.5, bloomSecondsDelta: -5, grindTDelta: -0.05,
    note: 'Past peak freshness — a slightly finer grind helps recover sweetness from coffee that has given up some CO₂.' },
];

const NEUTRAL = { label: 'unknown', bloomRatioDelta: 0, bloomSecondsDelta: 0, grindTDelta: 0, note: '', days: null };

/**
 * @param roastedOn  ISO-ish date string (e.g. "2026-06-10")
 * @param now        epoch millis (injected for deterministic tests)
 */
export function getFreshnessAdjustment(roastedOn = '', now = Date.now()) {
  if (!roastedOn || !String(roastedOn).trim()) return NEUTRAL;
  const t = Date.parse(roastedOn);
  if (Number.isNaN(t)) return NEUTRAL;
  const days = Math.max(0, Math.floor((now - t) / 86400000));
  const band = FRESHNESS_BANDS.find(b => days <= b.maxDays) || FRESHNESS_BANDS[FRESHNESS_BANDS.length - 1];
  return { ...band, days };
}
