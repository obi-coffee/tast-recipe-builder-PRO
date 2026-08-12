/**
 * Per-device brewing parameters — the core of the tāst knowledge well.
 *
 * Values are grounded in published sources (SCA, Hoffmann, Rao, Kasuya,
 * brewer-maker guides incl. Orea, Kalita, Chemex). The engine reads this data
 * so the same coffee + gear always yields the same recipe.
 *
 * House default pour-over strength is 1:16.8 (founder decision). Brewers with
 * strong maker guidance keep their own published ratios (Kalita 1:16, Chemex
 * 1:16.7, the Orea line ~1:16.7), which is the more credible call per device.
 *
 * Fields:
 *  - category    'Pour Over' | 'Immersion' | 'Espresso' | 'Cold'
 *  - grindKey    grinder brewRange to read: 'pourOver'|'immersion'|'espresso'|'coldBrew'
 *  - grindBias   nudge within that range (− finer, + coarser)
 *  - baseRatio   water:coffee at MEDIUM roast (espresso = yield ratio)
 *  - baseTempC   water temp at MEDIUM roast, °C (null = ambient cold brew)
 *  - totalTime   display string for total brew/shot/steep time
 *  - bloom       { ratio, seconds } for pour-over; null otherwise
 *  - pours       staged pours after bloom (pour-over only)
 *  - style       engine routing: 'filter'|'espresso'|'moka'|'coldsteep'|'flash'|'frenchpress'|'aeropress'|'steepdrain'
 *  - ratioDecimals  decimals shown on the ratio
 *  - notes       device-specific brewing notes
 */

