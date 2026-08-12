/**
 * tāst recipe engine — the deterministic core.
 *
 * buildRecipe({ coffeeData, brewData }) returns the exact recipe object the UI
 * renders. Given the same inputs it ALWAYS returns the same output: no AI, no
 * randomness, no network. All brewing knowledge comes from app/data/brewing/
 * and app/data/grinders.js.
 *
 * Adjustment stack (per the brewing-logic spec):
 *   device baseline → roast → variety → elevation/density → process →
 *   freshness → signature method → clamp.
 */

import { getDevice, DEVICES } from '../../data/brewing/devices';
import { getRoastProfile, getProcessAdjustment, getDecafAdjustment } from '../../data/brewing/profiles';
import { getVarietyAdjustment } from '../../data/brewing/varieties';
import { getElevationAdjustment } from '../../data/brewing/elevation';
import { getFreshnessAdjustment } from '../../data/brewing/freshness';
import { getWaterAdjustment } from '../../data/brewing/water';
import { getFilterAdjustment, shiftTimeLabel } from '../../data/brewing/filters';
import { getMethod } from '../../data/brewing/methods';
import { GRINDERS } from '../../data/grinders';
import { computeGrind, grindStepHint } from './grind';
import { buildSteps } from './steps';
import { buildFlavorNotes, buildExpectedProfile } from './prose';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const roundTo = (n, d) => { const f = 10 ** d; return Math.round(n * f) / f; };

// Styles with no hands-on, clock-timed pour sequence — the live "Brew along"
// timer is hidden for these (espresso is a machine pull, moka is stovetop until
// it flows, cold steep is a multi-hour passive soak). Everything else (pour-
// overs, flash, immersion) keeps it.
const NO_BREW_ALONG = new Set(['espresso', 'moka', 'coldsteep']);

// Dial-in advice, spoken in the user's OWN grinder units. `grind` is the
// { finer, coarser } hint from grindStepHint (e.g. "grind ~2 clicks finer");
// we capitalize it at the head of a fix.
function buildDialingIn(style, category, grind = {}) {
  const finer = grind.finer || 'grind finer';
  const coarser = grind.coarser || 'grind coarser';
  const Cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  if (style === 'espresso') {
    return [
      { issue: 'Shot too fast (<20s)', fix: Cap(finer) },
      { issue: 'Shot too slow (>40s)', fix: Cap(coarser) },
      { issue: 'Sour', fix: 'Raise temp or extend the ratio' },
      { issue: 'Bitter', fix: 'Lower temp or shorten the ratio' },
    ];
  }
  if (style === 'coldsteep') {
    return [
      { issue: 'Weak or watery', fix: 'Steep longer or add coffee' },
      { issue: 'Harsh or over-extracted', fix: `Shorten the steep; ${coarser}` },
    ];
  }
  if (category === 'Immersion') {
    return [
      { issue: 'Sour or weak', fix: `${Cap(finer)} or steep longer` },
      { issue: 'Bitter or muddy', fix: `${Cap(coarser)} or steep less` },
      { issue: 'Silty cup', fix: `${Cap(coarser)}; skim the fines` },
    ];
  }
  return [
    { issue: 'Sour or weak', fix: `${Cap(finer)}, or raise temp` },
    { issue: 'Bitter or harsh', fix: `${Cap(coarser)}, or lower temp` },
    { issue: 'Slow drawdown', fix: `${Cap(coarser)}; pour gentler` },
    { issue: 'Fast drawdown', fix: `${Cap(finer)}; slow your pours` },
  ];
}

