/**
 * Signature brew methods — part of the tāst knowledge well.
 *
 * Beyond the tāst Balanced default, users can brew a champion's actual recipe
 * (Hoffmann, Kasuya, Rao, Championship AeroPress) and — on Orea brewers — the
 * maker's own named recipes pulled straight from their guides.
 *
 * appliesTo(device, deviceName) decides where a method is offered. Most methods
 * key off the device's shape (category/style); Orea recipes key off the exact
 * brewer name.
 *
 * fit — the "Best for the bean" table. Each method may carry a `fit` with
 * per-process-family and per-roast scores plus a one-line `why`. The
 * recommender (recommendMethod) adds family + roast for every method the
 * brewer supports and picks the highest; tāst Balanced scores 0 everywhere,
 * so a specialist method must have a positive reason to win. No `fit` means
 * the method is never auto-picked (it's still available manually).
 *
 * Sources: Hoffmann Ultimate V60 (Hario); Tetsu Kasuya 4:6 (Hario/Philocoffea);
 * Scott Rao V60 (Hario); World AeroPress Championship; Orea brewer guides
 * (orea.uk/guides-o1, -v3, -v4, -z1, -big-boy).
 */

const BASE_METHODS = {
  balanced: {
    id: 'balanced', label: 'tāst Balanced',
    blurb: 'Our reliable, approachable default for any brewer.',
    appliesTo: () => true, overrides: null,
    fit: {
      families: {}, roasts: {},
      why: 'Nothing about this coffee calls for a specialist recipe, so the reliable default gives the cleanest read of what the roaster intended.',
    },
  },
  hoffmann: {
    id: 'hoffmann', label: 'Hoffmann V60',
    blurb: 'James Hoffmann’s Ultimate V60 — clarity-forward, two simple pours, hot water.',
    appliesTo: (d) => d.category === 'Pour Over' && d.style === 'filter',
    overrides: { ratio: 16.7, ratioDecimals: 1, bloom: { ratio: 2.0, seconds: 45 }, pours: 2, totalTime: '3:00–3:30', tempBump: +1, stepStyle: 'filter' },
    source: 'Hoffmann, Ultimate V60 (Hario)',
    fit: {
      families: { washed: 2, 'washed-ferment': 1, honey: 1, natural: 0, anaerobic: -2, 'wet-hulled': -2 },
      roasts: { 'Light': 2, 'Light-Medium': 1, 'Medium': 0, 'Medium-Dark': -1, 'Dark': -2 },
      why: 'A clean, lighter-roasted coffee rewards clarity — Hoffmann’s hot water and two simple pours pull out the florals and acidity without muddying them.',
    },
  },
  kasuya46: {
    id: 'kasuya46', label: 'Kasuya 4:6',
    blurb: 'Tetsu Kasuya’s World-Champion method — first 40% sets sweetness/acidity, last 60% sets strength.',
    appliesTo: (d) => d.category === 'Pour Over' && d.style === 'filter',
    overrides: { ratio: 15, ratioDecimals: 0, grindBiasDelta: +0.2, bloom: null, pours: 5, totalTime: '3:00–3:45', stepStyle: 'kasuya', tempByRoast: { 'Light': 93, 'Light-Medium': 91, 'Medium': 88, 'Medium-Dark': 85, 'Dark': 83 } },
    source: 'Kasuya, 4:6 method (Philocoffea / Hario)',
    fit: {
      families: { washed: 0, 'washed-ferment': 1, honey: 1, natural: 1, anaerobic: 2, 'wet-hulled': 1 },
      roasts: { 'Light': 0, 'Light-Medium': 0, 'Medium': 0, 'Medium-Dark': 1, 'Dark': 2 },
      why: 'The 4:6 split sets sweetness in the first 40% and strength in the last 60% — the control a fruit-forward, fermented or darker coffee needs — and its roast-tuned cooler water keeps ferment and roastiness in check.',
    },
  },
  rao: {
    id: 'rao', label: 'Rao Spin',
    blurb: 'Scott Rao’s even-extraction method — big bloom with a stir, one steady pour, then a swirl.',
    appliesTo: (d) => d.category === 'Pour Over' && d.style === 'filter',
    overrides: { ratio: 16.4, ratioDecimals: 1, bloom: { ratio: 3.0, seconds: 45 }, pours: 1, totalTime: '3:00', stepStyle: 'rao' },
    source: 'Rao, V60 technique (Hario)',
    fit: {
      families: { washed: 1, 'washed-ferment': 1, honey: 1, natural: 1, anaerobic: 0, 'wet-hulled': 0 },
      roasts: { 'Light': 0, 'Light-Medium': 1, 'Medium': 1, 'Medium-Dark': 0, 'Dark': -1 },
      why: 'A medium-bodied coffee that isn’t chasing extremes brews most evenly with Rao’s big stirred bloom and single steady pour — the swirl flattens the bed so every gram extracts the same.',
    },
  },
  champ_aeropress: {
    id: 'champ_aeropress', label: 'Championship AeroPress',
    blurb: 'World AeroPress Championship style — inverted, cooler water, bypass dilution for clarity.',
    appliesTo: (d) => d.style === 'aeropress',
    overrides: { ratio: 6, ratioDecimals: 0, tempOverride: 83, dose: 18, totalTime: '1:30–2:30', stepStyle: 'champ', bypassRatio: 1.4 },
    source: 'World AeroPress Championship recipes',
    fit: {
      families: { washed: 1, 'washed-ferment': 1, honey: 1, natural: 1, anaerobic: 2, 'wet-hulled': 0 },
      roasts: { 'Light': 1, 'Light-Medium': 1, 'Medium': 0, 'Medium-Dark': 0, 'Dark': -1 },
      why: 'Cooler water and a bypass dilution give a concentrated, clear cup — a lighter or fermented coffee keeps its fruit without the heaviness a full-immersion AeroPress can add.',
    },
  },
};

