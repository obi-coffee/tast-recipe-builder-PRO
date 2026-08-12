/**
 * Coffee-aware Brew Assist insights.
 *
 * The immersive brew guide used to speak only in generic encouragement — it
 * had no idea WHAT was being brewed. This module turns the coffee's own data
 * (freshness, process, variety, density, decaf, paper choice, roaster notes)
 * into short, step-aware lines the guide can surface mid-brew:
 *
 *   buildBrewInsights({ coffeeData, brewData, recipe }) → {
 *     prep:     [...]   // start screen, before the clock
 *     bloom:    [...]   // the bloom / first pour
 *     pour:     [...]   // main pours
 *     wait:     [...]   // steeps and rests
 *     drawdown: [...]   // the final drain
 *     finish:   [...]   // the "brewed." screen — what to taste for
 *   }
 *
 * Everything is deterministic and derived from the same knowledge well the
 * engine reads — this is presentation, not new brewing logic. Empty arrays are
 * normal (an unknown coffee simply falls back to the ambient prompts).
 */

import { getFreshnessAdjustment } from '../data/brewing/freshness';
import { getProcessAdjustment, getDecafAdjustment } from '../data/brewing/profiles';
import { getVarietyAdjustment } from '../data/brewing/varieties';
import { getElevationAdjustment } from '../data/brewing/elevation';
import { getFilterAdjustment } from '../data/brewing/filters';
import { getDevice } from '../data/brewing/devices';

// "Yirgacheffe Lot 4" → the name we speak about mid-brew. Falls back through
// origin/variety so even a sparse coffee gets addressed personally.
export function coffeeDisplayName(coffeeData = {}) {
  return (
    coffeeData.name ||
    [coffeeData.origin, coffeeData.variety].filter(Boolean).join(' ') ||
    'this coffee'
  ).trim();
}