export function buildRecipe({ coffeeData = {}, brewData = {}, now = Date.now() } = {}) {
  const device = getDevice(brewData.device);
  const roast = getRoastProfile(coffeeData.roastLevel);
  const proc = getProcessAdjustment(coffeeData.process);
  const variety = getVarietyAdjustment(coffeeData.variety);
  const elev = getElevationAdjustment(coffeeData.elevation);
  const fresh = getFreshnessAdjustment(coffeeData.roastedOn, now);
  const decaf = getDecafAdjustment(coffeeData);          // orthogonal to wash process
  const water = getWaterAdjustment(brewData.water);       // one-time user water setting
  // Premium papers change flow rate; boosters even the bed. Both are about the
  // GEAR, not the coffee — like water hardness, they apply at full strength.
  const filter = getFilterAdjustment(brewData.filter, brewData.booster, brewData.device);

  const method = getMethod(brewData.brewMethod);
  const mo = (method.overrides && method.appliesTo(device, brewData.device)) ? method.overrides : null;
  const roastLevel = coffeeData.roastLevel || 'Medium';

  // Learning loop: a per-coffee+gear correction the user dialed in last time
  // (e.g. "too sour" → one step finer). +grindSteps = coarser, −finer; one
  // step ≈ one dial notch (12% of the brew band). tempDelta shifts the water.
  const tweak = brewData.tweak || {};
  const tweakGrindT = (Number(tweak.grindSteps) || 0) * 0.12;

  // ── Grind (native units; finer for light/dense, coarser per method) ──
  // The method's own grind nudge is amplified (×1.4) so a maker recipe's
  // intent — a single fine pour vs. a coarse, tea-like brew — stays visible in
  // the dial number even on stepped grinders where small shifts would round away.
  const t = clamp(
    roast.grindT + (device.grindBias || 0) + (proc.grindTDelta || 0) +
    (variety.grindTDelta || 0) + (elev.grindTDelta || 0) + (fresh.grindTDelta || 0) +
    (decaf.grindTDelta || 0) + (water.grindTDelta || 0) + (filter.grindTDelta || 0) +
    (mo?.grindBiasDelta || 0) * 1.4 + tweakGrindT,
    0, 1
  );
  const grind = computeGrind({ grinderName: brewData.grinder, grindKey: device.grindKey, t });

  // ── Temperature ──────────────────────────────────────────────────────
  let temperature = '';
  if (mo?.tempOverride != null) {
    // A maker recipe (e.g. an Orea named recipe) sets a target temperature, and
    // the maker's number leads: The Dara reads ~92°C whether the lot is light or
    // dark. The coffee still shades it, but only gently (≈40% of the usual
    // roast/process/density pull) so the recipe's own intent stays legible
    // instead of collapsing against the ceiling. Wide clamp keeps that headroom.
    const coffeeAdj = roast.tempDelta + proc.tempDelta + variety.tempDelta + elev.tempDelta;
    const raw = mo.tempOverride + coffeeAdj * 0.4;
    temperature = String(clamp(Math.round(raw), 82, 99));
  } else if (mo?.tempByRoast) {
    const baseT = mo.tempByRoast[roastLevel] ?? mo.tempByRoast['Medium'];
    temperature = String(clamp(Math.round(baseT + variety.tempDelta + elev.tempDelta + proc.tempDelta), 80, 98));
  } else if (device.baseTempC != null) {
    // Ceilings: espresso 96°C; filter 97°C for everyday (non-delicate) coffees,
    // so even a dense, high-grown light roast never runs past ~97°C.
    const lo = device.category === 'Espresso' ? 88 : 84;
    const hi = device.category === 'Espresso' ? 96 : 97;
    const raw = device.baseTempC + roast.tempDelta + proc.tempDelta + variety.tempDelta + elev.tempDelta + (mo?.tempBump || 0);
    temperature = String(clamp(Math.round(raw), lo, hi));
  }

  // Decaf (porous → cooler) and the user's water hardness apply at full strength
  // even to maker recipes — they're about the bean and the water, not the recipe's
  // flavor target — so they sit outside the maker-leads dampening above.
  if (temperature && (decaf.tempDelta || water.tempDelta)) {
    const lo = device.category === 'Espresso' ? 85 : 82;
    const hi = device.category === 'Espresso' ? 97 : 99;
    temperature = String(clamp(Math.round(Number(temperature) + (decaf.tempDelta || 0) + (water.tempDelta || 0)), lo, hi));
  }

  // Delicate-cultivar temperature cap: density (high elevation) can't push a
  // Gesha or other delicate floral past its (lower) ceiling. Founder decision.
  if (temperature && variety.tempCap && Number(temperature) > variety.tempCap) {
    temperature = String(variety.tempCap);
  }
  // Learning loop: apply the user's last temperature correction for this cup.
  if (temperature && tweak.tempDelta) {
    const lo = device.category === 'Espresso' ? 85 : 80;
    temperature = String(clamp(Math.round(Number(temperature) + Number(tweak.tempDelta)), lo, 100));
  }

  // ── Ratio ──────────────────────────────────────────────────────────
  const decimals = mo?.ratioDecimals ?? device.ratioDecimals ?? 0;
  let ratioNum;
  if (device.style === 'espresso') {
    // Roast leads espresso strength: light roasts are dense and slow to give up
    // solubles, so they want a longer ratio (toward 1:2.3–2.5) and a slower
    // pull; dark roasts extract fast and stay tight (~1:1.5–1.8). The 0.7
    // coefficient widens that spread from the old near-flat 0.2.
    ratioNum = clamp(device.baseRatio + (-roast.ratioDelta) * 0.7, 1.5, 3.0);
  } else if (mo?.fixedRatio) {
    // Faithful maker recipe (e.g. an Orea named recipe) — use its exact ratio.
    ratioNum = mo.ratio;
  } else {
    const base = mo?.ratio ?? device.baseRatio;
    ratioNum = Math.max(5, base + roast.ratioDelta + (variety.ratioDelta || 0) + (decaf.ratioDelta || 0));
  }
  const ratioR = roundTo(ratioNum, decimals);
  let ratioLabel = ratioR.toFixed(decimals);

  // ── Dose / water / yield ───────────────────────────────────────────
  const targetWeight = parseInt(brewData.targetWeight, 10) || 300;
  let doseG, waterG = targetWeight, yieldG = 0, hotG = 0, iceG = 0, concWaterG = 0, bypassG = 0;
  const stepStyle = mo?.stepStyle || device.style;

  if (stepStyle === 'champ') {
    doseG = mo.dose || 18;
    concWaterG = Math.round(doseG * ratioR);
    const finalG = Math.round(concWaterG * (mo.bypassRatio || 1.4));
    bypassG = finalG - concWaterG;
    waterG = finalG;
    ratioLabel = (finalG / doseG).toFixed(1); // effective cup ratio
  } else if (device.style === 'espresso') {
    doseG = device.dose || 18;
    yieldG = Math.round(doseG * ratioR);
  } else {
    doseG = Math.max(1, Math.round(waterG / ratioR));
    if (device.style === 'flash') {
      hotG = Math.round(waterG * 0.6);
      iceG = waterG - hotG;
    }
  }

  // ── Bloom (method may override; freshness scales it) ────────────────
  const bloomSpec = mo && 'bloom' in mo ? mo.bloom : device.bloom;
  let bloomG = 0, bloomSeconds = 40;
  if (bloomSpec) {
    const bloomRatio = Math.max(1.5, bloomSpec.ratio + (fresh.bloomRatioDelta || 0));
    bloomSeconds = Math.max(20, bloomSpec.seconds + (fresh.bloomSecondsDelta || 0));
    const cap = device.style === 'flash' ? hotG : waterG;
    bloomG = Math.min(Math.round(doseG * bloomRatio), Math.round(cap * 0.45));
  }

  // ── Steps ──────────────────────────────────────────────────────────
  // A fast/slow paper reshapes the brew window itself — but only on the
  // generic templates ('filter'/'flash'), where pour spacing derives from the
  // window. Maker timelines (Kasuya, Rao, Orea plans) keep their own clocks;
  // their pour cues are published numbers, and the paper note carries the
  // timing story instead.
  const baseTotalTime = mo?.totalTime || device.totalTime;
  const totalTime = (filter.timeFactor && (stepStyle === 'filter' || stepStyle === 'flash'))
    ? shiftTimeLabel(baseTotalTime, filter.timeFactor)
    : baseTotalTime;
  // Orea recipes may split the total into poured water + ice + bypass.
  const oreaBrewWater = Math.round(waterG * (mo?.hotFraction ?? 1));
  const oreaIce = Math.round(waterG * (mo?.iceFraction ?? 0));
  const oreaBypass = Math.round(waterG * (mo?.bypassFraction ?? 0));
  const brewSteps = buildSteps({
    style: stepStyle,
    doseG, waterG, bloomG, bloomSeconds,
    totalTimeLabel: totalTime,
    pours: mo?.pours ?? device.pours,
    pourPlan: mo?.pourPlan,
    brewWaterG: oreaBrewWater, oreaIce, oreaBypass,
    yieldG, ratioLabel, hotG, iceG,
    concWaterG, bypassG, tempC: temperature,
    agitation: variety.agitation, // delicate cultivars → gentler pours
  });

  // ── Copy ───────────────────────────────────────────────────────────
  let flavorNotes;
  if (coffeeData.notes && coffeeData.notes.trim()) {
    flavorNotes = buildFlavorNotes(coffeeData);
  } else if (variety.notes && variety.notes.length) {
    flavorNotes = variety.notes.slice(0, 4);
  } else {
    flavorNotes = buildFlavorNotes(coffeeData);
  }
  const expectedProfile = buildExpectedProfile(coffeeData, device, flavorNotes);

  const brewingNotes = [];
  if (stepStyle === 'champ') {
    // The headline ratio is the cup ratio; the brew itself is a stronger concentrate.
    brewingNotes.push(`Concentrate method: you brew ${concWaterG}g of water at roughly 1:${ratioR.toFixed(0)} strength, then add ${bypassG}g of bypass water to land at 1:${ratioLabel} in the cup.`);
  }
  if (temperature) {
    brewingNotes.push(`Water at ${temperature}°C is tuned to the ${roastLevel.toLowerCase()} roast — lighter roasts take hotter water, darker roasts cooler.`);
  }
  // Espresso strength moves with roast — coach the pull to match.
  if (device.style === 'espresso') {
    if (/light/i.test(roastLevel)) {
      brewingNotes.push(`Light-roast espresso needs more contact to open up — aim for the wider 1:${ratioLabel} ratio and a slower 30–40s pull; don’t chase a fast shot.`);
    } else if (/dark/i.test(roastLevel)) {
      brewingNotes.push(`Dark-roast espresso extracts fast — keep it tight at 1:${ratioLabel} and a brisk ~22–28s pull so it doesn’t turn bitter.`);
    }
  }
  // Grind ↔ time expectation (pour-over family): where drawdown should land.
  // A non-standard paper rewrites the timing story (its own note covers it),
  // so the grind-position heuristic only speaks for standard paper.
  const POUR_STYLES = new Set(['filter', 'orea', 'kasuya', 'rao', 'flash']);
  if (POUR_STYLES.has(stepStyle) && totalTime && !filter.timeShift) {
    if (t <= 0.38) {
      brewingNotes.push(`This grind is on the finer side, so expect the drawdown toward the slower end of ${totalTime} — that’s normal; only coarsen if it truly stalls or turns bitter.`);
    } else if (t >= 0.62) {
      brewingNotes.push(`This grind is on the coarser side, so the drawdown should finish toward the faster end of ${totalTime}; if it runs quick and tastes thin, grind a touch finer.`);
    }
  }
  // Water chemistry is ~98% of the cup — profile-aware when the user has set it.
  brewingNotes.push(device.baseTempC == null
    ? 'Water is most of the cup: use fresh, cold filtered water. Distilled tastes flat; hard tap turns it dull.'
    : water.note);
  // Paper & booster notes — gear intelligence, same tier as water.
  for (const n of filter.notes || []) brewingNotes.push(n);
  if (decaf.note) brewingNotes.push(decaf.note);
  if (grind.fellBack && device.grindKey === 'espresso') {
    brewingNotes.push(`Heads up: your grinder isn’t built for espresso-fine grounds, so this setting is our closest approximation — a finer espresso grinder will pull a better shot.`);
  }
  if (variety.note) brewingNotes.push(variety.note);
  if (elev.note) brewingNotes.push(elev.note);
  if (proc.note) brewingNotes.push(proc.note);
  if (fresh.note) brewingNotes.push(fresh.note);
  if (mo && method.id !== 'balanced') brewingNotes.push(`Method: ${method.label}. ${method.blurb}`);
  for (const n of device.notes || []) brewingNotes.push(n);

  // Coverage advisor: be honest when an input falls outside the knowledge well,
  // rather than silently serving a default as if it were tuned. Priority-ordered,
  // capped at two so it stays helpful, not noisy.
  const coverage = [];
  if (!coffeeData.roastLevel) coverage.push('Add the roast level and we can tune the water temperature, grind, and ratio much more precisely — it’s the biggest lever we have.');
  if (brewData.grinder && !GRINDERS[brewData.grinder]) coverage.push(`We don’t have grind data for “${brewData.grinder}” yet, so the setting is descriptive (fine → coarse). Pick a listed grinder to get your exact clicks or numbers.`);
  if (brewData.device && !DEVICES[brewData.device]) coverage.push(`“${brewData.device}” isn’t in our brewer library yet — we’ve used standard pour-over parameters. Choosing the closest listed brewer sharpens the recipe.`);
  if (coffeeData.variety && variety.name === '') coverage.push(`We don’t have specifics for the ${coffeeData.variety} variety yet, so this leans on our balanced baseline. Brew it and tell us how it lands — that teaches the recipe.`);
  if (coffeeData.process && proc.family === 'washed' && !/wash/i.test(coffeeData.process)) coverage.push(`“${coffeeData.process}” isn’t a process we model specifically yet — treated as a clean, washed-style baseline.`);
  for (const n of coverage.slice(0, 2)) brewingNotes.push(n);

  // Learning loop: lead with what we changed from the user's last cup.
  const adjusted = !!(tweak.grindSteps || tweak.tempDelta);
  if (adjusted) {
    const bits = [];
    if (tweak.grindSteps) {
      const n = Math.abs(tweak.grindSteps);
      bits.push(`${n} step${n > 1 ? 's' : ''} ${tweak.grindSteps < 0 ? 'finer' : 'coarser'}`);
    }
    if (tweak.tempDelta) bits.push(`${tweak.tempDelta > 0 ? '+' : ''}${tweak.tempDelta}°C`);
    brewingNotes.unshift(`Tuned from your last brew of this coffee: ${bits.join(', ')}. Brew it and tell us how it lands — we'll keep dialing it in.`);
  }

  const grindHint = grindStepHint({ grinderName: brewData.grinder, grindKey: device.grindKey });

  return {
    dose: `${doseG}g`,
    water: device.style === 'espresso' ? `${yieldG}g` : `${waterG}g`,
    ratio: `1:${ratioLabel}`,
    temperature,
    grindSetting: grind.grindSetting,
    totalTime,
    expectedProfile,
    flavorNotes,
    brewSteps,
    dialingIn: buildDialingIn(stepStyle, device.category, grindHint),
    grindHint, // { amount, finer, coarser } in the grinder's own units
    adjusted,
    brewingNotes,
    method: mo ? method.id : 'balanced', // effective method (falls back if N/A)
    brewAlong: !NO_BREW_ALONG.has(stepStyle), // show the live timer only for timed pours
  };
}
