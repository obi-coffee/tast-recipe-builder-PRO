/**
 * Deterministic grind-setting calculator.
 *
 * Given a grinder, the brew method's grind key, and a 0..1 position `t`
 * (0 = finest end of the range, 1 = coarsest), this returns a grind setting
 * expressed in that grinder's NATIVE units — clicks, whole numbers, decimals,
 * number+clicks, number+letter, or descriptive terms.
 *
 * Output format matches what the recipe UI expects:
 *   "Start: <value>. Range: <lo>–<hi>. Adjust finer if the cup is sour or
 *    weak, coarser if it's bitter or harsh."
 */

import { GRINDERS } from '../../data/grinders';

const DESC_SCALE = ['Extra Fine', 'Fine', 'Medium-Fine', 'Medium', 'Medium-Coarse', 'Coarse', 'Extra Coarse'];
const VARIO_LETTERS = 'ABCDEFGHIJKLMNOPQ'; // 17 micro positions A..Q

const KEY_ORDER = ['espresso', 'pourOver', 'immersion', 'coldBrew'];

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// Pick the grinder's range for the requested method, or the nearest available.
function resolveRange(grinder, grindKey) {
  const ranges = grinder.brewRanges || {};
  if (ranges[grindKey]) return { key: grindKey, raw: ranges[grindKey] };
  const wantIdx = KEY_ORDER.indexOf(grindKey);
  let best = null;
  for (const k of Object.keys(ranges)) {
    const d = Math.abs(KEY_ORDER.indexOf(k) - wantIdx);
    if (!best || d < best.d) best = { key: k, raw: ranges[k], d };
  }
  return best || { key: grindKey, raw: 'Medium-Fine to Medium' };
}

function splitEndpoints(raw) {
  const cleaned = String(raw).replace(/\([^)]*\)/g, '').trim();
  // Split only on en/em dash or the word "to" — NOT a plain hyphen, which is
  // part of descriptive terms like "Medium-Fine".
  const parts = cleaned.split(/\s*[–—]\s*|\s+to\s+/i).map(s => s.trim()).filter(Boolean);
  return parts.length >= 2 ? [parts[0], parts[parts.length - 1]] : [parts[0], parts[0]];
}

// Parse a single endpoint into a numeric value, using grinder type for context.
function parseEndpointNumeric(str, type) {
  if (type === 'macro-micro') {
    // 17 micro letters A..Q sit WITHIN one macro step, so a letter maps to
    // frac = index/17 (Q ≈ 0.94), keeping "10Q" from rolling over into "11A".
    const m = String(str).match(/(\d+)\s*([A-Q])/i);
    if (m) return parseInt(m[1], 10) + VARIO_LETTERS.indexOf(m[2].toUpperCase()) / VARIO_LETTERS.length;
  }
  // Fellow Ode Gen 2 "number + N click" notation
  const odeMatch = String(str).match(/(\d+)\s*\+\s*(\d+)\s*click/i);
  if (odeMatch) return parseInt(odeMatch[1], 10) + parseInt(odeMatch[2], 10) / 3;
  const num = String(str).match(/-?\d+(\.\d+)?/);
  return num ? parseFloat(num[0]) : 0;
}

function descIndex(word) {
  const w = String(word).toLowerCase().trim();
  let best = 3, bestScore = -1;
  DESC_SCALE.forEach((label, i) => {
    const l = label.toLowerCase();
    let score = 0;
    if (l === w) score = 3;
    else if (l.includes(w) || w.includes(l)) score = 2;
    if (score > bestScore) { bestScore = score; best = i; }
  });
  return best;
}

function formatValue(num, grinder) {
  const type = grinder.type;
  const unit = grinder.unit || '';

  if (type === 'clicks') return `${Math.round(num)} clicks`;
  if (type === 'stepless') return num.toFixed(1);
  if (type === 'macro-micro') {
    const macro = Math.floor(num);
    const frac = clamp(num - macro, 0, 1);
    const idx = Math.min(VARIO_LETTERS.length - 1, Math.round(frac * VARIO_LETTERS.length));
    return `${macro}${VARIO_LETTERS[idx]}`;
  }
  // Fellow Ode Gen 2: number + clicks (0, +1 click, +2 clicks)
  if (unit.includes('number + clicks')) {
    let base = Math.floor(num);
    let click = Math.round((num - base) * 3);
    if (click >= 3) { base += 1; click = 0; }
    return click === 0 ? `${base}` : `${base} + ${click} click${click > 1 ? 's' : ''}`;
  }
  // OXO whole number (+ optional micro — we keep it to the whole number)
  // Default stepped / whole-number grinders
  return `${Math.round(num)}`;
}