export function buildBrewInsights({ coffeeData = {}, brewData = {}, recipe = {}, now = Date.now() } = {}) {
  const name = coffeeDisplayName(coffeeData);
  const fresh = getFreshnessAdjustment(coffeeData.roastedOn, now);
  const proc = getProcessAdjustment(coffeeData.process);
  const decaf = getDecafAdjustment(coffeeData);
  const variety = getVarietyAdjustment(coffeeData.variety);
  const elev = getElevationAdjustment(coffeeData.elevation);
  const filter = getFilterAdjustment(brewData.filter, brewData.booster, brewData.device);

  const out = { prep: [], bloom: [], pour: [], wait: [], drawdown: [], finish: [] };

  // ── Freshness → the bloom is where days-since-roast shows up ─────────
  if (fresh.days != null) {
    if (fresh.label === 'just roasted') {
      out.bloom.push(`Roasted ${fresh.days === 0 ? 'today' : `${fresh.days} day${fresh.days === 1 ? '' : 's'} ago`} — still full of CO₂. Expect the bed to dome and bubble; that big bloom is the gas getting out of the way.`);
    } else if (fresh.label === 'peak') {
      out.bloom.push(`${fresh.days} days off roast — right in the peak window. The bloom should rise steadily and settle clean.`);
    } else if (fresh.label === 'settling') {
      out.bloom.push(`${fresh.days} days off roast — settling now, so the bloom will be quieter than it was fresh. Still plenty in there.`);
    } else if (fresh.label === 'past peak') {
      out.bloom.push(`${fresh.days} days off roast — most of the CO₂ is gone, so don’t expect much rise. The slightly finer grind is recovering sweetness for you.`);
    }
  }

  // ── Process → aroma at the bloom, fines at the drawdown ──────────────
  if (proc.family === 'natural') {
    out.bloom.push(`This is a natural — sniff the bloom. That berry-sweet, winey lift is the dry-process fruit talking.`);
    out.drawdown.push(`Naturals throw more fines, so the drawdown can crawl a little. Let it — that texture is part of the cup.`);
  } else if (proc.family === 'anaerobic') {
    out.bloom.push(`Fermented lot — the bloom may smell wild, even boozy. That’s the anaerobic character; the cooler water keeps it in check.`);
    out.drawdown.push(`Expect a slightly slower, syrupy drawdown from this ferment — normal, not a stall.`);
  } else if (proc.family === 'honey') {
    out.pour.push(`Honey process — the mucilage sugars ride with the bean. Keep the pours easy and let the sweetness build.`);
  } else if (proc.family === 'wet-hulled') {
    out.pour.push(`Wet-hulled — this cup wants to be heavy and earthy. Don’t fight the body; it’s the point.`);
  }

  // ── Decaf ────────────────────────────────────────────────────────────
  if (decaf.isDecaf) {
    out.drawdown.push(`Decaf beans are porous and extract fast — the coarser, cooler recipe is protecting you from ashiness. Expect a quicker drain.`);
  }

  // ── Variety → pour technique + delicacy ──────────────────────────────
  if (variety.name) {
    if (variety.agitation === 'gentle') {
      out.pour.push(`${variety.name} is delicate — pour low and slow, like you’re trying not to wake it. The florals repay the care.`);
    } else if (variety.grindTDelta < 0) {
      out.pour.push(`${variety.name} is a dense bean — the finer grind is doing the work here. Keep the pours steady and let it extract.`);
    }
  }

  // ── Elevation / density ──────────────────────────────────────────────
  if (elev.density === 'very dense' || elev.density === 'dense') {
    out.wait.push(`Grown ${coffeeData.elevation || 'high'} — a dense, slow-ripened bean. Extraction takes a beat longer; patience is the recipe.`);
  } else if (elev.density === 'soft') {
    out.wait.push(`Lower-grown and soft-structured — this one gives itself up easily. The coarser grind keeps it from overreaching.`);
  }

  // ── Paper & booster → drawdown expectations ──────────────────────────
  if (filter.speed === 'fast') {
    out.drawdown.push(`That fast paper will pull this through quicker than standard — a fast finish is by design, not a mistake.`);
  } else if (filter.speed === 'modfast') {
    out.drawdown.push(`The B3-class paper runs a touch quicker than standard — expect the drawdown at the early end of the window.`);
  } else if (filter.speed === 'slow') {
    out.drawdown.push(`Slow paper, long drawdown — let it take its time. Cleanliness is what you bought with those extra seconds.`);
  }
  if (filter.boosted) {
    out.drawdown.push(`With the booster under the bed, the drain should run even and stall-free — a flat bed at the end is the tell.`);
  }

  // Maker recipe + non-standard paper: the published clock stays faithful to
  // the maker (we never rewrite their timestamps), so coach the user to brew
  // by bed state instead of the clock.
  const isMakerMethod = recipe.method && recipe.method !== 'balanced';
  if (isMakerMethod && filter.timeShift === 'faster') {
    out.pour.push(`Your paper runs quicker than this recipe's clock — the timestamps are the maker's cues, not commands. Pour on the bed, not the timestamp.`);
  } else if (isMakerMethod && filter.timeShift === 'slower') {
    out.pour.push(`Your slow paper holds water longer than this recipe's clock expects — let the bed nearly clear before each pour, even if the timestamp says go.`);
  }

  // ── Roast level → why this water temperature ─────────────────────────
  const roast = coffeeData.roastLevel;
  if (roast && recipe.temperature) {
    if (/light/i.test(roast)) {
      out.prep.push(`${name} is roasted ${roast.toLowerCase()} — dense and slow to open, so the water runs hot at ${recipe.temperature}°C.`);
    } else if (/dark/i.test(roast)) {
      out.prep.push(`${name} is roasted ${roast.toLowerCase()} — solubles come out fast, so the water stays gentle at ${recipe.temperature}°C.`);
    }
  }

  // ── Finish → what to taste for ───────────────────────────────────────
  const notes = (recipe.flavorNotes || []).slice(0, 3);
  if (notes.length) {
    out.finish.push(`As it cools, hunt for ${notes.map(n => n.toLowerCase()).join(', ')} — that’s where ${name} is supposed to land.`);
  }
  if (recipe.adjusted) {
    out.finish.push(`This brew carried your saved correction — taste whether it moved the cup the way you wanted, then tell the app.`);
  }

  // Technique affirmations — how this coffee wants to be handled on this
  // brewer (process × method × roast × delicacy). Hoisted declaration below.
  const aff = buildTechniqueAffirmations({ coffeeData, brewData });
  for (const k of ['bloom', 'pour', 'wait', 'drawdown']) out[k].push(...aff[k]);

  return out;
}