// ── Orea maker recipes (complete set from each brewer's guide) ────────
// Each: name, dose, water (poured/brew water), temp °C, grind (relative nudge),
// time, pours [[cumulative grams, 'm:ss'], ...], optional ice / bypass grams.
// Pours store as fractions of the brew water so they scale to any weight; the
// ratio is total liquid (water + ice + bypass) ÷ dose. We skip literal
// "for two" duplicates (the engine scales by weight) and the Z1 Switch-adapter
// immersion recipes (those need an accessory + a different brew mode).
const OREA_RECIPES = {
  'Orea O1': [
    { id: 'base_one', name: 'Base One', dose: 12, water: 200, temp: 96, grind: 0, time: '2:00–2:30', pours: [[50, '0:00'], [100, '0:40'], [150, '1:10'], [200, '1:40']], blurb: 'Familiar V60/Kalita-style cup — bright, light-bodied.' },
    { id: 'dara', name: 'The Dara', dose: 12, water: 200, temp: 94, grind: 0, time: '2:30–3:00', pours: [[40, '0:00'], [90, '0:40'], [150, '1:20'], [200, '2:00']], blurb: 'A balanced brew from Orea friend Dara in Madrid.' },
    { id: 'wide', name: 'The Wide', dose: 10, water: 200, temp: 96, grind: -0.25, time: '3:30–4:30', pours: [[50, '0:00'], [125, '1:00'], [200, '2:00']], blurb: 'High-extraction, wide ratio with a fine grind on flat paper.' },
    { id: 'mid', name: 'The Mid', dose: 12, water: 200, temp: 92, grind: 0, time: '2:30–3:30', pours: [[50, '0:00'], [125, '0:40'], [200, '1:45']], blurb: 'Simple three-pour that works for all coffees.' },
    { id: 'easy', name: 'Easy Does It', dose: 16, water: 260, temp: 94, grind: 0.1, time: '2:40–3:40', pours: [[60, '0:00'], [110, '0:40'], [160, '1:10'], [210, '1:40'], [260, '2:10']], blurb: 'Orea’s go-to five-pour pulse recipe.' },
    { id: 'fine', name: 'The Fine', dose: 12, water: 200, temp: 94, grind: -0.2, time: '~2:00', pours: [[50, '0:00'], [200, '0:40']], blurb: 'A single-pour, sub-two-minute community favourite.' },
    { id: 'bypass', name: 'The Bypass', dose: 18, water: 260, temp: 96, grind: 0, time: '2:30–3:00', pours: [[60, '0:00'], [160, '0:40'], [260, '1:30']], bypass: 30, blurb: 'Matteo D’Ottavio’s recipe — a bypass balances the cup.' },
    { id: 'techno', name: 'The Techno', dose: 12.4, water: 200, temp: 94, grind: 0.05, time: '2:30–3:00', pours: [[40, '0:00'], [120, '0:30'], [160, '1:20'], [200, '1:45']], blurb: 'A progressive recipe that speeds up as it goes.' },
    { id: 'ice', name: 'The Ice', dose: 18, water: 160, temp: 94, grind: 0, time: '1:40–2:20', pours: [[40, '0:00'], [80, '0:40'], [120, '1:00'], [160, '1:20']], ice: 140, blurb: 'A bright flash brew straight onto ice.' },
    { id: 'bright', name: 'The Bright', dose: 18, water: 300, temp: 94, grind: 0, time: '2:00–2:45', pours: [[75, '0:00'], [150, '0:30'], [300, '1:00']], blurb: 'An easy 75/75/150 cadence for a bright, happy cup.' },
  ],
  'Orea V3': [
    { id: 'base_one', name: 'Base One', dose: 12, water: 200, temp: 96, grind: 0, time: '2:00–2:30', pours: [[50, '0:00'], [100, '0:40'], [150, '1:10'], [200, '1:40']], blurb: 'Familiar V60/Kalita-style cup — bright, light-bodied.' },
    { id: 'base_two', name: 'Base Two', dose: 18, water: 300, temp: 94, grind: 0, time: '2:30–3:30', pours: [[60, '0:00'], [140, '0:40'], [220, '1:20'], [300, '2:00']], blurb: 'A balanced pulse classic for a bigger cup.' },
    { id: 'wide', name: 'The Wide', dose: 10, water: 200, temp: 96, grind: -0.25, time: '3:30–4:30', pours: [[50, '0:00'], [125, '1:00'], [200, '2:00']], blurb: 'High-extraction wide ratio with a fine grind.' },
    { id: 'mid', name: 'The Mid', dose: 12, water: 200, temp: 92, grind: 0, time: '2:30–3:30', pours: [[50, '0:00'], [125, '0:40'], [200, '1:45']], blurb: 'Simple three-pour for all coffees.' },
    { id: 'pulse', name: 'The Pulse', dose: 16, water: 260, temp: 94, grind: 0.1, time: '2:40–3:40', pours: [[60, '0:00'], [110, '0:40'], [160, '1:10'], [210, '1:40'], [260, '2:10']], blurb: 'A five-pour pulse that works for all coffees.' },
    { id: 'fine', name: 'The Fine', dose: 12, water: 200, temp: 94, grind: -0.2, time: '~2:00', pours: [[50, '0:00'], [200, '0:40']], blurb: 'A single-pour, sub-two-minute favourite.' },
    { id: 'ice', name: 'The Ice', dose: 18, water: 160, temp: 94, grind: 0, time: '1:40–2:20', pours: [[40, '0:00'], [80, '0:40'], [120, '1:00'], [160, '1:20']], ice: 140, blurb: 'A bright flash brew onto ice.' },
    { id: 'bright', name: 'The Bright', dose: 18, water: 300, temp: 94, grind: 0, time: '2:00–2:45', pours: [[75, '0:00'], [150, '0:30'], [300, '1:00']], blurb: 'An easy 75/75/150 cadence for a bright cup.' },
  ],
  'Orea V4': [
    { id: 'easy', name: 'Easy Does It', dose: 16, water: 260, temp: 94, grind: 0.05, time: '2:30–3:00', pours: [[60, '0:00'], [110, '0:40'], [160, '1:15'], [210, '1:45'], [260, '2:15']], blurb: 'Orea’s go-to pulse recipe (FAST bottom).' },
    { id: 'dara', name: 'The Dara', dose: 12, water: 200, temp: 92, grind: 0, time: '2:30–3:00', pours: [[40, '0:00'], [90, '0:40'], [150, '1:20'], [200, '2:00']], blurb: 'A balanced brew on the OPEN bottom.' },
    { id: 'fine', name: 'The Fine', dose: 16, water: 260, temp: 90, grind: -0.15, time: '2:30–3:00', pours: [[60, '0:00'], [260, '0:40']], blurb: 'Sweet, punchy, juicy — wide ratio, fine grind for washed coffees.' },
    { id: 'aussie', name: 'The Aussie', dose: 18, water: 250, temp: 97, grind: 0.15, time: '2:30–3:00', pours: [[50, '0:00'], [100, '0:40'], [150, '1:10'], [200, '1:40'], [250, '2:10']], blurb: 'Dose up, grind coarse — a delicate, tea-like cup that tames ferment.' },
    { id: 'champ', name: 'The Champ', dose: 17, water: 270, temp: 93, grind: 0.05, time: '2:30–3:00', pours: [[60, '0:00'], [120, '0:30'], [170, '1:20'], [270, '2:00']], blurb: 'Martin Wölfl’s World Brewers Cup–winning V4 recipe.' },
    { id: 'bypass', name: 'The Bypass', dose: 18, water: 260, temp: 96, grind: 0, time: '2:30–3:00', pours: [[60, '0:00'], [160, '0:40'], [260, '1:30']], bypass: 30, blurb: 'Matteo D’Ottavio’s recipe with a balancing bypass.' },
    { id: 'techno', name: 'The Techno', dose: 12.4, water: 200, temp: 94, grind: 0.05, time: '2:30–3:00', pours: [[40, '0:00'], [120, '0:30'], [160, '1:20'], [200, '1:45']], blurb: 'A progressive recipe that speeds up as it goes.' },
    { id: 'og_base', name: 'The OG Base #2', dose: 18, water: 300, temp: 96, grind: 0, time: '2:30–3:00', pours: [[60, '0:00'], [140, '0:30'], [220, '1:10'], [300, '1:50']], blurb: 'A V2-era classic — flexible, great with washed coffees.' },
    { id: 'og_iced', name: 'The OG Iced', dose: 18, water: 160, temp: 92, grind: 0, time: '1:50–2:15', pours: [[40, '0:00'], [80, '0:30'], [120, '0:50'], [160, '1:20']], ice: 140, blurb: 'Orea’s original iced pour-over — juicy and fruity.' },
    { id: 'so_soft', name: 'The So Soft', dose: 16, water: 250, temp: 92, grind: 0.15, time: '2:20–2:40', pours: [[50, '0:00'], [100, '0:30'], [200, '1:00'], [250, '1:30']], blurb: 'A soft, clean conical recipe for the V4 Wide + APEX.' },
    { id: 'four_six', name: 'The Four Six', dose: 20, water: 300, temp: 92, grind: 0.1, time: '2:30–3:20', pours: [[70, '0:00'], [120, '0:40'], [210, '1:20'], [300, '2:00']], blurb: 'Kasuya’s 4:6, Orea’s way — first 40% balance, last 60% strength.' },
  ],
  'Orea Z1': [
    { id: 'easy', name: 'Easy Does It', dose: 16, water: 260, temp: 96, grind: 0.05, time: '2:30–3:00', pours: [[60, '0:00'], [110, '0:40'], [160, '1:15'], [210, '1:45'], [260, '2:15']], blurb: 'The Z1 base pulse recipe (zero-bypass, Melodrip).' },
    { id: 'lazy', name: 'Lazy Sunday', dose: 15, water: 250, temp: 96, grind: 0, time: '2:30–3:00', pours: [[50, '0:00'], [150, '0:40'], [250, '1:45']], blurb: 'Few pours, easy to remember — for relaxed weekends.' },
    { id: 'dara', name: 'The Dara', dose: 12, water: 200, temp: 94, grind: 0, time: '2:30–3:00', pours: [[40, '0:00'], [90, '0:40'], [150, '1:20'], [200, '2:00']], blurb: 'A clean, juicy, balanced brew from Dara in Madrid.' },
    { id: 'dara_a', name: 'The Dara (A)', dose: 15, water: 250, temp: 92, grind: 0, time: '2:30–3:00', pours: [[50, '0:00'], [150, '0:40'], [200, '1:30'], [250, '2:00']], blurb: 'A juicier, complex variation of the Dara.' },
    { id: 'ray', name: 'The Ray', dose: 15, water: 255, temp: 92, grind: -0.1, time: '3:00–3:30', pours: [[40, '0:00'], [100, '0:40'], [160, '1:15'], [255, '2:00']], blurb: 'Ray Murakawa’s recipe — higher TDS, super juicy and silky.' },
    { id: 'aussie', name: 'The Aussie', dose: 18, water: 250, temp: 97, grind: 0.15, time: '2:30–3:00', pours: [[50, '0:00'], [100, '0:40'], [150, '1:10'], [200, '1:40'], [250, '2:10']], blurb: 'Dose up, grind coarse for a delicate, tea-like cup.' },
    { id: 'scandi', name: 'The Scandi', dose: 12, water: 200, temp: 93, grind: 0, time: '2:30–3:00', pours: [[100, '0:00'], [200, '1:15']], blurb: 'Two big pours — super-simple and quick.' },
    { id: 'four_six', name: 'The Four Six', dose: 14, water: 225, temp: 94, grind: 0.05, time: '2:40–3:15', pours: [[35, '0:00'], [90, '0:40'], [135, '1:20'], [180, '1:45'], [225, '2:05']], blurb: 'Kasuya’s 4:6, adapted for the Z1 (sweeter split).' },
    { id: 'champ', name: 'The Champ', dose: 17, water: 270, temp: 93, grind: 0, time: '3:00–3:30', pours: [[60, '0:00'], [120, '0:40'], [170, '1:25'], [270, '2:15']], blurb: 'Martin Wölfl’s World-winning recipe, adapted for the Z1.' },
    { id: 'fine', name: 'The Fine', dose: 10, water: 200, temp: 92, grind: -0.2, time: '2:30–3:00', pours: [[40, '0:00'], [200, '0:40']], blurb: 'Sweet, punchy, high-extraction single pour for washed coffees.' },
    { id: 'pulse', name: 'The Pulse', dose: 12, water: 200, temp: 96, grind: 0.05, time: '3:00–3:30', pours: [[40, '0:00'], [80, '0:40'], [120, '1:25'], [160, '2:00'], [200, '2:15']], blurb: 'A classic five-pour pulse recipe.' },
  ],
  'Orea Big Boy': [
    { id: 'base', name: 'The Base', dose: 40, water: 600, temp: 92, grind: 0.1, time: '3:00–4:00', pours: [[100, '0:00'], [350, '0:45'], [600, '2:00']], blurb: 'The Big Boy base — a two-cup batch with big pours.' },
    { id: 'litre', name: 'The Litre', dose: 60, water: 1000, temp: 92, grind: 0.12, time: '3:15–4:30', pours: [[160, '0:00'], [440, '1:00'], [720, '2:15'], [1000, '3:15']], blurb: 'A whole litre of coffee for four — keep the bed fed.' },
    { id: 'pulse', name: 'The Pulse', dose: 40, water: 600, temp: 92, grind: 0.1, time: '3:30–4:30', pours: [[150, '0:00'], [300, '1:00'], [450, '1:45'], [600, '2:30']], blurb: 'A four-pour batch pulse for a balanced big brew.' },
  ],
};