/**
 * Translate "grind finer / coarser" into the grinder's OWN units, sized to one
 * meaningful notch within the method's brew band (~12% of the range). So a
 * Comandante user reads "~2 clicks finer", a Weber Key user "~0.4 turns finer",
 * an EG-1 user "~0.7 marks finer" — the concrete coaching a barista would give,
 * instead of a vague "grind finer". Returns { amount, finer, coarser }.
 */
export function grindStepHint({ grinderName, grindKey }) {
  const grinder = GRINDERS[grinderName] || GRINDERS['Generic'];
  const resolved = resolveRange(grinder, grindKey);
  const [loRaw, hiRaw] = splitEndpoints(resolved.raw);
  const type = grinder.type;
  const unit = grinder.unit || '';

  let amount;
  if (type === 'descriptive') {
    amount = 'one step';
  } else {
    const lo = parseEndpointNumeric(loRaw, type);
    const hi = parseEndpointNumeric(hiRaw, type);
    const delta = Math.abs(hi - lo) * 0.12; // one notch within the band
    if (type === 'clicks') {
      amount = `~${Math.max(2, Math.round(delta))} clicks`;
    } else if (type === 'macro-micro') {
      amount = 'a couple of micro-steps';
    } else if (unit.includes('number + clicks')) {
      amount = '~2–3 clicks';
    } else if (type === 'stepless') {
      const d = Math.max(0.1, Math.round(delta * 10) / 10);
      let noun = 'on the dial';
      if (/turn/i.test(unit)) noun = d === 1 ? 'turn' : 'turns';
      else if (/mark/i.test(unit)) noun = 'marks';
      amount = `~${d} ${noun}`;
    } else {
      const n = Math.max(1, Math.round(delta));
      amount = `~${n} ${n === 1 ? 'number' : 'numbers'}`;
    }
  }
  return { amount, finer: `grind ${amount} finer`, coarser: `grind ${amount} coarser` };
}

export function computeGrind({ grinderName, grindKey, t }) {
  const grinder = GRINDERS[grinderName] || GRINDERS['Generic'];
  const pos = clamp(t, 0, 1);
  const resolved = resolveRange(grinder, grindKey);
  const raw = resolved.raw;
  // True when the grinder has no dedicated range for the requested method
  // (e.g., a filter-only grinder asked for espresso) and we fell back.
  const fellBack = resolved.key !== grindKey;
  const [loRaw, hiRaw] = splitEndpoints(raw);

  // Descriptive grinders (Generic) work on the word scale.
  if (grinder.type === 'descriptive') {
    const loI = descIndex(loRaw);
    const hiI = descIndex(hiRaw);
    const idx = Math.round(loI + pos * (hiI - loI));
    const start = DESC_SCALE[clamp(idx, 0, DESC_SCALE.length - 1)];
    return {
      grindSetting: `Start: ${start}. Range: ${DESC_SCALE[loI]}–${DESC_SCALE[hiI]}. Adjust finer if the cup is sour or weak, coarser if it's bitter or harsh.`,
      start, lo: DESC_SCALE[loI], hi: DESC_SCALE[hiI], resolvedKey: resolved.key, fellBack,
    };
  }

  const lo = parseEndpointNumeric(loRaw, grinder.type);
  const hi = parseEndpointNumeric(hiRaw, grinder.type);
  const value = lo + pos * (hi - lo);

  const start = formatValue(value, grinder);
  const loStr = formatValue(lo, grinder);
  const hiStr = formatValue(hi, grinder);

  return {
    grindSetting: `Start: ${start}. Range: ${loStr}–${hiStr}. Adjust finer if the cup is sour or weak, coarser if it's bitter or harsh.`,
    start, lo: loStr, hi: hiStr, resolvedKey: resolved.key, fellBack,
  };
}
