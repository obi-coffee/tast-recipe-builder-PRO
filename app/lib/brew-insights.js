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
