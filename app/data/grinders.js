/**
 * Grinder database with detailed setting metadata.
 * Each grinder includes its specific adjustment system so the AI
 * can output precise, grinder-native recommendations.
 */

const GRINDERS = {
  // ── Fellow ────────────────────────────────────────────────────────────
  'Fellows Ode Gen 2': {
    range: '1–11',
    type: 'stepped',
    settings: 31,
    unit: 'number + clicks',
    description: '31 stepped settings from 1 (finest) to 11 (coarsest). Dial has 11 numbered positions with 2 intermediate clicks between each number, giving 3 positions per number (the number itself, +1 click, +2 clicks). IMPORTANT: Express settings using "number + clicks" notation. Valid positions are: a whole number alone (e.g., "3"), a number plus 1 click (e.g., "3 + 1 click"), or a number plus 2 clicks (e.g., "3 + 2 clicks"). NEVER use decimals. NEVER say "+3 clicks" — the maximum is +2 clicks before the next number. Filter-only grinder, not suitable for espresso.',
    brewRanges: {
      pourOver: '2 + 1 click – 5',
      immersion: '4 + 1 click – 7',
      coldBrew: '7 + 1 click – 11',
    },
  },
  'Fellows Ode Gen 1': {
    range: '1–11',
    type: 'stepped',
    settings: 11,
    unit: 'whole number',
    description: '11 stepped settings from 1 (finest) to 11 (coarsest). Each click moves one full number — there are NO intermediate positions. IMPORTANT: Express settings ONLY as whole numbers (e.g., "3", "5", "8"). NEVER output decimals. Filter-only grinder, not suitable for espresso.',
    brewRanges: {
      pourOver: '2–4',
      immersion: '4–6',
      coldBrew: '7–11',
    },
  },
  'Fellows Opus': {
    range: '1–41',
    type: 'stepped',
    settings: 41,
    unit: 'whole number',
    description: '41 stepped settings from 1 (finest) to 41 (coarsest). Each click moves exactly one numbered step — there are NO intermediate positions. IMPORTANT: Express settings ONLY as whole numbers (e.g., "7", "12", "28"). NEVER output decimals. All-purpose grinder covering espresso through cold brew.',
    brewRanges: {
      espresso: '1–6',
      pourOver: '6–14',
      immersion: '14–24',
      coldBrew: '24–36',
    },
  },

  // ── Baratza ───────────────────────────────────────────────────────────
  'Baratza Encore': {
    range: '1–40',
    type: 'stepped',
    settings: 40,
    unit: 'whole number',
    description: '40 indexed grind settings from 1 (finest) to 40 (coarsest). Each number is a distinct, repeatable position on the adjustment ring — there are NO intermediate positions. IMPORTANT: Express settings ONLY as whole numbers (e.g., "14", "18", "25"). NEVER output decimals.',
    brewRanges: {
      espresso: '1–8 (coarse espresso only)',
      pourOver: '12–21',
      immersion: '21–28',
      coldBrew: '28–40',
    },
  },
  'Baratza Virtuoso+': {
    range: '1–40',
    type: 'stepped',
    settings: 40,
    unit: 'whole number',
    description: '40 indexed grind settings from 1 (finest) to 40 (coarsest). Same stepped ring as Encore with upgraded conical burrs — there are NO intermediate positions. IMPORTANT: Express settings ONLY as whole numbers (e.g., "14", "18", "25"). NEVER output decimals.',
    brewRanges: {
      espresso: '1–8 (coarse espresso only)',
      pourOver: '12–21',
      immersion: '21–28',
      coldBrew: '28–40',
    },
  },
  'Baratza Vario+': {
    range: '1A–10Q',
    type: 'macro-micro',
    settings: 170,
    unit: 'number + letter (e.g., 2A, 5M)',
    description: '170 distinct settings via dual-adjustment system. Macro ring: 1 (finest) to 10 (coarsest). Micro ring: A (finest) through Q (coarsest), 17 lettered positions per macro step. IMPORTANT: Express settings ONLY as a number followed by a letter (e.g., "2A", "5M", "8Q"). The number is the macro position and the letter is the micro position. NEVER use bare numbers or decimals. Ceramic flat burrs, true all-purpose.',
    brewRanges: {
      espresso: '1A–3D',
      pourOver: '3E–6F',
      immersion: '6G–8J',
      coldBrew: '8K–10Q',
    },
  },

  // ── OXO ───────────────────────────────────────────────────────────────
  'OXO Brew Conical Burr': {
    range: '1–15',
    type: 'stepped',
    settings: 38,
    unit: 'whole number + optional micro',
    description: '15 main numbered settings (1 finest to 15 coarsest) with a micro-adjustment lever between each, yielding ~38 total positions. IMPORTANT: Express settings as a whole number for the hopper position, optionally adding "+fine" or "+coarse" for the micro lever (e.g., "8", "8 +fine", "10 +coarse"). NEVER output decimals. Filter-focused grinder.',
    brewRanges: {
      pourOver: '6–10',
      immersion: '10–13',
      coldBrew: '13–15',
    },
  },

  // ── Comandante ────────────────────────────────────────────────────────
  'Comandante C40': {
    range: '0–50 clicks',
    type: 'clicks',
    settings: 50,
    unit: 'clicks',
    description: '~50 audible clicks from fully closed (0). Each click is one discrete, repeatable step. IMPORTANT: Express settings ONLY as a whole number of clicks followed by the word "clicks" (e.g., "26 clicks", "30 clicks"). NEVER output decimals or bare numbers without "clicks". Premium hand grinder, all-purpose.',
    brewRanges: {
      espresso: '8–14 clicks',
      pourOver: '22–32 clicks',
      immersion: '32–38 clicks',
      coldBrew: '38–50 clicks',
    },
  },

  // ── Timemore ──────────────────────────────────────────────────────────
  'Timemore C2': {
    range: '0–36 clicks',
    type: 'clicks',
    settings: 36,
    unit: 'clicks',
    description: '36 audible clicks from fully closed (0). Each click moves the burr one discrete step. IMPORTANT: Express settings ONLY as a whole number of clicks followed by the word "clicks" (e.g., "18 clicks", "22 clicks"). NEVER output decimals or bare numbers without "clicks". Budget hand grinder, best for filter brewing.',
    brewRanges: {
      espresso: '6–10 clicks',
      pourOver: '14–22 clicks',
      immersion: '22–28 clicks',
      coldBrew: '28–36 clicks',
    },
  },
  'Timemore Chestnut X': {
    range: '0–120 clicks',
    type: 'clicks',
    settings: 120,
    unit: 'clicks',
    description: '120 fine clicks from fully closed (0). Numbered dial with fine clicks between each number for micro-precision. IMPORTANT: Express settings ONLY as a whole number of clicks followed by the word "clicks" (e.g., "60 clicks", "75 clicks"). NEVER output decimals or bare numbers without "clicks". Premium hand grinder, all-purpose.',
    brewRanges: {
      espresso: '20–40 clicks',
      pourOver: '50–80 clicks',
      immersion: '80–100 clicks',
      coldBrew: '100–120 clicks',
    },
  },

  // ── 1Zpresso ──────────────────────────────────────────────────────────
  '1Zpresso JX-Pro': {
    range: '0–200 clicks',
    type: 'clicks',
    settings: 200,
    unit: 'clicks',
    description: '~200 clicks from fully closed (0). Numbered dial with 10 numbers per rotation and ~4 clicks per number. IMPORTANT: Express settings ONLY as a whole number of clicks followed by the word "clicks" (e.g., "80 clicks", "95 clicks"). NEVER output decimals or bare numbers without "clicks". NEVER use the X.X.X dial notation. All-purpose hand grinder with espresso capability.',
    brewRanges: {
      espresso: '12–40 clicks',
      pourOver: '60–100 clicks',
      immersion: '100–140 clicks',
      coldBrew: '140–200 clicks',
    },
  },
  '1Zpresso K-Max': {
    range: '0–90 clicks',
    type: 'clicks',
    settings: 90,
    unit: 'clicks',
    description: '~90 clicks from fully closed (0). External numbered adjustment dial with distinct click stops. IMPORTANT: Express settings ONLY as a whole number of clicks followed by the word "clicks" (e.g., "40 clicks", "55 clicks"). NEVER output decimals or bare numbers without "clicks". Designed primarily for filter and pour-over brewing.',
    brewRanges: {
      pourOver: '30–55 clicks',
      immersion: '55–70 clicks',
      coldBrew: '70–90 clicks',
    },
  },

  // ── Eureka ────────────────────────────────────────────────────────────
  'Eureka Mignon': {
    range: 'Stepless',
    type: 'stepless',
    settings: 'infinite',
    unit: 'dial number (0.1 increments)',
    description: 'Stepless (infinitely adjustable) with a numbered dial. No fixed click stops — turn to any position. IMPORTANT: Express settings as a dial number in 0.1 increments (e.g., "1.5", "2.3", "4.0"). NEVER output more than one decimal place. Primarily espresso-focused, though some variants (Filtro) handle filter grinds.',
    brewRanges: {
      espresso: '0.5–2.0',
      pourOver: '3.0–5.0',
      immersion: '5.0–7.0',
      coldBrew: '7.0–9.0',
    },
  },

  // ── Niche ─────────────────────────────────────────────────────────────
  'Niche Zero': {
    range: '0–50',
    type: 'stepped',
    settings: 50,
    unit: 'whole number',
    description: '50 numbered settings from 0 (finest) to 50 (coarsest). Each numbered position is a distinct, repeatable step on the grind dial. IMPORTANT: Express settings ONLY as whole numbers (e.g., "15", "22", "35"). NEVER output decimals. True all-purpose single-dose grinder.',
    brewRanges: {
      espresso: '8–16',
      pourOver: '20–30',
      immersion: '30–40',
      coldBrew: '40–50',
    },
  },

  // ── Mahlkönig ─────────────────────────────────────────────────────────
  'Mahlkönig X54': {
    range: '1–35 (stepless dial)',
    type: 'stepless',
    settings: 'infinite',
    unit: 'dial number',
    description: 'Stepless numbered grind dial (~243–905 microns). Turn toward smaller numbers for finer, larger numbers for coarser. Ships with two front burr plates — the espresso plate for fine/espresso grinds and the filter plate (installed by default) for drip and pour-over; swap the plate for the style you\'re brewing. IMPORTANT: Express settings as a dial number in 0.1 increments (e.g., "5.0", "20.0"). NEVER output more than one decimal place. All-purpose home grinder.',
    brewRanges: {
      espresso: '3–8',
      pourOver: '14–24',
      immersion: '24–30',
      coldBrew: '30–35',
    },
  },
  'Mahlkönig X64 SD': {
    range: '0–12 (stepless dial)',
    type: 'stepless',
    settings: 'infinite',
    unit: 'dial number',
    description: 'Single-dose 64mm flat-burr grinder with a stepless numbered dial from 0 to 12 (a guide is printed on the lid). Mahlkönig\'s own guidance: about 0–2 for espresso, 2–7 for filter, and 7–12 for coarse. IMPORTANT: Express settings as a dial number in 0.1 increments (e.g., "1.5", "4.0"). NEVER output more than one decimal place. True all-purpose single-dose grinder.',
    brewRanges: {
      espresso: '0.5–2',
      pourOver: '2.5–5',
      immersion: '5–7',
      coldBrew: '7–12',
    },
  },
  'Mahlkönig E64 WS': {
    range: '0–12 (stepless dial)',
    type: 'stepless',
    settings: 'infinite',
    unit: 'dial number',
    description: 'Espresso-focused 64mm flat-burr, grind-by-weight home grinder with stepless micron adjustment shown on a 0–12 lid guide (about 0–2 espresso, 2–7 filter, 7–12 coarse). Tuned for espresso but capable across filter. IMPORTANT: Express settings as a dial number in 0.1 increments (e.g., "1.2", "3.0"). NEVER output more than one decimal place.',
    brewRanges: {
      espresso: '0.5–2',
      pourOver: '2.5–5',
      immersion: '5–7',
      coldBrew: '7–12',
    },
  },

  // ── Weber ─────────────────────────────────────────────────────────────
  'Weber Key': {
    range: '0.0–3.0 turns',
    type: 'stepless',
    settings: 'infinite',
    unit: 'turns from burr-zero (rotation.number)',
    description: 'Stepless single-dose grinder read as turns from your own burr-zero (where the burrs just touch). Weber notes settings as rotation.number.sub-number (e.g., "1.2.4" = one full turn plus 2.4). Because every unit\'s zero differs, establish your burr-zero first. IMPORTANT: Express settings here as turns in 0.1 increments (e.g., "1.5" = one full turn plus 5), where the whole number is rotations and the decimal is the dial number. NEVER output more than one decimal place. Premium all-purpose grinder.',
    brewRanges: {
      espresso: '0.5–1.0',
      pourOver: '1.2–1.8',
      immersion: '1.9–2.3',
      coldBrew: '2.4–3.0',
    },
  },
  'Weber EG-1': {
    range: '0–28 marks (from burr-zero)',
    type: 'stepless',
    settings: 'infinite',
    unit: 'marks from burr-zero',
    description: '80mm flat-burr grinder (CORE burrs) with fine ~5-micron stepped adjustment, read as the number of marks above your established burr-zero. Because each unit\'s zero differs, find your burr-zero first, then add the number for your brew method. IMPORTANT: Express settings as a number of marks from zero in 0.1 increments (e.g., "6.0", "14.0"). NEVER output more than one decimal place. All-purpose, espresso through filter.',
    brewRanges: {
      espresso: '2–8',
      pourOver: '12–18',
      immersion: '18–24',
      coldBrew: '24–28',
    },
  },
  'Weber HG-2': {
    range: '0–4.5 turns (from burr-zero)',
    type: 'stepless',
    settings: 'infinite',
    unit: 'turns from burr-zero',
    description: 'Hand grinder with ~5-micron stepped adjustment, read as turns of the collar counter-clockwise from your burr-zero (the ring passes numbers 0–14 each turn). Establish your burr-zero first; a common start is about 1.75 turns for espresso and 2.75 turns for pour-over. IMPORTANT: Express settings as turns in 0.1 increments (e.g., "1.8", "2.8"). NEVER output more than one decimal place. Premium all-purpose hand grinder.',
    brewRanges: {
      espresso: '1.5–2.0',
      pourOver: '2.5–3.3',
      immersion: '3.3–3.8',
      coldBrew: '3.8–4.5',
    },
  },

  // ── Generic ───────────────────────────────────────────────────────────
  'Generic': {
    range: 'Fine–Coarse',
    type: 'descriptive',
    settings: 'varies',
    unit: 'description',
    description: 'Generic or unknown grinder. IMPORTANT: Express settings ONLY using standard descriptive terms: Extra Fine, Fine, Medium-Fine, Medium, Medium-Coarse, Coarse, Extra Coarse. NEVER output numbers.',
    brewRanges: {
      espresso: 'Fine to Extra Fine',
      pourOver: 'Medium-Fine to Medium',
      immersion: 'Medium to Medium-Coarse',
      coldBrew: 'Coarse to Extra Coarse',
    },
  },
};

/**
 * Build a prompt-ready reference string for a given grinder.
 * Used by API routes to inject grinder-specific context into the AI prompt.
 */
function getGrinderPromptContext(grinderName) {
  const grinder = GRINDERS[grinderName];
  if (!grinder) {
    return `Unknown grinder "${grinderName}". Use descriptive settings: Fine, Medium-Fine, Medium, Medium-Coarse, Coarse.`;
  }

  const rangeLines = Object.entries(grinder.brewRanges)
    .map(([method, range]) => `  - ${method}: ${range}`)
    .join('\n');

  return `${grinder.description}
Total distinct settings: ${grinder.settings}
Typical brew ranges for ${grinderName}:
${rangeLines}`;
}

module.exports = { GRINDERS, getGrinderPromptContext };
