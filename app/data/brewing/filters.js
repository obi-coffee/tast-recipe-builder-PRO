/**
 * Filter-paper & booster intelligence — part of the tāst knowledge well.
 *
 * Premium papers change flow rate, and flow rate changes contact time — so the
 * grind (and the drawdown expectation) must move with the paper. The engine
 * models generic SPEED CLASSES; named products (Sibarist today, others
 * tomorrow) are PRESETS that map onto a class. Adding a new paper brand is a
 * data edit, never an engine change.
 *
 * Speed classes (grindTDelta − = finer, + = coarser):
 *  - standard   Baseline paper the device tables are tuned for. Neutral.
 *  - fast       Extremely fast abaca-blend papers (Sibarist FAST). Drain far
 *               quicker, so grind notably finer to keep contact time — and
 *               still expect a faster finish. High-extraction, high-clarity.
 *  - modfast    Moderately fast papers (Sibarist B3). A touch finer; sweeter,
 *               more textured cup.
 *  - slow       High-resistance papers (Sibarist RARITIES SLOW). Longer
 *               drawdown, outstanding cleanliness; hold the grind and let the
 *               contact time build.
 *
 * Boosters (Sibarist-style mesh discs between paper and dripper) add contact
 * points under the bed: drawdown runs a little faster and — more importantly —
 * more EVEN, which suppresses channeling and stalls. That evenness headroom is
 * worth a small finer nudge, biggest for fines-heavy grinds.
 *
 * Sources: Sibarist product guidance (FAST / B3 / RARITIES SLOW / BOOSTER),
 * Basic Barista & Nordic Brew Lab FAST/B3 reviews, Coffee Umami booster
 * flow-dynamics testing.
 */

export const FILTER_SPEEDS = {
  standard: {
    id: 'standard', label: 'Standard paper',
    grindTDelta: 0, timeShift: null, timeFactor: null, note: '',
  },
  fast: {
    id: 'fast', label: 'Fast-flow paper',
    // Calibrated to Sibarist's own "significantly finer" guidance and user
    // reports (~2–4 C40 clicks): −0.18 of the brew band ≈ 2 clicks on a
    // Comandante, ~7 on a JX-Pro — visible even on stepped grinders.
    grindTDelta: -0.18, timeShift: 'faster', timeFactor: 0.75,
    note: 'Fast-flow paper drains well ahead of standard — we’ve set the grind notably finer to keep contact time, and the brew window shown is already shortened to match. Expect a clean, silky, high-clarity cup.',
  },
  modfast: {
    id: 'modfast', label: 'Moderately fast paper',
    grindTDelta: -0.08, timeShift: 'faster', timeFactor: 0.9,
    note: 'This paper flows moderately faster than standard — grind sits a touch finer to compensate, and the brew window is trimmed slightly. Expect a sweeter, more textured cup that keeps its clarity.',
  },
  slow: {
    id: 'slow', label: 'Slow-flow paper',
    grindTDelta: +0.02, timeShift: 'slower', timeFactor: 1.25,
    note: 'High-resistance paper extends the drawdown — that’s the point; the brew window shown is already stretched to match. The payoff is an exceptionally clean cup. If it truly stalls, coarsen a step.',
  },
};

/**
 * Scale every m:ss occurrence in a brew-time label ("2:30–3:30" → "1:50–2:40"
 * at ×0.75), rounding to a clean 10 seconds. Labels without m:ss times
 * (espresso "25–35s", cold "12–18 hours") pass through untouched.
 */