// Fit tables for Orea maker recipes, keyed by recipe id (shared across
// brewers). Taken from each recipe's own stated intent in the Orea guides.
const OREA_FITS = {
  fine: {
    families: { washed: 2, 'washed-ferment': 1, honey: 0, natural: -1, anaerobic: -2, 'wet-hulled': -2 },
    roasts: { 'Light': 1, 'Light-Medium': 1, 'Medium': 0, 'Medium-Dark': -1, 'Dark': -2 },
    why: 'Orea built The Fine for washed coffees — a wide ratio and fine grind pull a sweet, punchy, juicy cup out of a clean lot.',
  },
  aussie: {
    families: { washed: -1, 'washed-ferment': 0, honey: 1, natural: 1, anaerobic: 3, 'wet-hulled': 0 },
    roasts: { 'Light': 0, 'Light-Medium': 0, 'Medium': 0, 'Medium-Dark': 0, 'Dark': 0 },
    why: 'The Aussie doses up and grinds coarse for a delicate, tea-like cup — Orea’s own answer for taming heavy ferment so the fruit reads as fruit, not booze.',
  },
  og_base: {
    families: { washed: 1, 'washed-ferment': 1, honey: 0, natural: 0, anaerobic: -1, 'wet-hulled': 0 },
    roasts: { 'Light': 0, 'Light-Medium': 0, 'Medium': 1, 'Medium-Dark': 0, 'Dark': 0 },
    why: 'The OG Base #2 is Orea’s flexible classic for washed coffees — four even pours that let a medium roast show its balance.',
  },
  wide: {
    families: { washed: 1, 'washed-ferment': 1, honey: 0, natural: 0, anaerobic: -1, 'wet-hulled': -1 },
    roasts: { 'Light': 1, 'Light-Medium': 1, 'Medium': 0, 'Medium-Dark': -1, 'Dark': -2 },
    why: 'The Wide pairs a high-extraction wide ratio with a fine grind — a dense, light washed coffee has the structure to take it.',
  },
  bright: {
    families: { washed: 1, 'washed-ferment': 0, honey: 1, natural: 0, anaerobic: -1, 'wet-hulled': -1 },
    roasts: { 'Light': 1, 'Light-Medium': 1, 'Medium': 0, 'Medium-Dark': -1, 'Dark': -1 },
    why: 'The Bright’s easy 75/75/150 cadence keeps a clean lighter roast lively and sweet.',
  },
  four_six: {
    families: { washed: 0, 'washed-ferment': 0, honey: 1, natural: 1, anaerobic: 1, 'wet-hulled': 1 },
    roasts: { 'Light': 0, 'Light-Medium': 0, 'Medium': 0, 'Medium-Dark': 1, 'Dark': 2 },
    why: 'Kasuya’s 4:6 split, Orea’s way — the first 40% sets balance and the last 60% sets strength, which gives a darker or fermented coffee the control it needs.',
  },
  so_soft: {
    families: { washed: 0, 'washed-ferment': 0, honey: 1, natural: 1, anaerobic: 0, 'wet-hulled': 0 },
    roasts: { 'Light': 0, 'Light-Medium': 0, 'Medium': 0, 'Medium-Dark': 1, 'Dark': 1 },
    why: 'The So Soft is a soft, clean conical recipe — it rounds off a sweeter natural or honey, or a darker roast, without pushing it.',
  },
  base: {
    families: { washed: 2, 'washed-ferment': 2, honey: 2, natural: 2, anaerobic: 2, 'wet-hulled': 2 },
    roasts: { 'Light': 0, 'Light-Medium': 0, 'Medium': 0, 'Medium-Dark': 0, 'Dark': 0 },
    why: 'The Big Boy is a batch brewer — Orea’s own Base recipe keeps the bed fed with big pours at this volume, where single-cup champion recipes don’t scale as cleanly.',
  },
  dara: {
    families: { washed: 0, 'washed-ferment': 0, honey: 1, natural: 1, anaerobic: 0, 'wet-hulled': 0 },
    roasts: { 'Light': 0, 'Light-Medium': 0, 'Medium': 0, 'Medium-Dark': 0, 'Dark': 0 },
    why: 'The Dara is a clean, juicy, balanced brew — a natural or honey keeps its fruit without the recipe getting in the way.',
  },
};

