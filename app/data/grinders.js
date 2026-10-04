/**
 * Grinder database with detailed setting metadata.
 * Each grinder includes its specific adjustment system so the AI
 * can output precise, grinder-native recommendations.
 *
 * `rangeSource` records where each grinder's brewRanges come from, so we
 * know which numbers are backed by the manufacturer and which are tāst
 * estimates still waiting on real brew data. Audit: Oct 3, 2026
 * (manufacturer manuals, official charts and FAQs; Honest Coffee Guide
 * micron data used only as a cross-check).
 *   - 'manufacturer'        : ranges follow the maker's published guide
 *   - 'manufacturer + tāst' : anchored to the maker's guide, split/extended by tāst
 *   - 'tāst (validated)'    : tāst house ranges confirmed by real brews
 *   - 'estimate'            : no manufacturer guide exists — tāst estimate
 *   - 'provisional'         : placeholder pending brew data
 */

const GRINDERS = {
  // ── Fellow ────────────────────────────────────────────────────────────
  // Fellow's own guide (pour-over 4–8) runs coarse in practice; these house
  // ranges match real brews on stock burrs and HCG's V60 band (2+2 – 5+2).
  'Fellows Ode Gen 2': {
    range: '1–11',
    type: 'stepped',
    settings: 31,
    unit: 'number + clicks',
    rangeSource: 'tāst (validated)',
    description: '31 stepped settings from 1 (finest) to 11 (coarsest). Dial has 11 numbered positions with 2 intermediate clicks between each number, giving 3 positions per number (the number itself, +1 click, +2 clicks). Setting 1 sits one click from burr touch. IMPORTANT: Express settings using "number + clicks" notation. Valid positions are: a whole number alone (e.g., "3"), a number plus 1 click (e.g., "3 + 1 click"), or a number plus 2 clicks (e.g., "3 + 2 clicks"). NEVER use decimals. NEVER say "+3 clicks" — the maximum is +2 clicks before the next number. Filter-only grinder, not suitable for espresso.',
    brewRanges: {
      pourOver: '2 + 1 click – 5',
      immersion: '4 + 1 click – 7',
      coldBrew: '7 + 1 click – 11',
    },
  },
  // PROVISIONAL (Sep 9, 2026): SSP Red Speed burrs grind noticeably finer than
  // stock Gen 2 burrs at the same dial number, so the bands below are shifted
  // ~2 numbers coarser. Early brews (Oct 2026) still read bitter on dark roasts,
  // so the shift may need to grow; SSP burrs also need ~5–10 lb to season.
  'Fellows Ode Gen 2 (SSP Red Speed)': {
    range: '1–11',
    type: 'stepped',
    settings: 31,
    unit: 'number + clicks',
    rangeSource: 'provisional',
    description: 'Fellow Ode Gen 2 fitted with SSP Red Speed coated 64mm burrs. Same dial as stock: 31 stepped settings from 1 (finest) to 11 (coarsest), 11 numbered positions with 2 intermediate clicks between each number. SSP burrs grind FINER than stock Gen 2 burrs at the same number, so typical settings sit roughly 2 numbers coarser. IMPORTANT: Express settings using "number + clicks" notation. Valid positions are: a whole number alone (e.g., "5"), a number plus 1 click (e.g., "5 + 1 click"), or a number plus 2 clicks (e.g., "5 + 2 clicks"). NEVER use decimals. NEVER say "+3 clicks" — the maximum is +2 clicks before the next number. Filter-only grinder, not suitable for espresso.',
    brewRanges: {
      pourOver: '4 + 1 click – 7',
      immersion: '6 + 1 click – 9',
      coldBrew: '8 + 1 click – 11',
    },
  },
  // Gen 1 has the same 31-step dial as Gen 2 (not 11 whole numbers). Its stock
  // burrs only reach ~500 µm, so pour-over sits near the fine end of the dial.
  'Fellows Ode Gen 1': {
    range: '1–11',
    type: 'stepped',
    settings: 31,
    unit: 'number + clicks',
    rangeSource: 'estimate',
    description: '31 stepped settings from 1 (finest) to 11 (coarsest). Dial has 11 numbered positions with 2 intermediate clicks between each number (the number itself, +1 click, +2 clicks). Stock Gen 1 burrs grind no finer than ~500 microns, so pour-over sits near the fine end of the dial. Setting 1 sits one click from burr touch. IMPORTANT: Express settings using "number + clicks" notation (e.g., "3", "3 + 1 click", "3 + 2 clicks"). NEVER use decimals. NEVER say "+3 clicks". Filter-only grinder, not suitable for espresso.',
    brewRanges: {
      pourOver: '1 + 1 click – 4',
      immersion: '3 – 6',
      coldBrew: '6 + 1 click – 11',
    },
  },
  // Opus dial is printed 1–11 with 4 steps per number (quarter steps), plus an
  // inner calibration ring. Ranges are set to the same micron targets as the
  // validated Ode Gen 2 bands (HCG: Opus 230–1160 µm across 1–11).
  'Fellows Opus': {
    range: '1–11',
    type: 'stepped',
    settings: 41,
    unit: 'number in quarter steps',
    rangeSource: 'estimate',
    description: '41 stepped settings on an outer ring printed 1 (finest) to 11 (coarsest), with 3 minor marks between each number — quarter steps (1, 1.25, 1.5, 1.75, 2 …). An inner calibration ring shifts the whole scale slightly; leave it at its default unless recalibrating. IMPORTANT: Express settings as the dial number in quarter steps (e.g., "3", "3.25", "4.5", "6.75"). NEVER output any other decimal (no "3.3" or "4.1"). All-purpose grinder covering espresso through cold brew.',
    brewRanges: {
      espresso: '1–2.5',
      pourOver: '3–5.5',
      immersion: '5.5–8.5',
      coldBrew: '7.75–11',
    },
  },

  // ── Baratza ───────────────────────────────────────────────────────────
  // Baratza starting points (Encore & Virtuoso+): espresso 8, AeroPress 12,
  // V60 15, auto brewer 18, Chemex 20, French press 28. No cold brew figure.
  'Baratza Encore': {
    range: '1–40',
    type: 'stepped',
    settings: 40,
    unit: 'whole number',
    rangeSource: 'manufacturer + tāst',
    description: '40 indexed grind settings from 1 (finest) to 40 (coarsest). Each number is a distinct, repeatable position on the adjustment ring — there are NO intermediate positions. Baratza starting points: AeroPress 12, V60 15, auto brewer 18, Chemex 20, French press 28. IMPORTANT: Express settings ONLY as whole numbers (e.g., "14", "18", "25"). NEVER output decimals.',
    brewRanges: {
      espresso: '5–10 (coarse espresso only)',
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
    rangeSource: 'manufacturer + tāst',
    description: '40 indexed grind settings from 1 (finest) to 40 (coarsest). Same stepped ring as Encore with upgraded conical burrs — there are NO intermediate positions. Baratza starting points: AeroPress 12, V60 15, auto brewer 18, Chemex 20, French press 28. IMPORTANT: Express settings ONLY as whole numbers (e.g., "14", "18", "25"). NEVER output decimals.',
    brewRanges: {
      espresso: '5–10 (coarse espresso only)',
      pourOver: '12–21',
      immersion: '21–28',
      coldBrew: '28–40',
    },
  },
  // Vario+ manual: burrs touch at 2Q (never grind finer). Starting points
  // (ceramic burrs): espresso 2Q, AeroPress 4M, V60 6M, auto drip 7M,
  // Chemex 9M, French press 10M. 12 micro clicks ≈ 1 macro step.
  'Baratza Vario+': {
    range: '2Q–10 (burrs touch at 2Q)',
    type: 'macro-micro',
    settings: 'varies',
    unit: 'number + letter (e.g., 4M, 6M)',
    rangeSource: 'manufacturer + tāst',
    description: 'Dual-lever stepped system. Macro lever: 1 (finest) to 10 (coarsest). Micro lever: letters, A finest, running past Q; 12 micro clicks equal roughly one macro step, so the scales overlap. The burrs touch at 2Q — NEVER recommend anything finer than 2Q. Baratza starting points (ceramic burrs): espresso 2Q, AeroPress 4M, V60 6M, auto drip 7M, Chemex 9M, French press 10M. Steel burrs run 1–2 macro steps finer. IMPORTANT: Express settings ONLY as a number followed by a letter (e.g., "4M", "6M", "9C"). NEVER use bare numbers or decimals.',
    brewRanges: {
      espresso: '2Q–4A',
      pourOver: '4M–8A',
      immersion: '7M–10M',
      coldBrew: '9M–10Q',
    },
  },

  // ── OXO ───────────────────────────────────────────────────────────────
  // OXO manual: 1–5 espresso, 6–10 pour over/drip, 11–15 French press/cold brew.
  'OXO Brew Conical Burr': {
    range: '1–15',
    type: 'stepped',
    settings: 15,
    unit: 'whole number + optional micro',
    rangeSource: 'manufacturer',
    description: '15 main numbered settings (1 finest to 15 coarsest) with additional micro-settings between numbers (OXO does not publish how many). OXO guide: 1–5 espresso, 6–10 pour over/drip, 11–15 French press/cold brew. IMPORTANT: Express settings as a whole number (e.g., "8", "12"). NEVER output decimals. Filter-focused grinder.',
    brewRanges: {
      pourOver: '6–10',
      immersion: '10–14',
      coldBrew: '13–15',
    },
  },

  // ── Comandante ────────────────────────────────────────────────────────
  // Comandante FAQ: espresso 7–13, moka 14–20, pour over 18–35,
  // French press/cupping 25–35. No official cold brew figure.
  'Comandante C40': {
    range: '0–40 clicks',
    type: 'clicks',
    settings: 40,
    unit: 'clicks',
    rangeSource: 'manufacturer + tāst',
    description: 'Clicks counted from zero (stock axle). Find zero: hold the grinder horizontal and close the burrs gradually — click 0 is the first setting where the handle no longer drops to 6 o\'clock on its own. Comandante guide: espresso 7–13, moka pot 14–20, pour over 18–35, French press 25–35. IMPORTANT: Express settings ONLY as a whole number of clicks followed by the word "clicks" (e.g., "26 clicks", "30 clicks"). NEVER output decimals or bare numbers without "clicks". Premium hand grinder, all-purpose. (Red Clix axle doubles every click count.)',
    brewRanges: {
      espresso: '7–13 clicks',
      pourOver: '20–32 clicks',
      immersion: '25–35 clicks',
      coldBrew: '32–40 clicks',
    },
  },

  // ── Timemore ──────────────────────────────────────────────────────────
  // C2 is discontinued and Timemore no longer publishes a guide; third-party
  // sources put V60 at ~18–22 and French press at ~24–27.
  'Timemore C2': {
    range: '0–36 clicks',
    type: 'clicks',
    settings: 36,
    unit: 'clicks',
    rangeSource: 'estimate',
    description: '36 audible clicks counted back from fully closed (0) — turn the dial finer until the handle stops, then count. Each click moves the burr one discrete step. IMPORTANT: Express settings ONLY as a whole number of clicks followed by the word "clicks" (e.g., "18 clicks", "22 clicks"). NEVER output decimals or bare numbers without "clicks". Budget hand grinder, best for filter brewing.',
    brewRanges: {
      espresso: '6–10 clicks',
      pourOver: '14–22 clicks',
      immersion: '22–28 clicks',
      coldBrew: '28–36 clicks',
    },
  },
  // Chestnut X manual: espresso 5–7, pour over 13–16 (recommended 15),
  // French press 17–22. Never grind at 0–3 (burr damage).
  'Timemore Chestnut X': {
    range: '0–24 clicks',
    type: 'clicks',
    settings: 24,
    unit: 'clicks',
    rangeSource: 'manufacturer + tāst',
    description: 'Numbered dial read in clicks from 0 (finest) — the dial shows the absolute position, so no counting from burr touch. Timemore guide: espresso 5–7 clicks, pour over 13–16 clicks (15 recommended), French press 17–22 clicks. Never grind at 0–3 clicks — it can damage the burrs. IMPORTANT: Express settings ONLY as a whole number of clicks followed by the word "clicks" (e.g., "15 clicks", "19 clicks"). NEVER output decimals or bare numbers without "clicks". Premium hand grinder, all-purpose.',
    brewRanges: {
      espresso: '5–7 clicks',
      pourOver: '12–16 clicks',
      immersion: '16–22 clicks',
      coldBrew: '20–24 clicks',
    },
  },

  // ── 1Zpresso ──────────────────────────────────────────────────────────
  // Official JX-Pro chart (40 clicks/turn, 12.5 µm/click): espresso 48–64,
  // AeroPress/moka/drip 96–120, pour over/siphon 128–176, French press 168–200.
  '1Zpresso JX-Pro': {
    range: '0–200 clicks',
    type: 'clicks',
    settings: 200,
    unit: 'clicks',
    rangeSource: 'manufacturer',
    description: 'Clicks counted from zero (where the handle first starts to resist — not the tightest point). 40 clicks per full turn (10 numbers × 4 clicks), 12.5 microns per click, about 5 turns total. 1Zpresso guide: espresso 48–64 clicks, AeroPress/moka/drip 96–120, pour over 128–176, French press 168–200. To convert to the dial: turns = clicks ÷ 40, then number = remaining clicks ÷ 4. IMPORTANT: Express settings ONLY as a whole number of clicks followed by the word "clicks" (e.g., "140 clicks", "152 clicks"). NEVER output decimals or bare numbers without "clicks". All-purpose hand grinder with espresso capability.',
    brewRanges: {
      espresso: '48–64 clicks',
      pourOver: '120–176 clicks',
      immersion: '150–200 clicks',
      coldBrew: '176–200 clicks',
    },
  },
  // Official K-series chart (90 clicks/turn, 22 µm/click, range runs past one
  // turn): espresso 30–45, AeroPress/moka/drip 50–70, pour over/siphon 80–90,
  // French press 90–100. Third-party V60 data (~68–87) sits between the two
  // filter bands, so pour-over spans 70–90.
  '1Zpresso K-Max': {
    range: '0–180 clicks',
    type: 'clicks',
    settings: 180,
    unit: 'clicks',
    rangeSource: 'manufacturer + tāst',
    description: 'Clicks counted from zero on the external dial (zero = where the handle first starts to resist). 90 clicks per full turn (9 numbers × 10 clicks), 22 microns per click, and the range continues past one full turn. 1Zpresso guide: espresso 30–45 clicks, AeroPress/moka/drip 50–70, pour over 80–90, French press 90–100. IMPORTANT: Express settings ONLY as a whole number of clicks from zero followed by the word "clicks" (e.g., "78 clicks", "95 clicks"). NEVER output decimals or bare numbers without "clicks". All-purpose hand grinder, strongest at filter.',
    brewRanges: {
      espresso: '30–45 clicks',
      pourOver: '70–90 clicks',
      immersion: '85–100 clicks',
      coldBrew: '95–115 clicks',
    },
  },

  // ── Eureka ────────────────────────────────────────────────────────────
  // Eureka publishes no brew settings, and the Mignon dial turns more than
  // once. Ranges below are tāst estimates read as the dial number within the
  // first turn past burr-touch zero — needs confirming on a real unit.
  'Eureka Mignon': {
    range: 'Stepless',
    type: 'stepless',
    settings: 'infinite',
    unit: 'dial number (0.1 increments)',
    rangeSource: 'estimate',
    description: 'Stepless (infinitely adjustable) numbered dial that can turn more than one full rotation, so the printed number alone doesn\'t pin down the grind. Find zero first: with the motor running and no beans, turn finer until the burrs just touch, then back off until the noise stops — that is your zero. Settings here are read as the dial position from that zero. Eureka publishes no brew-method settings, so these are tāst estimates. IMPORTANT: Express settings as a dial number in 0.1 increments (e.g., "1.5", "2.3", "4.0"). NEVER output more than one decimal place. Primarily espresso-focused, though some variants (Filtro) handle filter grinds.',
    brewRanges: {
      espresso: '0.5–2.0',
      pourOver: '3.0–5.0',
      immersion: '5.0–7.0',
      coldBrew: '7.0–9.0',
    },
  },

  // ── Niche ─────────────────────────────────────────────────────────────
  // Niche grind guide: espresso 5–20 (10–20 typical), moka 20–30,
  // AeroPress 30–35, V60 35–45, French press 45+. Dial is stepless and the
  // usable range continues past the printed 50.
  'Niche Zero': {
    range: '0–50',
    type: 'stepped',
    settings: 'infinite',
    unit: 'whole number',
    rangeSource: 'manufacturer + tāst',
    description: 'Stepless dial printed 0 (finest) to 50 (coarsest); the usable range continues a little past 50 for very coarse grinds. Niche guide: espresso 10–20, moka pot 20–30, AeroPress 30–35, V60 35–45, French press 45+. Never grind at the "calibrate" mark — the burrs touch there. IMPORTANT: Express settings as whole numbers (e.g., "15", "38", "46"). NEVER output decimals. True all-purpose single-dose grinder.',
    brewRanges: {
      espresso: '10–20',
      pourOver: '30–45',
      immersion: '40–50',
      coldBrew: '46–50',
    },
  },

  // ── Mahlkönig ─────────────────────────────────────────────────────────
  // X54 manual: espresso 01–05, café crème 05–15, filter 15–25, French press >25.
  'Mahlkönig X54': {
    range: '1–35 (stepless dial)',
    type: 'stepless',
    settings: 'infinite',
    unit: 'dial number',
    rangeSource: 'manufacturer + tāst',
    description: 'Stepless numbered grind dial from 01 (finest, ~200 microns) to 35 (coarsest). Turn toward smaller numbers for finer, larger numbers for coarser — only adjust finer while the motor is running. Mahlkönig guide: espresso 01–05, café crème 05–15, filter 15–25, French press above 25. Ships with two front burr plates — the espresso plate for fine/espresso grinds and the filter plate (installed by default) for drip and pour-over; swap the plate for the style you\'re brewing. IMPORTANT: Express settings as a dial number in 0.1 increments (e.g., "3.0", "20.0"). NEVER output more than one decimal place. All-purpose home grinder.',
    brewRanges: {
      espresso: '1–5',
      pourOver: '15–25',
      immersion: '22–32',
      coldBrew: '28–35',
    },
  },
  // X64 SD official: espresso 0–2, filter 2–7, coarse/cold brew 7–12.
  'Mahlkönig X64 SD': {
    range: '0–12 (stepless dial)',
    type: 'stepless',
    settings: 'infinite',
    unit: 'dial number',
    rangeSource: 'manufacturer + tāst',
    description: 'Single-dose 64mm flat-burr grinder with a stepless numbered dial from 0 to 12 (a guide is printed on the lid). Mahlkönig\'s own guidance: about 0–2 for espresso, 2–7 for filter, and 7–12 for coarse. IMPORTANT: Express settings as a dial number in 0.1 increments (e.g., "1.5", "4.0"). NEVER output more than one decimal place. True all-purpose single-dose grinder.',
    brewRanges: {
      espresso: '0.5–2',
      pourOver: '2.5–5',
      immersion: '5–7',
      coldBrew: '7–12',
    },
  },
  // E64 WS has no numbered dial: grind is set electronically as a burr
  // distance in microns (0–300 µm display), and Mahlkönig sells it as an
  // espresso grinder. No published targets exist, so Pour Pal speaks in
  // descriptive terms until tāst has calibrated numbers.
  'Mahlkönig E64 WS': {
    range: 'Set by burr distance (0–300 µm display)',
    type: 'descriptive',
    settings: 'infinite',
    unit: 'description',
    rangeSource: 'estimate',
    description: 'Espresso-focused 64mm flat-burr, grind-by-weight home grinder. Grind size is set electronically and shown as a burr distance in microns (0–300 µm display) — there is no numbered dial. Mahlkönig publishes no brew-method targets and recommends the X64 SD for filter brewing. IMPORTANT: Express settings ONLY using descriptive terms (Extra Fine, Fine, Medium-Fine, Medium, Medium-Coarse, Coarse, Extra Coarse), and tell the user to dial in by taste from their saved espresso setting. NEVER output dial numbers.',
    brewRanges: {
      espresso: 'Fine to Extra Fine',
      pourOver: 'Medium-Fine to Medium',
      immersion: 'Medium to Medium-Coarse',
      coldBrew: 'Coarse to Extra Coarse',
    },
  },

  // ── Weber ─────────────────────────────────────────────────────────────
  // Weber publishes no brew-method settings for KEY, EG-1 or HG-2 — only
  // "5 micron stepped adjustment". All Weber ranges are tāst estimates.
  'Weber Key': {
    range: '0.0–3.0 turns',
    type: 'stepless',
    settings: 'infinite',
    unit: 'turns from burr-zero (rotation.number)',
    rangeSource: 'estimate',
    description: 'Single-dose grinder with 5-micron stepped adjustment, read as turns from your own burr-zero (where the burrs just touch). Larger numbers / clockwise = coarser. Weber notes settings as rotation.number.sub-number (e.g., "1.2.4" = one full turn plus 2.4). Because every unit\'s zero differs, establish your burr-zero first. Weber publishes no brew-method settings, so these are tāst estimates. IMPORTANT: Express settings here as turns in 0.1 increments (e.g., "1.5" = one full turn plus 5), where the whole number is rotations and the decimal is the dial number. NEVER output more than one decimal place. Premium all-purpose grinder.',
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
    rangeSource: 'estimate',
    description: '80mm flat-burr grinder (CORE burrs) with 5-micron stepped adjustment (each tick = 5 microns), read as the number of printed marks above your own burr-zero. Weber states there is no absolute zero — find the point where the burrs just touch and count up from there. Weber publishes no brew-method settings, so these are tāst estimates. IMPORTANT: Express settings as a number of marks from zero in 0.1 increments (e.g., "6.0", "14.0"). NEVER output more than one decimal place. All-purpose, espresso through filter.',
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
    rangeSource: 'estimate',
    description: 'Hand grinder with 5-micron stepped adjustment, read as turns of the collar from your burr-zero (the ring passes numbers 0–14 each turn; clockwise = coarser). Establish your burr-zero first; a common start is about 1.75 turns for espresso and 2.75 turns for pour-over. Weber publishes no brew-method settings, so these are tāst estimates. IMPORTANT: Express settings as turns in 0.1 increments (e.g., "1.8", "2.8"). NEVER output more than one decimal place. Premium all-purpose hand grinder.',
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

  const sourceLine = grinder.rangeSource ? `\nRange source: ${grinder.rangeSource}` : '';

  return `${grinder.description}
Total distinct settings: ${grinder.settings}
Typical brew ranges for ${grinderName}:
${rangeLines}${sourceLine}`;
}

module.exports = { GRINDERS, getGrinderPromptContext };