/**
 * Technique affirmations — how THIS coffee wants to be handled on THIS brewer.
 *
 * The brewing logic behind them (same knowledge well the engine reads):
 *  - Agitation raises extraction rate and evenness. Whether that's good
 *    depends on the coffee: clean, structured WASHED lots reward turbulence
 *    (tighter/faster spirals, confident swirls, firmer stirs), while NATURALS
 *    and FERMENTS carry more fines and fruit sugar — agitation shears them
 *    into muddiness and drags the ferment character forward, so they want low,
 *    slow, minimal-motion handling. HONEY sits between; WET-HULLED coffees
 *    are robust and body-driven and simply don't care.
 *  - ROAST tempers the process rule: dark roasts are soluble and give
 *    themselves up fast, so even a washed dark roast wants its agitation
 *    brisk-but-brief. Light roasts amplify it: dense, high-grown washed light
 *    roasts are the coffees that genuinely love energy.
 *  - DELICATE VARIETIES (Gesha-class, `agitation: 'gentle'` in the cultivar
 *    table) override everything — florals bruise under rough water no matter
 *    the process. DECAF's porous beans extract fast, so it also pulls toward
 *    gentle regardless of process.
 *  - The brewer changes the *verb*: on percolation (pour over / flash) the
 *    agitation lever is pour energy and swirls; on immersion it's stirring —
 *    the crust break on a French press, stir count on an AeroPress, the
 *    mid-steep stir on a Clever/Switch.
 *
 * Returns { bloom, pour, wait, drawdown } line arrays (empty for espresso,
 * moka, and cold steep — no brew-along there).
 */