function buildOreaMethods() {
  const out = {};
  for (const [deviceName, recipes] of Object.entries(OREA_RECIPES)) {
    const short = deviceName.replace('Orea ', '');
    for (const r of recipes) {
      const ice = r.ice || 0;
      const bypass = r.bypass || 0;
      const total = r.water + ice + bypass;
      const id = `orea_${short.toLowerCase().replace(/\s+/g, '')}_${r.id}`;
      const pourPlan = r.pours.map(([g, t]) => ({ f: g / r.water, t }));
      out[id] = {
        id, label: `Orea · ${r.name}`, blurb: r.blurb,
        appliesTo: (_d, name) => name === deviceName,
        overrides: {
          ratio: total / r.dose, ratioDecimals: 1, fixedRatio: true, tempOverride: r.temp,
          grindBiasDelta: r.grind, bloom: null, stepStyle: 'orea',
          totalTime: r.time, pourPlan,
          hotFraction: r.water / total, iceFraction: ice / total, bypassFraction: bypass / total,
        },
        source: `Orea guide (${deviceName})`,
        fit: OREA_FITS[r.id] || null,
        maker: true, // written for this exact brewer
      };
    }
  }
  return out;
}

export const METHODS = { ...BASE_METHODS, ...buildOreaMethods() };

