/**
 * Brewing option lists used across the UI and the API routes.
 *
 * These were previously hard-coded inside app/page.js (and PROCESSES was
 * duplicated inside the fetch-coffee route). Centralizing them here means
 * there is a single place to edit the choices a user can pick from — the
 * first small step toward the admin-controlled "knowledge well."
 */

// Brew methods, grouped by category. Keys are the categories shown in the
// "Method" dropdown; values are the specific devices for each category.
export const BREW_METHODS = {
  'Pour Over': ['Kalita Wave 185', 'Kalita Wave 155', 'V60 02', 'V60 01', 'Chemex 6-Cup', 'Chemex 3-Cup', 'Origami', 'December Dripper', 'Stagg X', 'Melitta', 'Orea O1', 'Orea V3', 'Orea V4', 'Orea Z1', 'Orea Big Boy'],
  'Immersion': ['French Press', 'AeroPress', 'Clever Dripper', 'Hario Switch'],
  'Espresso': ['Home Machine', 'Manual Lever', 'Moka Pot'],
  'Cold': ['Flash Brew (Japanese Iced)', 'Toddy Cold Brew', 'Hario Cold Brew Bottle', 'Mason Jar Cold Brew'],
};

// Roast levels, light to dark.
export const ROAST_LEVELS = ['Light', 'Light-Medium', 'Medium', 'Medium-Dark', 'Dark'];

// Coffee processing methods, grouped by family. PROCESS_GROUPS drives the
// grouped "Process" dropdown (one <optgroup> per family); PROCESSES is the
// flat list for anything that only needs the names (URL import, validation).
//
// Naming rule: the base process (Washed / Natural / Honey) is the LAST word so
// the engine's family detection in brewing/profiles.js stays substring-based.
// Drying conditions (dark room, cold room, shade, slow-dry, "river flow") are
// modifiers, not processes — they are deliberately kept out of this list.
export const PROCESS_GROUPS = [
  {
    label: 'Washed',
    options: [
      'Washed',
      'Semi-Washed',
      'Kenya-Style (Double Washed)',
      'Wet-Hulled',
      'Hybrid Washed',
      'Cold-Ferment Washed',
      'Dry-Ferment Washed',
      'Thermal Shock Washed',
      'Anaerobic Washed',
      'Co-Fermented Washed',
    ],
  },
  {
    label: 'Natural',
    options: [
      'Natural',
      'Shade-Dried Natural',
      'Anaerobic Natural',
      'Cold-Ferment Natural',
      'Carbonic Maceration Natural',
      'Thermal Shock Natural',
      'Nitrogen Macerated',
      'Koji Natural',
    ],
  },
  {
    label: 'Honey',
    options: [
      'Honey',
      // Mucilage left on, light to dark
      'Honey - White',
      'Honey - Yellow',
      'Honey - Golden',
      'Honey - Red',
      'Honey - Black',
      'Honey - Pink',
      'Pulped Natural',
      'Anaerobic Honey',
      'Cold-Ferment Honey',
      'Double-Fermentation Honey',
      'Hydro Honey',
      'Mosto Honey',
    ],
  },
  {
    label: 'Fermentation & Experimental',
    options: [
      'Anaerobic',
      'Carbonic Maceration',
      'Lactic',
      'Yeast-Inoculated',
      'Co-Fermented',
      'Submerged Fermentation',
      'Extended Fermentation',
      'Double Fermentation',
      'Symbiotic Process',
      'Infused / Barrel Aged',
      'Experimental',
    ],
  },
  { label: 'Regional', options: ['Monsooned'] },
  { label: 'Other', options: ['Other'] },
];

export const PROCESSES = PROCESS_GROUPS.flatMap(g => g.options);

