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

// Coffee processing methods, grouped by family in display order.
export const PROCESSES = [
  // Washed family
  'Washed',
  'Semi-Washed',
  'Kenya-Style (Double Washed)',
  'Wet-Hulled',
  // Natural family
  'Natural',
  'Anaerobic Natural',
  // Honey family (light to dark)
  'Honey - White',
  'Honey - Yellow',
  'Honey - Golden',
  'Honey - Red',
  'Honey - Black',
  'Honey - Pink',
  // Experimental / Fermentation
  'Anaerobic',
  'Carbonic Maceration',
  'Anaerobic Washed',
  'Anaerobic Honey',
  'Lactic',
  'Thermal Shock',
  'Yeast-Inoculated / Co-Fermented',
  'Extended Fermentation',
  'Double Fermentation',
  // Regional
  'Monsooned',
  // Other
  'Pulped Natural',
  'Infused / Barrel Aged',
  'Experimental',
  'Other',
];

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