export const DEFAULT_METHOD = 'balanced';

export function getMethod(id) {
  return METHODS[id] || METHODS[DEFAULT_METHOD];
}

/** Method ids applicable to a given device (always includes 'balanced'). */
export function methodsForDevice(device, deviceName) {
  return Object.values(METHODS)
    .filter(m => m.appliesTo(device, deviceName))
    .map(m => ({ id: m.id, label: m.label, blurb: m.blurb }));
}

// ── "Best for the bean" ──────────────────────────────────────────────
// A pseudo-method id. When brewData.brewMethod is AUTO_METHOD, the engine asks
// recommendMethod() to pick the real method for this coffee + brewer, and the
// recipe reports which one it used and why.
export const AUTO_METHOD = 'auto';
export const AUTO_METHOD_META = {
  id: AUTO_METHOD,
  label: 'Best for the bean',
  blurb: 'Let the brew brain choose the method for this coffee.',
};

// Plain-language names for the engine's process families, used in the "why".
const FAMILY_WORDS = {
  washed: 'washed', 'washed-ferment': 'controlled-ferment washed', honey: 'honey-process',
  natural: 'natural', anaerobic: 'fermented', 'wet-hulled': 'wet-hulled',
};

/**
 * Pick the best method for a coffee on a given brewer. Deterministic: same
 * inputs → same pick. Scores every method the brewer supports as
 * fit.families[family] + fit.roasts[roast], plus MAKER_BONUS for a recipe the
 * brewer's maker wrote for that exact brewer; highest wins; a tie goes to the
 * maker recipe, otherwise to the earlier entry in METHODS.
 *
 * @param {object} args
 * @param {string} args.family     process family from getProcessAdjustment()
 * @param {string} args.roastLevel one of ROAST_LEVELS (blank → Medium)
 * @param {object} args.device     device object from getDevice()
 * @param {string} args.deviceName exact brewer name (for Orea recipes)
 * @returns {{ id: string, label: string, score: number, reason: string }}
 */
