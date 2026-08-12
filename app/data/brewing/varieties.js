/**
 * Cultivar (variety) intelligence — part of the tāst knowledge well.
 *
 * The variety field used to be ignored by the engine. Here we match it
 * (fuzzily) against known cultivars and return small, expert nudges:
 *   - tempDelta °C (delicate cultivars run cooler to avoid astringency)
 *   - tempCap °C (hard ceiling for delicate florals — even a very high-grown,
 *     light-roasted Gesha won't be pushed past this, so density can't override
 *     delicacy). Omitted for robust cultivars.
 *   - grindTDelta (large/dense beans shift the grind)
 *   - ratioDelta (delicate florals open up at a softer/dilute ratio)
 *   - agitation hint surfaced in the brew notes
 *   - note + seed flavor notes for the tasting copy
 *
 * Sources: World Coffee Research variety catalog; Sweet Maria's; 1Zpresso &
 * roaster Gesha/Kenya brewing guides; Perfect Daily Grind variety guides.
 *
 * Each entry's `keys` are matched against the lowercased variety string.
 */

export const VARIETIES = [
  { name: 'Gesha / Geisha', keys: ['gesha', 'geisha'], density: 'medium',
    tempDelta: -2, tempCap: 94, grindTDelta: 0, ratioDelta: +0.5, agitation: 'gentle',
    notes: ['Jasmine', 'Bergamot', 'Peach'],
    note: 'Gesha is delicate — we keep the water gentle (held at/under 94°C) and lean on a finer grind and a softer ratio to extract it fully without scorching the florals.' },

  { name: 'Wush Wush', keys: ['wush'], density: 'medium',
    tempDelta: -1.5, tempCap: 93, grindTDelta: 0, ratioDelta: +0.25, agitation: 'gentle',
    notes: ['Floral', 'Tropical', 'Citrus'],
    note: 'A delicate, aromatic variety — kept gentle and cool, like a Gesha.' },

  { name: 'Sidra', keys: ['sidra'], density: 'medium',
    tempDelta: -1, tempCap: 94, grindTDelta: 0, ratioDelta: +0.25, agitation: 'gentle',
    notes: ['Floral', 'Stone fruit', 'Bergamot'],
    note: 'Aromatic and delicate — a cooler ceiling protects the high notes.' },

  { name: 'Ethiopian Heirloom / Landrace', keys: ['heirloom', 'landrace', 'wild', 'ethiopia local'], density: 'medium-high',
    tempDelta: -1, tempCap: 95, grindTDelta: 0, ratioDelta: +0.25, agitation: 'gentle',
    notes: ['Floral', 'Citrus', 'Stone fruit'],
    note: 'Ethiopian landraces lean floral and delicate — slightly cooler water keeps them elegant.' },

  { name: 'SL28', keys: ['sl28', 'sl-28', 'sl 28'], density: 'high',
    tempDelta: -1, grindTDelta: -0.05, ratioDelta: 0, agitation: 'standard',
    notes: ['Blackcurrant', 'Grapefruit', 'Brown sugar'],
    note: 'SL28 is dense and intensely acidic — a finer grind extracts the dense bean, and a touch cooler protects the blackcurrant from thermal flattening.' },

  { name: 'SL34', keys: ['sl34', 'sl-34', 'sl 34'], density: 'high',
    tempDelta: -1, grindTDelta: -0.05, ratioDelta: 0, agitation: 'standard',
    notes: ['Blackcurrant', 'Citrus', 'Winey'],
    note: 'Like SL28 — dense and bright; grind a little finer and keep water just off the top.' },

  { name: 'Ruiru 11 / Batian', keys: ['ruiru', 'batian'], density: 'medium-high',
    tempDelta: -0.5, grindTDelta: 0, ratioDelta: 0, agitation: 'standard',
    notes: ['Blackcurrant', 'Citrus', 'Sweet'],
    note: 'Modern Kenyan cultivars — bright and clean; a hair cooler keeps the acidity tidy.' },

  { name: 'Pink / aromatic Bourbon', keys: ['pink bourbon', 'aji', 'eugenioides'], density: 'medium',
    tempDelta: -1, tempCap: 95, grindTDelta: 0, ratioDelta: +0.25, agitation: 'gentle',
    notes: ['Floral', 'Tropical', 'Sweet'],
    note: 'Aromatic and expressive — treat a little gently to keep the florals.' },

  { name: 'Bourbon', keys: ['bourbon'], density: 'medium',
    tempDelta: 0, grindTDelta: 0, ratioDelta: 0, agitation: 'standard',
    notes: ['Caramel', 'Red fruit', 'Sweet'],
    note: 'Bourbon is balanced and sweet — the baseline treats it well.' },

  { name: 'Typica', keys: ['typica'], density: 'medium',
    tempDelta: 0, grindTDelta: 0, ratioDelta: 0, agitation: 'standard',
    notes: ['Clean', 'Sweet', 'Balanced'],
    note: 'A classic, clean cup — no special handling needed.' },

  { name: 'Caturra', keys: ['caturra'], density: 'medium',
    tempDelta: 0, grindTDelta: -0.03, ratioDelta: 0, agitation: 'standard',
    notes: ['Bright', 'Citrus', 'Caramel'],
    note: 'Bright with a touch less clarity than Bourbon — a hair finer cleans it up.' },

  { name: 'Catuai', keys: ['catuai', 'catuaí'], density: 'medium',
    tempDelta: 0, grindTDelta: 0, ratioDelta: 0, agitation: 'standard',
    notes: ['Balanced', 'Mild', 'Sweet'],
    note: 'Mild and balanced — baseline handling.' },

  { name: 'Castillo / Colombia', keys: ['castillo', 'colombia variety', 'tabi', 'cenicafe', 'cenicafé'], density: 'medium',
    tempDelta: 0, grindTDelta: 0, ratioDelta: 0, agitation: 'standard',
    notes: ['Caramel', 'Red apple', 'Cocoa'],
    note: 'Dependable Colombian cultivars — baseline handling.' },

  { name: 'Pacamara / Maragogype', keys: ['pacamara', 'maragogype', 'maracaturra', 'maragogipe'], density: 'high',
    tempDelta: +1, grindTDelta: +0.05, ratioDelta: 0, agitation: 'standard',
    notes: ['Complex', 'Herbal', 'Stone fruit'],
    note: 'Very large beans that can grind unevenly — a hair coarser plus a touch hotter keeps extraction even.' },

  { name: 'Pacas', keys: ['pacas'], density: 'medium',
    tempDelta: 0, grindTDelta: 0, ratioDelta: 0, agitation: 'standard',
    notes: ['Sweet', 'Citrus', 'Clean'],
    note: 'A Bourbon mutation — baseline handling.' },

  { name: 'Mundo Novo', keys: ['mundo novo'], density: 'medium',
    tempDelta: 0, grindTDelta: 0, ratioDelta: 0, agitation: 'standard',
    notes: ['Chocolate', 'Nutty', 'Heavy body'],
    note: 'Classic Brazilian cultivar — baseline handling.' },

  { name: 'Sudan Rume', keys: ['sudan rume', 'rume'], density: 'medium',
    tempDelta: -0.5, grindTDelta: 0, ratioDelta: +0.25, agitation: 'gentle',
    notes: ['Complex', 'Berry', 'Floral'],
    note: 'A rare, complex variety — treat it gently to keep the layers.' },
];

const NEUTRAL = { name: '', density: 'medium', tempDelta: 0, grindTDelta: 0, ratioDelta: 0, agitation: 'standard', notes: [], note: '' };

export function getVarietyAdjustment(varietyString = '') {
  const v = String(varietyString).toLowerCase();
  if (!v.trim()) return NEUTRAL;
  for (const entry of VARIETIES) {
    if (entry.keys.some(k => v.includes(k))) return entry;
  }
  return NEUTRAL;
}
