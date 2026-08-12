/**
 * Roast and process adjustment tables — part of the tāst "knowledge well."
 *
 * These are the dials an admin turns to change how the engine treats roast
 * level and processing method. Everything here is plain data: edit a number,
 * change every recipe predictably.
 *
 * Conventions:
 *  - tempDelta is in °C, applied on top of a device's base (medium-roast) temp.
 *  - ratioDelta shifts the water ratio (positive = more water per gram).
 *  - grindT is a 0..1 position within a grinder's brew range for that method
 *    (0 = finest end, 1 = coarsest end). Lighter roasts grind finer.
 */

// Dark roasts cool more aggressively (Kasuya-style) per founder direction —
// the 4:6 method goes as low as ~83°C for dark, so the dark end runs cool.
export const ROAST_PROFILES = {
  'Light':        { tempDelta: +3.0, ratioDelta: -0.5, grindT: 0.20 },
  'Light-Medium': { tempDelta: +1.5, ratioDelta: -0.25, grindT: 0.35 },
  'Medium':       { tempDelta:  0.0, ratioDelta:  0.0, grindT: 0.50 },
  'Medium-Dark':  { tempDelta: -3.5, ratioDelta: +0.5, grindT: 0.65 },
  'Dark':         { tempDelta: -6.5, ratioDelta: +1.0, grindT: 0.80 },
};

// When roast is unknown/blank, treat as Medium.
export const DEFAULT_ROAST = 'Medium';

export function getRoastProfile(roastLevel) {
  return ROAST_PROFILES[roastLevel] || ROAST_PROFILES[DEFAULT_ROAST];
}

/**
 * Process families call for gentler or more aggressive extraction. We detect
 * the family from the (free-text-ish) process string and return small deltas.
 *  - grindTDelta nudges grind coarser (+) or finer (−).
 *  - tempDelta nudges water temp.
 *  - note is surfaced in brewingNotes when relevant.
 */
export function getProcessAdjustment(processName = '') {
  const p = String(processName).toLowerCase();

  const isAnaerobic = p.includes('anaerobic') || p.includes('carbonic') ||
    p.includes('fermentation') || p.includes('lactic') ||
    p.includes('co-ferment') || p.includes('yeast') || p.includes('thermal shock') ||
    p.includes('barrel') || p.includes('infused');
  const isWetHulled = p.includes('wet-hulled') || p.includes('wet hulled') ||
    p.includes('wethulled') || p.includes('giling basah') || p.includes('giling');
  const isHoney = p.includes('honey') || p.includes('miel') || p.includes('pulped natural') ||
    p.includes('pulped');
  const isNatural = p.includes('natural') || p.includes('dry process') || p.includes('monsooned');

  // Order matters: the most specific / most aggressive families win first.
  if (isAnaerobic) {
    return {
      family: 'anaerobic',
      grindTDelta: +0.05,
      tempDelta: -2,
      note: 'Fermented/anaerobic lots are pushed gently — slightly coarser grind and cooler water keep boozy, over-ripe notes in check.',
    };
  }
  if (isWetHulled) {
    return {
      family: 'wet-hulled',
      grindTDelta: +0.03,
      tempDelta: +1,
      note: 'Wet-hulled (giling basah) coffees are low-acid and full-bodied — a slightly coarser grind and a touch hotter water lean into the earthy, syrupy body instead of fighting it.',
    };
  }
  if (isHoney) {
    return {
      family: 'honey',
      grindTDelta: +0.02,
      tempDelta: -0.5,
      note: 'Honey-process coffees keep some fruit sugar from the natural side — water just a hair cooler protects that sweetness while staying cleaner than a full natural.',
    };
  }
  if (isNatural) {
    return {
      family: 'natural',
      grindTDelta: +0.03,
      tempDelta: -1,
      note: 'Natural (dry) processing carries more sugar and ferment character, so water runs a touch cooler to protect the fruit.',
    };
  }
  return { family: 'washed', grindTDelta: 0, tempDelta: 0, note: '' };
}

/**
 * Decaffeination is orthogonal to the wash process — a coffee can be a washed
 * decaf or a natural decaf. Decaf beans are more porous and brittle, so they
 * extract faster and throw more fines; left untreated a normal recipe
 * over-extracts them into ashiness. We detect it from the process OR the name
 * (roasters often only flag "Decaf" in the title) and pull back: coarser grind,
 * cooler water, a hair more water. Returns neutral for regular coffee.
 */
export function getDecafAdjustment(coffeeData = {}) {
  const hay = `${coffeeData.process || ''} ${coffeeData.name || ''} ${coffeeData.roaster || ''}`.toLowerCase();
  const isDecaf = hay.includes('decaf') || hay.includes('swiss water') ||
    hay.includes('mountain water') || hay.includes('ethyl acetate') ||
    /\bea\b/.test(hay) || hay.includes('sugarcane') || hay.includes('co2 process') ||
    hay.includes('descafe'); // descafeinado
  if (!isDecaf) return { isDecaf: false, grindTDelta: 0, tempDelta: 0, ratioDelta: 0, note: '' };
  return {
    isDecaf: true,
    grindTDelta: +0.06,  // coarser — porous beans extract fast
    tempDelta: -2,       // cooler to avoid ashy over-extraction
    ratioDelta: +0.3,    // a touch more water for body
    note: 'Decaf beans are porous and brittle, so they extract fast and can turn ashy — we grind a little coarser, drop the water a couple of degrees, and open the ratio slightly to keep it sweet.',
  };
}