// Labels that used to be in the list (or that roasters commonly print) and
// the entry they now map to. Used by URL import and by saved recipes.
export const PROCESS_ALIASES = {
  'thermal shock': 'Thermal Shock Washed',
  'yeast-inoculated / co-fermented': 'Yeast-Inoculated',
  'yeast inoculation': 'Yeast-Inoculated',
  'yeast inoculated': 'Yeast-Inoculated',
  'co-ferment': 'Co-Fermented',
  'co ferment': 'Co-Fermented',
  'coferment': 'Co-Fermented',
  'cm': 'Carbonic Maceration',
  'natural cm': 'Carbonic Maceration Natural',
  'cm natural': 'Carbonic Maceration Natural',
  'submerged': 'Submerged Fermentation',
  'submerge ferment': 'Submerged Fermentation',
  'double ferment': 'Double Fermentation',
  'natural lactic': 'Lactic',
  'lactic natural': 'Lactic',
  'natural koji': 'Koji Natural',
  'natural shade': 'Shade-Dried Natural',
  'natural - shade': 'Shade-Dried Natural',
  'natural nitrogen macerated': 'Nitrogen Macerated',
  'honey double': 'Double-Fermentation Honey',
  'honey double fermentation': 'Double-Fermentation Honey',
  'black honey': 'Honey - Black',
  'red honey': 'Honey - Red',
  'yellow honey': 'Honey - Yellow',
  'white honey': 'Honey - White',
  'classic washed': 'Washed',
  'traditional washed': 'Washed',
  'classic natural': 'Natural',
  'natural anaerobic': 'Anaerobic Natural',
  'honey anaerobic': 'Anaerobic Honey',
  'washed anaerobic': 'Anaerobic Washed',
};

/**
 * Map a free-text process label (from a roaster page, an old saved recipe,
 * or a typed value) to one of our PROCESSES entries. Hyphens, dashes and
 * extra spaces are ignored; aliases are checked first; the LONGEST matching
 * option wins so "Cold Ferment Natural" lands on "Cold-Ferment Natural", not
 * "Natural". Returns '' when nothing fits.
 */
export function normalizeProcess(value) {
  if (!value) return '';
  const fold = (s) => String(s).toLowerCase().replace(/[\u2013\u2014-]/g, ' ').replace(/\s+/g, ' ').trim();
  const v = fold(value);
  if (!v) return '';
  const alias = Object.entries(PROCESS_ALIASES).find(([k]) => fold(k) === v);
  if (alias) return alias[1];
  const exact = PROCESSES.find(o => fold(o) === v);
  if (exact) return exact;
  // Word match: every word of the option appears somewhere in the value
  // ("Washed Thermal Shock" → "Thermal Shock Washed"). Most words wins.
  const stem = (t) => t.replace(/^(ferment|macerat|inoculat)\w*$/, '$1');
  const words = (s) => fold(s).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(Boolean).map(stem);
  const vw = new Set(words(v));
  const wordHits = PROCESSES
    .map(o => ({ o, w: words(o) }))
    .filter(({ w }) => w.length && w.every(t => vw.has(t)))
    .sort((a, b) => b.w.length - a.w.length);
  if (wordHits.length) return wordHits[0].o;
  // Last resort: an option contained in the value (longest wins), else the
  // value contained in an option ("Honey" → "Honey - White": shortest wins).
  const inValue = PROCESSES.filter(o => v.includes(fold(o))).sort((a, b) => b.length - a.length);
  if (inValue.length) return inValue[0];
  const inOption = PROCESSES.filter(o => fold(o).includes(v)).sort((a, b) => a.length - b.length);
  return inOption[0] || '';
}

// Structured flavor tags — the tāst rating vocabulary (per the product spec).
// Used by the cupping score sheet and the quick brew log.
export const FLAVOR_TAGS = [
  'Fruity', 'Berry', 'Citrus', 'Stone fruit', 'Tropical',
  'Floral', 'Tea-like', 'Bright',
  'Chocolatey', 'Nutty', 'Caramel', 'Sweet',
  'Earthy', 'Spicy', 'Winey', 'Fermented',
];

// The five cupping attributes on the tāst score sheet.
export const CUPPING_ATTRIBUTES = ['Aroma', 'Acidity', 'Sweetness', 'Body', 'Finish'];

// Common cup problems offered as quick-select chips in Dial-In mode.
export const DIAL_IN_ISSUES = [
  'Too sour / acidic',
  'Too bitter',
  'Astringent / dry',
  'Thin / watery body',
  'Muddy / muted flavors',
  'Too strong / intense',
  'Too weak / bland',
  'Strange / off flavors',
  'Fermented / boozy taste',
  'Long draw down time',
  'Fast draw down time',
  'Channeling / uneven bed',
  'Sludgy / silty cup',
  'Papery / cardboard taste',
];
