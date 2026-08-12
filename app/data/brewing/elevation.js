/**
 * Elevation → density intelligence — part of the tāst knowledge well.
 *
 * Higher-grown cherries ripen slower and grow denser. Dense beans resist
 * water, so they want a finer grind and hotter water; soft low-grown beans
 * want the opposite. We band the (free-text) elevation field as a density
 * proxy and return small grind/temp nudges.
 *
 * Sources: Perfect Daily Grind (bean density; elevation & brew temperature);
 * Headcount Coffee (density, grind & strength).
 */

export const ELEVATION_BANDS = [
  { max: 1200, density: 'soft',       grindTDelta: +0.08, tempDelta: -1,
    note: 'Lower-grown and softer — a slightly coarser grind suits its looser structure.' },
  { max: 1600, density: 'medium',     grindTDelta: 0,     tempDelta: 0,  note: '' },
  { max: 1900, density: 'dense',      grindTDelta: -0.05, tempDelta: +1,
    note: 'High-grown and dense — a finer grind helps water get into the bean for full, even extraction.' },
  { max: Infinity, density: 'very dense', grindTDelta: -0.10, tempDelta: +2,
    note: 'Very high-grown and very dense — a notably finer grind extracts this tough, resistant bean evenly.' },
];

/**
 * Parse an elevation string (e.g. "1900 MASL", "1,600–1,900m", "1800",
 * "5,500 ft") into a single representative number in metres, or null if none is
 * found. Ranges use the midpoint; feet are converted to metres (many US roaster
 * bags list elevation in feet).
 */
export function parseElevation(elevationString = '') {
  const s = String(elevationString).replace(/,/g, '');
  const isFeet = /\b(ft|feet|foot)\b/i.test(s);
  const nums = s.match(/\d{3,5}/g);
  if (!nums || !nums.length) return null;
  let vals = nums.map(Number);
  if (isFeet) vals = vals.map(n => n * 0.3048); // ft → m
  vals = vals.filter(n => n >= 200 && n <= 3500);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

const NEUTRAL = { density: 'unknown', grindTDelta: 0, tempDelta: 0, note: '', metres: null };

export function getElevationAdjustment(elevationString = '') {
  const metres = parseElevation(elevationString);
  if (metres == null) return NEUTRAL;
  const band = ELEVATION_BANDS.find(b => metres <= b.max) || ELEVATION_BANDS[ELEVATION_BANDS.length - 1];
  return { ...band, metres };
}