export function buildTechniqueAffirmations({ coffeeData = {}, brewData = {} } = {}) {
  const out = { bloom: [], pour: [], wait: [], drawdown: [] };
  const device = getDevice(brewData.device);
  const style = device.style;
  if (style === 'espresso' || style === 'moka' || style === 'coldsteep') return out;

  const proc = getProcessAdjustment(coffeeData.process);
  const variety = getVarietyAdjustment(coffeeData.variety);
  const decaf = getDecafAdjustment(coffeeData);
  const elev = getElevationAdjustment(coffeeData.elevation);
  const roast = String(coffeeData.roastLevel || '');
  const isDark = /dark/i.test(roast);
  const isLight = /light/i.test(roast);
  // 'washed' is also the engine's DEFAULT family for blank/unmodeled process
  // strings — only speak about washed handling when the bag actually says so.
  const family = proc.family === 'washed'
    ? (/wash/i.test(String(coffeeData.process || '')) ? 'washed' : 'unknown')
    : proc.family;
  const percolation = style === 'filter' || style === 'flash';

  // ── Highest precedence: delicate cultivars bruise under rough water ──
  if (variety.agitation === 'gentle' && variety.name) {
    if (percolation) {
      out.pour.push(`${variety.name} overrides the playbook — even a washed lot this aromatic wants low, patient pours. The florals bruise under rough water.`);
      out.wait.push(`No extra swirls for this one — delicate coffees extract their best when the bed stays calm.`);
    } else {
      out.pour.push(`Handle ${variety.name} gently — the minimum stir, nothing more. Delicate aromatics don't survive rough treatment.`);
    }
    return out; // gentle verdict is final; don't mix in agitation-positive lines
  }

  // ── Percolation: the agitation lever is pour energy ──────────────────
  if (percolation) {
    if (family === 'washed') {
      if (isDark) {
        out.pour.push(`Washed coffees like agitation, but this dark roast gives itself up fast — keep the spirals brisk and brief, then get out.`);
      } else {
        out.pour.push(`Washed and clean — this coffee rewards agitation. Faster, tighter spirals lift extraction; pour with intent.`);
        out.wait.push(`A confident swirl here evens the bed — washed lots can take it, and the cup gets sweeter for it.`);
        if (isLight && (elev.density === 'dense' || elev.density === 'very dense')) {
          out.wait.push(`Dense, high-grown, washed, light — the exact coffee that loves energy. If it cups thin, pour harder next time before you grind finer.`);
        }
        out.drawdown.push(`Slower drawdown after energetic pours is just the fines settling — that's the agitation working, not a mistake.`);
      }
    } else if (family === 'natural') {
      out.pour.push(`Low and slow — naturals carry fines and fruit sugar, and hard agitation shears them into mud. A gentle stream keeps this cup clean.`);
      out.wait.push(`Resist the swirl — let a natural's bed settle on its own and the fruit stays bright instead of boozy.`);
    } else if (family === 'anaerobic') {
      out.pour.push(`Minimal agitation — this ferment extracts loud all by itself. Pour soft, keep the stream low, and let the water do the work.`);
    } else if (family === 'honey') {
      out.pour.push(`The middle path: steady, even spirals — enough motion to extract, not enough to shear the honey sweetness loose.`);
    } else if (family === 'wet-hulled') {
      out.pour.push(`Pour with confidence — wet-hulled coffees shrug off turbulence. Body is the goal; you won't break this one.`);
    }
    if (decaf.isDecaf) {
      out.pour.push(`Porous decaf extracts quickly — ease your pour rate a notch below usual and it stays sweet.`);
    }
    return out;
  }

  // ── Immersion: the agitation lever is the stir ───────────────────────
  if (style === 'frenchpress') {
    if (family === 'washed') out.wait.push(`When the crust breaks, stir with intent — washed coffees take an assertive break well and extract more evenly for it.`);
    else if (family === 'natural' || family === 'anaerobic') out.wait.push(`Break the crust gently and skim thoroughly — fruity ferments turn muddy when stirred hard.`);
    else if (family === 'wet-hulled') out.wait.push(`Stir freely at the crust — this coffee is built for body and doesn't bruise.`);
  } else if (style === 'aeropress') {
    if (family === 'washed') out.pour.push(`An extra stir or two is your friend — washed lots extract evenly under agitation, and the press stays sweet.`);
    else if (family === 'natural' || family === 'anaerobic') out.pour.push(`Keep stirs to the minimum — one good swirl, cap it, and let the steep do the rest.`);
  } else if (style === 'steepdrain') {
    if (family === 'washed') out.wait.push(`One good stir mid-steep pulls extra sweetness from a clean washed coffee — go ahead.`);
    else if (family === 'natural' || family === 'anaerobic') out.wait.push(`Wet the grounds with one gentle stir, then hands off — stillness keeps this fruit clean.`);
  }
  if (decaf.isDecaf) {
    out.wait.push(`Decaf steeps fast — taste at the early end of the window rather than the late one.`);
  }
  return out;
}

/**
 * Classify a brew phase (from brew-phases.js) into an insight bucket.
 * First pour on a filter brew reads as the bloom.
 */
export function insightKeyForPhase(phase, index) {
  const n = String(phase?.name || '').toLowerCase();
  if (phase?.kind === 'prep') return 'prep';
  if (n.includes('bloom')) return 'bloom';
  if (n.includes('drawdown') || n.includes('draw down')) return 'drawdown';
  if (phase?.kind === 'pour') return index === 0 ? 'bloom' : 'pour';
  return 'wait';
}
