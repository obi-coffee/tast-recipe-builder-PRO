/**
 * Journal analytics — pure, testable transforms over brew-log entries.
 *
 * Ratings live on two scales in the wild: legacy quick-logs were 1–5 stars;
 * everything from the pro update (quick log + cupping) is the tāst 10-point
 * scale in 0.5 steps, marked by `recipe.logMeta.scale` or `recipe.cupping`.
 * `entryScore` normalizes everything to 0–10 so charts compare like with like.
 */

export function entryScore(entry) {
  const r = Number(entry?.rating);
  if (!r || Number.isNaN(r)) return null;
  const scale = entry?.recipe?.logMeta?.scale || entry?.recipe?.cupping?.scale;
  if (scale === 10) return Math.min(10, r);
  // Legacy star entries (integers 1–5, unmarked) → ×2. Anything above 5
  // without a marker was already 10-scale (defensive).
  return r <= 5 ? r * 2 : Math.min(10, r);
}

export function entryFlavors(entry) {
  return entry?.recipe?.logMeta?.flavors || entry?.recipe?.cupping?.flavors || [];
}

const coffeeName = (e) =>
  (e?.coffeeData?.name || `${e?.coffeeData?.origin || ''} ${e?.coffeeData?.variety || ''}`.trim() || 'Coffee').trim();

/** Entries that carry a score, oldest → newest (for trend lines). */
export function scoredTimeline(entries) {
  return (entries || [])
    .map(e => ({ entry: e, score: entryScore(e), t: Date.parse(e.createdAt) || 0 }))
    .filter(x => x.score != null)
    .sort((a, b) => a.t - b.t);
}

/** Overall stats for the tile row. */
export function journalStats(entries) {
  const scored = scoredTimeline(entries);
  const scores = scored.map(x => x.score);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const coffees = new Set((entries || []).map(coffeeName));
  const cuppings = (entries || []).filter(e => e.kind === 'cupping').length;
  return {
    brews: (entries || []).length,
    scored: scores.length,
    avgScore: avg != null ? Math.round(avg * 10) / 10 : null,
    coffees: coffees.size,
    cuppings,
  };
}

/** Average score grouped by a coffee/brew property. Sorted best-first. */
export function averagesBy(entries, keyFn, { min = 1 } = {}) {
  const groups = new Map();
  for (const { entry, score } of scoredTimeline(entries)) {
    const key = keyFn(entry);
    if (!key) continue;
    const g = groups.get(key) || { key, scores: [] };
    g.scores.push(score);
    groups.set(key, g);
  }
  return [...groups.values()]
    .filter(g => g.scores.length >= min)
    .map(g => ({
      key: g.key,
      count: g.scores.length,
      avg: Math.round((g.scores.reduce((a, b) => a + b, 0) / g.scores.length) * 10) / 10,
    }))
    .sort((a, b) => b.avg - a.avg);
}

export const byRoast = (entries) => averagesBy(entries, e => e.coffeeData?.roastLevel);
export const byProcess = (entries) => averagesBy(entries, e => e.coffeeData?.process);
export const byDevice = (entries) => averagesBy(entries, e => e.brewData?.device);

/**
 * The dial-in journey: per coffee, every scored brew in order plus whether a
 * correction (tweak / adjusted recipe) was in play. The learning loop, made
 * visible. Returns coffees with ≥2 scored brews, most-brewed first.
 */
export function dialInJourneys(entries, { minBrews = 2 } = {}) {
  const groups = new Map();
  for (const { entry, score, t } of scoredTimeline(entries)) {
    if (entry.kind === 'cupping') continue; // cuppings score the coffee, not the dial-in
    const key = coffeeName(entry);
    const g = groups.get(key) || { coffee: key, roaster: entry.coffeeData?.roaster || '', brews: [] };
    g.brews.push({ t, score, adjusted: !!entry.recipe?.adjusted, kind: entry.kind });
    groups.set(key, g);
  }
  return [...groups.values()]
    .filter(g => g.brews.length >= minBrews)
    .map(g => ({ ...g, delta: Math.round((g.brews[g.brews.length - 1].score - g.brews[0].score) * 10) / 10 }))
    .sort((a, b) => b.brews.length - a.brews.length);
}

/** Average cupping attributes (the palate profile). Null if no cuppings. */
export function palateProfile(entries) {
  const sheets = (entries || [])
    .map(e => e?.recipe?.cupping?.attributes)
    .filter(Boolean);
  if (!sheets.length) return null;
  const keys = Object.keys(sheets[0]);
  const out = {};
  for (const k of keys) {
    const vals = sheets.map(s => Number(s[k])).filter(v => !Number.isNaN(v));
    if (vals.length) out[k] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }
  return { attributes: out, sessions: sheets.length };
}

/** Most-picked flavor tags across the journal, descending. */
export function topFlavors(entries, limit = 8) {
  const counts = new Map();
  for (const e of entries || []) {
    for (const f of entryFlavors(e)) counts.set(f, (counts.get(f) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([flavor, count]) => ({ flavor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Consistency per coffee: the score spread (max − min) across its brews.
 * A shrinking spread is a dialed-in coffee. Requires ≥2 scored brews.
 */
export function consistency(entries) {
  return dialInJourneys(entries, { minBrews: 2 }).map(j => {
    const scores = j.brews.map(b => b.score);
    return {
      coffee: j.coffee,
      brews: scores.length,
      spread: Math.round((Math.max(...scores) - Math.min(...scores)) * 10) / 10,
      avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    };
  }).sort((a, b) => a.spread - b.spread);
}
