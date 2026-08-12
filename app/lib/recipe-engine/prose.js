/**
 * Deterministic flavor notes and expected-profile copy.
 *
 * With no AI involved, the engine still produces sensible, brand-voiced
 * descriptions: flavor notes come straight from the roaster's notes when we
 * have them, otherwise from an origin lookup. The expected-profile sentence is
 * templated from the brew style, roast, and process.
 *
 * The generate-recipe route can optionally replace these two fields with an AI
 * pass (see USE_AI_PROSE) — but the app is fully functional without it.
 */

const ORIGIN_NOTES = {
  ethiopia: ['Floral', 'Citrus', 'Stone fruit', 'Bergamot'],
  kenya: ['Blackcurrant', 'Tomato', 'Bright acidity', 'Cane sugar'],
  colombia: ['Caramel', 'Red apple', 'Chocolate', 'Citrus'],
  brazil: ['Chocolate', 'Peanut', 'Low acidity', 'Toffee'],
  guatemala: ['Cocoa', 'Orange', 'Baking spice', 'Brown sugar'],
  'costa rica': ['Honey', 'Citrus', 'Clean finish', 'Almond'],
  indonesia: ['Earthy', 'Cedar', 'Dark chocolate', 'Herbal'],
  sumatra: ['Earthy', 'Cedar', 'Dark chocolate', 'Tobacco'],
  rwanda: ['Red fruit', 'Floral', 'Orange', 'Brown sugar'],
  burundi: ['Red fruit', 'Florals', 'Citrus', 'Honey'],
  honduras: ['Caramel', 'Stone fruit', 'Cocoa', 'Vanilla'],
  panama: ['Jasmine', 'Bergamot', 'Peach', 'Honey'],
  mexico: ['Milk chocolate', 'Almond', 'Caramel', 'Citrus'],
  peru: ['Chocolate', 'Nutty', 'Mild citrus', 'Caramel'],
};

const ROAST_FALLBACK = {
  light: ['Floral', 'Citrus', 'Tea-like', 'Bright'],
  medium: ['Caramel', 'Balanced', 'Sweet', 'Smooth'],
  dark: ['Dark chocolate', 'Toasted', 'Bold', 'Low acidity'],
};

const STYLE_VOICE = {
  'Pour Over': { clarity: 'clean and articulate', body: 'a light-to-medium' },
  'Immersion': { clarity: 'rich and rounded', body: 'a fuller' },
  'Espresso':  { clarity: 'concentrated and syrupy', body: 'a heavy' },
  'Cold':      { clarity: 'smooth and low-acid', body: 'a mellow' },
};

function titleish(s) {
  const t = String(s).trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function buildFlavorNotes(coffeeData = {}) {
  if (coffeeData.notes && coffeeData.notes.trim()) {
    const parts = coffeeData.notes
      .split(/,|·|\/|\band\b|;/i)
      .map(s => s.trim())
      .filter(Boolean)
      .map(titleish);
    if (parts.length) return parts.slice(0, 4);
  }
  const origin = String(coffeeData.origin || '').toLowerCase().trim();
  for (const key of Object.keys(ORIGIN_NOTES)) {
    if (origin.includes(key)) return ORIGIN_NOTES[key].slice(0, 4);
  }
  const roast = String(coffeeData.roastLevel || '').toLowerCase();
  if (roast.includes('light')) return ROAST_FALLBACK.light;
  if (roast.includes('dark')) return ROAST_FALLBACK.dark;
  return ROAST_FALLBACK.medium;
}

export function buildExpectedProfile(coffeeData = {}, device = {}, flavorNotes = []) {
  const voice = STYLE_VOICE[device.category] || STYLE_VOICE['Pour Over'];
  const notesList = flavorNotes.slice(0, 3).map(n => n.toLowerCase()).join(', ');
  const roast = (coffeeData.roastLevel || 'medium').toLowerCase();
  const process = coffeeData.process ? `${coffeeData.process.toLowerCase()} ` : '';
  const name = coffeeData.name || [coffeeData.origin, coffeeData.variety].filter(Boolean).join(' ') || 'this coffee';

  const lead = notesList
    ? `Expect ${voice.clarity} cup with notes of ${notesList} and ${voice.body} body.`
    : `Expect ${voice.clarity} cup with ${voice.body} body.`;
  return `${lead} The ${roast} roast${process ? ` and ${process}process` : ''} set the temperature and grind, so ${name} shows up the way the roaster intended.`;
}
