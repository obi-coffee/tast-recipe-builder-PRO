/**
 * Turn the engine's brew steps into an ordered list of "phases" for the
 * immersive Brew-along guide. This is a pure presentation transform — it adds
 * no brewing logic, it only re-reads what each step already carries:
 *   - a name            ("Pour 2", "Bloom", "Drawdown")
 *   - a target          ("155g · 1:00", "300g", "4:00", "done")
 *   - a technique string (the one-line instruction)
 *
 * From those we derive, per phase:
 *   - kind   : 'pour'  (water is being added)  or  'wait' (a rest / drain)
 *   - grams  : cumulative water target at this point (forward-filled)
 *   - frac   : grams ÷ total water  → how full the water circle should be
 *   - dur    : seconds this phase lasts (gap to the next timed step)
 *   - label  : "Pour up to 155g"  or  "Wait"
 *   - instr  : the technique line
 */

const DEFAULT_PHASE_SEC = 20; // fallback for stepless / manual phases (press, strain)

// First m:ss in a string → seconds, else null. Handles "~8:00", ranges, "150g · 1:00".
export function parseStartSec(target) {
  const m = String(target || '').match(/(\d+):([0-5]\d)/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

// First "<number>g" in a string → grams, else null. ("155g · 1:00" → 155)
export function parseGrams(target) {
  const m = String(target || '').match(/(\d+)\s*g\b/);
  return m ? parseInt(m[1], 10) : null;
}

// Largest m:ss in a label → seconds. ("2:30–3:30" → 210) Used for the final phase length.
export function parseUpperTime(label) {
  const all = [...String(label || '').matchAll(/(\d+):([0-5]\d)/g)];
  if (!all.length) return null;
  const last = all[all.length - 1];
  return parseInt(last[1], 10) * 60 + parseInt(last[2], 10);
}

export function buildPhases(steps, totalTimeLabel) {
  if (!Array.isArray(steps) || steps.length === 0) return [];

  const starts = steps.map(s => parseStartSec(s.target));
  const rawGrams = steps.map(s => parseGrams(s.target));

  // Forward-fill cumulative grams: a wait/rest holds the previous water level.
  let running = 0;
  const grams = rawGrams.map(g => {
    if (g != null) running = g;
    return running;
  });
  const total = Math.max(...grams, 1);
  const totalSec = parseUpperTime(totalTimeLabel);

  return steps.map((s, i) => {
    const startSec = starts[i];

    // Duration = gap to the next step that has a time marker. A timed step with
    // nothing timed after it runs out to the recipe's total time; untimed
    // (manual / terminal) steps get a small default.
    let dur = null;
    if (startSec != null) {
      for (let j = i + 1; j < steps.length; j++) {
        if (starts[j] != null) { dur = starts[j] - startSec; break; }
      }
      if (dur == null && totalSec != null && totalSec > startSec) dur = totalSec - startSec;
    }
    if (dur == null || dur <= 0) dur = DEFAULT_PHASE_SEC;

    // A "prep" step carries neither a time nor a water target (e.g. rinse the
    // filter and dose) — it happens before the timer starts. A "pour" is when
    // the water level just went up; anything else is a "wait".
    const isPrep = startSec == null && rawGrams[i] == null;
    let kind;
    if (isPrep) kind = 'prep';
    else if (i === 0) kind = 'pour';
    else kind = grams[i] > grams[i - 1] ? 'pour' : 'wait';

    return {
      name: s.step || s.phase || `Step ${i + 1}`,
      kind,
      grams: grams[i],
      frac: Math.min(1, grams[i] / total),
      dur,
      label: kind === 'pour' ? `Pour up to ${grams[i]}g` : (kind === 'prep' ? (s.step || 'Prep') : 'Wait'),
      instr: s.technique || '',
    };
  });
}