export function shiftTimeLabel(label, factor) {
  if (!factor || factor === 1 || !label) return label;
  return String(label).replace(/(\d+):([0-5]\d)/g, (_m, mm, ss) => {
    const s = (parseInt(mm, 10) * 60 + parseInt(ss, 10)) * factor;
    const r = Math.max(10, Math.round(s / 10) * 10);
    return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`;
  });
}

// Filter shapes per brewer — gates which papers the UI offers. 'disc' covers
// AeroPress-style flat discs. Devices not listed (espresso, moka, French
// press, cold steep) don't take a paper choice and hide the picker.
export const DEVICE_FILTER_SHAPES = {
  'V60 02': 'cone', 'V60 01': 'cone', 'Origami': 'cone', 'Chemex 6-Cup': 'cone',
  'Chemex 3-Cup': 'cone', 'December Dripper': 'cone', 'Stagg X': 'cone',
  'Hario Switch': 'cone', 'Clever Dripper': 'cone',
  'Melitta': 'trapezoid',
  'Kalita Wave 185': 'wave', 'Kalita Wave 155': 'wave',
  'Orea O1': 'flat', 'Orea V3': 'flat', 'Orea V4': 'flat', 'Orea Z1': 'flat',
  'Orea Big Boy': 'flat',
  'AeroPress': 'disc',
  'Flash Brew (Japanese Iced)': 'cone',
};

// Named paper presets. `speed` keys into FILTER_SPEEDS; `shapes` gates by the
// device's filter shape. Order = display order.
export const FILTER_PRESETS = [
  { id: 'standard', label: 'Standard paper', brand: '', speed: 'standard',
    shapes: ['cone', 'flat', 'wave', 'trapezoid', 'disc'],
    blurb: 'The paper your brewer ships with — what these recipes are tuned to.' },
  { id: 'sibarist_fast', label: 'Sibarist FAST', brand: 'Sibarist', speed: 'fast',
    shapes: ['cone', 'flat', 'wave'],
    blurb: 'Extremely fast abaca blend — silky, high-clarity cups; flatters light roasts.' },
  { id: 'sibarist_b3', label: 'Sibarist B3', brand: 'Sibarist', speed: 'modfast',
    shapes: ['cone', 'flat'],
    blurb: 'Moderately fast — sweet, syrupy, more textured; great for naturals and ferments.' },
  { id: 'sibarist_slow', label: 'Sibarist RARITIES SLOW', brand: 'Sibarist', speed: 'slow',
    shapes: ['cone'],
    blurb: 'Added resistance for a longer drawdown and outstanding cleanliness — built for light roasts and wild ferments.' },
  { id: 'fast_generic', label: 'Other fast-flow paper', brand: '', speed: 'fast',
    shapes: ['cone', 'flat', 'wave', 'trapezoid', 'disc'],
    blurb: 'Any premium fast-drain paper — treated like the FAST class.' },
];

// Booster presets — mesh flow discs under the paper. `fits` lists device names
// (per Sibarist sizing); 'anyCone'/'anyFlat' broaden by shape.
export const BOOSTER_PRESETS = [
  { id: 'none', label: 'No booster', fits: null, blurb: '' },
  { id: 'booster_cone', label: 'Sibarist BOOSTER Cone', fitsShape: 'cone',
    blurb: 'Mesh cone under the paper — faster, more even drawdown; no more stalled beds.' },
  { id: 'booster_45', label: 'Sibarist BOOSTER 45', fits: ['Orea O1', 'Orea V3', 'Kalita Wave 155', 'Kalita Wave 185'],
    blurb: '45mm disc for flatbed drippers — evens the drawdown and unlocks finer grinds.' },
  { id: 'booster_63', label: 'Sibarist BOOSTER 63', fits: ['Orea V4', 'Orea Big Boy'],
    blurb: '63mm disc for larger flatbeds — evens the drawdown and unlocks finer grinds.' },
];

export const BOOSTER_EFFECT = {
  grindTDelta: -0.02,
  note: 'Booster in: the mesh adds contact points under the bed, so the drawdown runs faster and — more importantly — more even. We’ve nudged the grind slightly finer to use that headroom; channeling and stalls shouldn’t be part of this brew.',
};

const NEUTRAL = { speed: 'standard', grindTDelta: 0, timeShift: null, timeFactor: null, notes: [], label: '', boosted: false };

export function getFilterShape(deviceName) {
  return DEVICE_FILTER_SHAPES[deviceName] || null;
}

/** Papers offered for a device (empty array when the device takes no paper choice). */
export function filtersForDevice(deviceName) {
  const shape = getFilterShape(deviceName);
  if (!shape) return [];
  return FILTER_PRESETS.filter(p => p.shapes.includes(shape));
}

/** Boosters offered for a device (empty when none fit — picker hides). */
export function boostersForDevice(deviceName) {
  const shape = getFilterShape(deviceName);
  if (!shape || shape === 'disc' || shape === 'trapezoid') return [];
  const fitting = BOOSTER_PRESETS.filter(b =>
    b.id === 'none' ||
    (b.fitsShape && b.fitsShape === shape) ||
    (Array.isArray(b.fits) && b.fits.includes(deviceName))
  );
  return fitting.length > 1 ? fitting : [];
}

/**
 * The engine-facing adjustment for a chosen paper + booster on a device.
 * Unknown ids and paperless devices resolve to neutral — the engine never
 * fails on a bad input.
 */
export function getFilterAdjustment(filterId, boosterId, deviceName) {
  const shape = getFilterShape(deviceName);
  if (!shape) return { ...NEUTRAL };

  const preset = FILTER_PRESETS.find(p => p.id === filterId && p.shapes.includes(shape));
  const speed = FILTER_SPEEDS[preset?.speed] || FILTER_SPEEDS.standard;
  const boosterOk = boosterId && boosterId !== 'none' &&
    boostersForDevice(deviceName).some(b => b.id === boosterId);

  const notes = [];
  if (speed.note) notes.push(speed.note);
  if (boosterOk) notes.push(BOOSTER_EFFECT.note);

  return {
    speed: speed.id,
    label: preset && preset.id !== 'standard' ? preset.label : '',
    grindTDelta: speed.grindTDelta + (boosterOk ? BOOSTER_EFFECT.grindTDelta : 0),
    timeShift: speed.timeShift,
    timeFactor: speed.timeFactor,
    boosted: !!boosterOk,
    notes,
  };
}