// A recipe the brewer's maker wrote for that exact brewer gets a small edge
// over a generic champion recipe when the two are otherwise close.
export const MAKER_BONUS = 1;

export function recommendMethod({ family = 'washed', roastLevel = 'Medium', device, deviceName } = {}) {
  const roast = roastLevel || 'Medium';
  let best = null;
  for (const m of Object.values(METHODS)) {
    if (!m.fit || !m.appliesTo(device, deviceName)) continue;
    const score = (m.fit.families[family] ?? 0) + (m.fit.roasts[roast] ?? 0) + (m.maker ? MAKER_BONUS : 0);
    const wins = !best || score > best.score || (score === best.score && m.maker && !best.maker);
    if (wins) best = { id: m.id, label: m.label, score, why: m.fit.why, maker: !!m.maker };
  }
  if (!best) best = { id: DEFAULT_METHOD, label: METHODS[DEFAULT_METHOD].label, score: 0, why: METHODS[DEFAULT_METHOD].fit.why };
  const famWord = FAMILY_WORDS[family] || family;
  const lead = `For a ${roast.toLowerCase()}-roast ${famWord} coffee on the ${deviceName || 'brewer'}, Best for the bean chose ${best.label}.`;
  return { id: best.id, label: best.label, score: best.score, reason: `${lead} ${best.why}` };
}