export const DEVICES = {
  // ── Pour Over ────────────────────────────────────────────────────────
  'V60 02': {
    category: 'Pour Over', grindKey: 'pourOver', grindBias: 0,
    baseRatio: 16.8, baseTempC: 93, totalTime: '2:30–3:30',
    bloom: { ratio: 2.5, seconds: 40 }, pours: 3, style: 'filter', ratioDecimals: 1,
    notes: ['Pour in slow concentric circles; keep water off the filter walls.',
            'Lighter roasts like a more energetic pour to lift extraction.'],
  },
  'V60 01': {
    category: 'Pour Over', grindKey: 'pourOver', grindBias: -0.05,
    baseRatio: 16.8, baseTempC: 93, totalTime: '2:00–3:00',
    bloom: { ratio: 2.5, seconds: 40 }, pours: 2, style: 'filter', ratioDecimals: 1,
    notes: ['Single-cup cone — grind a touch finer than the 02 and pour gently.'],
  },
  'Kalita Wave 185': {
    category: 'Pour Over', grindKey: 'pourOver', grindBias: 0.05,
    baseRatio: 16, baseTempC: 94, totalTime: '3:00–3:45',
    bloom: { ratio: 2.5, seconds: 40 }, pours: 3, style: 'filter', ratioDecimals: 0,
    notes: ['Flat bed with three small holes — forgiving and sweetness-forward.',
            'Use pulse pours: pour ~50g, let it drain toward the bed, then pour again every ~25s.',
            'Dial grind before pour technique — the Wave is sensitive to grind, forgiving of pour.'],
  },
  'Kalita Wave 155': {
    category: 'Pour Over', grindKey: 'pourOver', grindBias: 0,
    baseRatio: 16, baseTempC: 94, totalTime: '2:30–3:30',
    bloom: { ratio: 2.5, seconds: 40 }, pours: 2, style: 'filter', ratioDecimals: 0,
    notes: ['Single-cup flat bed — grind slightly finer than the 185.',
            'Pulse pours; let the bed settle between pours for an even, sweet cup.'],
  },
  'Chemex 6-Cup': {
    category: 'Pour Over', grindKey: 'pourOver', grindBias: 0.15,
    baseRatio: 16.7, baseTempC: 95, totalTime: '4:00–5:00',
    bloom: { ratio: 2.5, seconds: 45 }, pours: 4, style: 'filter', ratioDecimals: 1,
    notes: ['Thick bonded filter (3-layer side toward the spout) slows flow — grind coarser, like sea salt.',
            'Hoffmann move: stir clockwise then counter-clockwise around 1:45, then a gentle shake to settle the bed.',
            'Clean, bright cup; higher temps are safe here.'],
  },
  'Chemex 3-Cup': {
    category: 'Pour Over', grindKey: 'pourOver', grindBias: 0.15,
    baseRatio: 16.7, baseTempC: 95, totalTime: '3:00–4:00',
    bloom: { ratio: 2.5, seconds: 45 }, pours: 3, style: 'filter', ratioDecimals: 1,
    notes: ['Same thick filter as the 6-cup — keep the grind coarse and the 3-layer side to the spout.',
            'A gentle stir then shake mid-brew evens the bed.'],
  },
  'Origami': {
    category: 'Pour Over', grindKey: 'pourOver', grindBias: 0,
    baseRatio: 16.8, baseTempC: 93, totalTime: '2:45–3:45',
    bloom: { ratio: 2.5, seconds: 40 }, pours: 3, style: 'filter', ratioDecimals: 1,
    notes: ['With a conical filter, treat like a V60; with a flat filter, like a Kalita.'],
  },
  'December Dripper': {
    category: 'Pour Over', grindKey: 'pourOver', grindBias: 0,
    baseRatio: 16.8, baseTempC: 93, totalTime: '2:30–3:30',
    bloom: { ratio: 2.5, seconds: 40 }, pours: 3, style: 'filter', ratioDecimals: 1,
    notes: ['Open the valve for V60-style flow, or close it for an immersion steep.'],
  },
  'Stagg X': {
    category: 'Pour Over', grindKey: 'pourOver', grindBias: 0,
    baseRatio: 16.8, baseTempC: 93, totalTime: '2:30–3:30',
    bloom: { ratio: 2, seconds: 30 }, pours: 2, style: 'filter', ratioDecimals: 1,
    notes: ['Simple two-pour technique — the dripper is built for consistency.'],
  },
  'Melitta': {
    category: 'Pour Over', grindKey: 'pourOver', grindBias: 0.05,
    baseRatio: 16.8, baseTempC: 93, totalTime: '3:00–4:30',
    bloom: { ratio: 2, seconds: 40 }, pours: 3, style: 'filter', ratioDecimals: 1,
    notes: ['Single drain hole stalls easily — don’t pour too fast.'],
  },

  // ── Orea line (flat-bottom, fast-flow; designed around light roasts) ──
  'Orea O1': {
    category: 'Pour Over', grindKey: 'pourOver', grindBias: -0.1,
    baseRatio: 16.7, baseTempC: 94, totalTime: '2:00–2:45',
    bloom: { ratio: 2.5, seconds: 35 }, pours: 3, style: 'filter', ratioDecimals: 1,
    notes: ['Open flat-bottom single-cup brewer — bright, clean, light-bodied.',
            'Pulse pours at ~5 g/s; pour again as the water nearly reaches the bed.',
            'Tuned for light roasts; for darker, grind a touch finer and drop the temperature.'],
  },
  'Orea V3': {
    category: 'Pour Over', grindKey: 'pourOver', grindBias: -0.05,
    baseRatio: 16.7, baseTempC: 94, totalTime: '2:30–3:30',
    bloom: { ratio: 2.5, seconds: 40 }, pours: 4, style: 'filter', ratioDecimals: 1,
    notes: ['Flat-bottom predecessor to the V4 — even, fast, forgiving.',
            'Spiral pulse pours; let the bed settle between pours.'],
  },
  'Orea V4': {
    category: 'Pour Over', grindKey: 'pourOver', grindBias: -0.05,
    baseRatio: 16.7, baseTempC: 94, totalTime: '2:30–3:00',
    bloom: { ratio: 2.5, seconds: 40 }, pours: 4, style: 'filter', ratioDecimals: 1,
    notes: ['Modular flat-bottom: FAST bottom = grind a little finer, CLASSIC = a little coarser.',
            'Spiral pulse pours at ~5 g/s; designed around light roasts.',
            'No need to pre-heat — the wall insulates; just pre-wet the paper.'],
  },
  'Orea Z1': {
    category: 'Pour Over', grindKey: 'pourOver', grindBias: -0.1,
    baseRatio: 16.5, baseTempC: 94, totalTime: '2:15–3:00',
    bloom: { ratio: 2.5, seconds: 40 }, pours: 3, style: 'filter', ratioDecimals: 1,
    notes: ['Zero-bypass single-cup brewer — every drop passes through the bed for a richer cup.',
            'The Melodrip drip assist is mandatory; skip WDT, stirring, and pre-wetting.',
            'Denser washed coffees drain slower here — that’s normal; adjust grind or patience.'],
  },
  'Orea Big Boy': {
    category: 'Pour Over', grindKey: 'pourOver', grindBias: 0.1,
    baseRatio: 16, baseTempC: 93, totalTime: '3:00–4:30',
    bloom: { ratio: 2, seconds: 40 }, pours: 4, style: 'filter', ratioDecimals: 0,
    notes: ['Large-format brewer for 2+ cups (wide 8 cm bed) — use big pours, over 150 g each.',
            'Pour a touch faster (~6 g/s) to keep the deep bed fed and level.'],
  },

  // ── Immersion ────────────────────────────────────────────────────────
  'French Press': {
    category: 'Immersion', grindKey: 'immersion', grindBias: 0.1,
    baseRatio: 16, baseTempC: 94, totalTime: '9:00–12:00',
    bloom: null, pours: 0, style: 'frenchpress', ratioDecimals: 0,
    notes: ['Hoffmann method: steep 4 min, break the crust, skim, then wait and press gently.',
            'Press only to the surface — don’t plunge to the bottom.'],
  },
  'AeroPress': {
    category: 'Immersion', grindKey: 'pourOver', grindBias: 0.1,
    baseRatio: 14, baseTempC: 92, totalTime: '1:30–2:30',
    bloom: null, pours: 0, style: 'aeropress', ratioDecimals: 0,
    notes: ['Add water, stir 3–5 times, steep, then press slowly and stop at the hiss.',
            'A bypass splash of hot water after pressing adds clarity.'],
  },
  'Clever Dripper': {
    category: 'Immersion', grindKey: 'immersion', grindBias: -0.1,
    baseRatio: 16, baseTempC: 94, totalTime: '3:00–4:30',
    bloom: null, pours: 0, style: 'steepdrain', ratioDecimals: 0,
    notes: ['Add all the water, steep, then set on your mug to drain — very forgiving.'],
  },
  'Hario Switch': {
    category: 'Immersion', grindKey: 'immersion', grindBias: -0.1,
    baseRatio: 16, baseTempC: 94, totalTime: '2:30–3:30',
    bloom: null, pours: 0, style: 'steepdrain', ratioDecimals: 0,
    notes: ['Close the valve to steep, then open to drain like a V60.'],
  },

  // ── Espresso ─────────────────────────────────────────────────────────
  'Home Machine': {
    category: 'Espresso', grindKey: 'espresso', grindBias: 0,
    baseRatio: 2.0, baseTempC: 92, totalTime: '25–35s',
    bloom: null, pours: 0, style: 'espresso', ratioDecimals: 1, dose: 18,
    notes: ['Distribute and tamp level; WDT with a needle tool reduces channeling.',
            'Aim for 25–35s. Faster = grind finer; slower = grind coarser.'],
  },
  'Manual Lever': {
    category: 'Espresso', grindKey: 'espresso', grindBias: 0.05,
    baseRatio: 2.0, baseTempC: 92, totalTime: '25–40s',
    bloom: null, pours: 0, style: 'espresso', ratioDecimals: 1, dose: 18,
    notes: ['Ramp the lever gently to a peak, then ease off — avoid slamming it.'],
  },
  'Moka Pot': {
    category: 'Espresso', grindKey: 'espresso', grindBias: 0.3,
    baseRatio: 8, baseTempC: 99, totalTime: '3:00–5:00',
    bloom: null, pours: 0, style: 'moka', ratioDecimals: 0,
    notes: ['Fill the basket loosely — do NOT tamp. Start with hot water and low-medium heat.',
            'Pull it off the heat the moment it blondes and sputters; cool the base under tap water.'],
  },

  // ── Cold ─────────────────────────────────────────────────────────────
  'Flash Brew (Japanese Iced)': {
    category: 'Cold', grindKey: 'pourOver', grindBias: -0.1,
    baseRatio: 13, baseTempC: 99, totalTime: '2:00–2:30',
    bloom: { ratio: 2.5, seconds: 35 }, pours: 2, style: 'flash', ratioDecimals: 0,
    notes: ['Brew hot directly onto ice. Use ~60% hot water and ~40% ice by weight of the total.',
            'Grind a little finer than normal pour-over to offset the ice dilution.'],
  },
  'Toddy Cold Brew': {
    category: 'Cold', grindKey: 'coldBrew', grindBias: 0,
    baseRatio: 12, baseTempC: null, totalTime: '12–18 hours',
    bloom: null, pours: 0, style: 'coldsteep', ratioDecimals: 0,
    notes: ['Extra-coarse grind, room-temp or cold water. Steep 12–18h, then drain through the filter.',
            'For a concentrate, brew at 1:8 and dilute to taste.'],
  },
  'Hario Cold Brew Bottle': {
    category: 'Cold', grindKey: 'coldBrew', grindBias: 0,
    baseRatio: 13, baseTempC: null, totalTime: '8–18 hours',
    bloom: null, pours: 0, style: 'coldsteep', ratioDecimals: 0,
    notes: ['Add coffee to the filter, fill with cold water, steep in the fridge 8–18h.'],
  },
  'Mason Jar Cold Brew': {
    category: 'Cold', grindKey: 'coldBrew', grindBias: 0,
    baseRatio: 12, baseTempC: null, totalTime: '12–24 hours',
    bloom: null, pours: 0, style: 'coldsteep', ratioDecimals: 0,
    notes: ['Combine, steep 12–24h, then strain through cheesecloth plus a paper filter.'],
  },
};

export const DEFAULT_DEVICE = {
  category: 'Pour Over', grindKey: 'pourOver', grindBias: 0,
  baseRatio: 16.8, baseTempC: 93, totalTime: '2:30–3:30',
  bloom: { ratio: 2.5, seconds: 40 }, pours: 3, style: 'filter', ratioDecimals: 1,
  notes: ['Standard pour-over parameters; adjust grind to taste.'],
};

export function getDevice(deviceName) {
  return DEVICES[deviceName] || DEFAULT_DEVICE;
}
